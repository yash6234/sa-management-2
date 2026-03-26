const Attendance = require("../../models/harsh/Attendance");
const Staff = require("../../models/harsh/Staff");
const Coach = require("../../models/harsh/Coach");
const Student = require("../../models/AcademyAdmissions");

const { validateAdminRequest } = require("../../middlewares/adminValidation");
const { encryptData, decryptData, logger } = require("../../utils/enc_dec_admin");
const { formatTimeLeft } = require("../../utils/formatTime");

// Convert any Date to IST
const toIST = (date) => {
  return new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
};

const getUserModel = (user_type) => {
  switch (user_type) {
    case "Staff": return { model: Staff, nameField: "fullName" };
    case "Coach": return { model: Coach, nameField: "fullName" };
    case "Student": return { model: Student, nameField: "name" };
    default: return null;
  }
};


// MARK ATTENDANCE - With Strict Rules (No Double IN/OUT + 5 Min Gap)
const MarkAttendance = async (req, res) => {
  try {
    logger.info("Mark Attendance Request Received");

    const result = await validateAdminRequest(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }
    
    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }
    
    let user_type = "Student";
    const { rollno, source } = decryptedData;
    
    if (!rollno) {
      return res.status(400).json({ message: "Roll No is required" });
    }
    
    // Detect user_type from rollno prefix
    if (rollno.startsWith("COA")) user_type = "Coach";
    else if (rollno.startsWith("STA")) user_type = "Staff";
    
    const Model = user_type === "Staff" ? Staff : user_type === "Coach" ? Coach : Student;
    
    const user = await Model.findOne({ roll_no: rollno, delete: false });
    if (!user) {
      return res.status(404).json({ message: `${user_type} Not Found` });
    }
    if (!user.active) {
      return res.status(403).json({ message: `${user_type} is Inactive` });
    }
    const user_gender = user.gender || "Male";
    if (source && !["PI", "IOS", "WEB", "ANDROID", "DEVICE"].includes(source)) {
      return res.status(400).json({ message: "Invalid source value",gender: `${user_gender}` });
    }


    // Student Plan Expiry Check
    if (user_type === "Student") {
      console.log("Student")
      const left = formatTimeLeft(user.time_left);
      const totalHoursLeft = left.days * 24 + left.hours;
    
      if (user.time_left <= 0) {
        return res.status(403).json({
          message: "Plan Expired. Attendance Not Allowed.",
          data: encryptData({ expired: true, time_left: left }),
          gender: `${user_gender}`,
        });
      }

      if (totalHoursLeft <= 72) {
        return res.status(200).json({
          message: `Plan is Expiring in (${Math.round(totalHoursLeft / 24)} days)`,
          data: encryptData({ time_left: left })
        });
      }
    }

    // === TODAY'S DATE RANGE (IST) ===
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIST = new Date(today.getTime() + 5.5 * 60 * 60 * 1000); // IST
    
    const tomorrowIST = new Date(todayIST);
    tomorrowIST.setDate(tomorrowIST.getDate() + 1);
    
    // === GET ALL TODAY'S ATTENDANCE RECORDS (Latest first) ===
    const todayRecords = await Attendance.find({
      rollno,
      user_type,
      date: { $gte: todayIST, $lt: tomorrowIST },
      delete: false
    }).sort({ createdAt: -1 });
    
    const lastRecord = todayRecords[0] || null;
    
    if (lastRecord && lastRecord.tap === "ABSENT") {
      lastRecord.tap = "IN";
      lastRecord.source = source || "WEB";
      lastRecord.createdAt = new Date();
      lastRecord.updatedAt = new Date();
    
      await lastRecord.save();
    
      // Convert to IST for response
      lastRecord.createdAt = toIST(lastRecord.createdAt);
      lastRecord.date = toIST(lastRecord.date);
    
      logger.info(`${user_type} ${rollno} ABSENT converted to IN`);

      return res.status(200).json({
        message: "Attendance Marked Successfully (IN)",
        data: encryptData(lastRecord),
        time_left: user_type === "Student" ? formatTimeLeft(user.time_left) : null,
      });
    }

    // === RULE 1: Determine what should be the next valid tap ===
    let nextValidTap = "IN";
    if (lastRecord) {
      nextValidTap = lastRecord.tap === "IN" ? "OUT" : "IN";
    }
    //  RULE: STUDENT CAN'T HAVE MULTIPLE IN/OUT IN THE SAME DAY
    if (user_type === "Student") {
      const hasIN = todayRecords.some(r => r.tap === "IN");
      const hasOUT = todayRecords.some(r => r.tap === "OUT");
    
      // If student already has both IN & OUT → No more attendance allowed today
      if (hasIN && hasOUT) {
        return res.status(400).json({
          message: "You have already completed today's IN and OUT. No more attendance allowed today.",
          last_tap: todayRecords[0]?.tap,
          last_time: toIST(todayRecords[0]?.createdAt).toLocaleString("en-IN"),
          gender: `${user_gender}`,
        });
      }
    }

    // === RULE 2: Prevent double IN or double OUT ===
    if (lastRecord && lastRecord.tap === nextValidTap) {
      return res.status(400).json({
        message: `Already marked ${nextValidTap} today. Next allowed: ${nextValidTap === "IN" ? "OUT" : "IN"}`,
        last_tap: lastRecord.tap,
        last_time: toIST(lastRecord.createdAt).toLocaleString("en-IN"),
        gender: `${user_gender}`
      });
    }
    
    // === RULE 3: Enforce 5-minute minimum gap between IN and OUT ===
    if (lastRecord && nextValidTap === "OUT") {
      const lastTime = lastRecord.createdAt;
      const now = new Date();
      const diffMs = now - lastTime;
      const diffMin = diffMs / (1000 * 60);
    
      if (diffMin < 5) {
        const waitMin = Math.ceil(5 - diffMin);
        return res.status(400).json({
          message: `Wait at least 5 minutes after IN before OUT. Please wait ${waitMin} minute(s).`,
          last_in_time: toIST(lastTime).toLocaleTimeString("en-IN"),
          can_out_after: new Date(lastTime.getTime + 5 * 60 * 1000).toLocaleTimeString("en-IN")
        });
      }
    }
    
    // === ALL CHECKS PASSED → MARK ATTENDANCE ===
    const tap = nextValidTap;
    
    const att = new Attendance({
      rollno,
      tap,
      user_type,
      source: source || "WEB"
    });
    
    await att.save();
    
    // Convert to IST
    att.createdAt = toIST(att.createdAt);
    att.date = toIST(att.date);

    logger.info(`${user_type} ${rollno} marked ${tap} at ${att.createdAt.toLocaleString("en-IN")}`);
    if (user_type === "Student") {
      const left = formatTimeLeft(user.time_left);

      if (user.time_left <= 0) {
        return res.status(403).json({
          message: "Plan Expired. Attendance Not Allowed.",
          data: encryptData({ expired: true, time_left: left }),
          gender: `${user_gender}`,
        });
      }
      let days = Math.floor(user.time_left / 24);
      
      if (days <= 100) {
        return res.status(200).json({
          message: `Plan is Expiring in (${days} days)`,
          data: encryptData({ time_left: left })
        });
      }
    }
    else if (user_type === "Coach") {
      return res.status(200).json({
        message: `Coach Attendance Marked Successfully (${tap})`,
        data: encryptData(att),
        gender: `${user_gender}`,
      })
    }
    else if (user_type === "Staff") {
      return res.status(200).json({
        message: `Staff Attendance Marked Successfully (${tap})`,
        data: encryptData(att),
        gender: `${user_gender}`,
      })
    }
    else {
      return res.status(200).json({
        message: `Attendance Marked Successfully (${tap})`,
        data: encryptData(att),
        time_left: user_type === "Student" ? formatTimeLeft(user.time_left) : null,
        gender: `${user_gender}`,
      });
    }
  } catch (err) {
    logger.error(`Mark Attendance Error: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

// ========================
// (WEB - 50 per page)
// ========================
const ViewAttendanceWeb = async (req, res) => {
  try {
    logger.info("View Attendance Web Request Received");
    const result = await validateAdminRequest(req, res);
    if (result.error) return res.status(result.status).json({ message: result.message });

    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }

    const { page = 1 } = decryptedData;
    const limit = 50;
    const skip = (parseInt(page) - 1) * limit;

    const total = await Attendance.countDocuments({ delete: false });
    const attendances = await Attendance.find({ delete: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    // Populate user name
    for (let att of attendances) {
      const userInfo = getUserModel(att.user_type);
      if (userInfo) {
        const user = await userInfo.model.findOne({ roll_no: att.rollno, delete: false }).select("fullName name").lean();
        att.user_name = user ? (user.fullName || user.name || "Unknown") : "Deleted User";
      } else {
        att.user_name = "Unknown";
      }
    }

    return res.status(200).json({
      message: "Attendance Fetched Successfully",
      data: encryptData({
        attendances,
        pagination: {
          total,
          current_page: Number(page),
          total_pages: Math.ceil(total / limit),
          per_page: limit,
        },
      }),
    });
  } catch (err) {
    logger.error(`Error in ViewAttendanceWeb: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

// ========================
// (MOBILE - 10 per page)
// ========================
const ViewAttendance = async (req, res) => {
  try {
    logger.info("View Attendance Request Received");
    const result = await validateAdminRequest(req, res);
    if (result.error) return res.status(result.status).json({ message: result.message });

    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }

    const { page = 1 } = decryptedData;
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    const total = await Attendance.countDocuments({ delete: false });
    const attendances = await Attendance.find({ delete: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    for (let att of attendances) {
      const userInfo = getUserModel(att.user_type);
      if (userInfo) {
        const user = await userInfo.model.findOne({ roll_no: att.rollno, delete: false }).select("fullName name").lean();
        att.user_name = user ? (user.fullName || user.name || "Unknown") : "Deleted User";
      } else {
        att.user_name = "Unknown";
      }
    }

    return res.status(200).json({
      message: "Attendance Fetched Successfully",
      data: encryptData({
        attendances,
        pagination: {
          total,
          current_page: Number(page),
          total_pages: Math.ceil(total / limit),
          per_page: limit,
        },
      }),
    });
  } catch (err) {
    logger.error(`Error in ViewAttendance: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

// ========================
// (Full History)
// ========================
const ViewSelectedAttendance = async (req, res) =>  {
  try {
    logger.info("View Selected Attendance Request Received");
    const result = await validateAdminRequest(req, res);
    if (result.error) return res.status(result.status).json({ message: result.message });

    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }

    const { rollno } = decryptedData;

    if (!rollno) {
      return res.status(400).json({ message: "Roll No is required" });
    }

    let user_type = "Student";
    if (rollno.startsWith("COA")) user_type = "Coach";
    else if (rollno.startsWith("STA")) user_type = "Staff";

    const userModelInfo = getUserModel(user_type);
    if (!userModelInfo) {
      return res.status(400).json({ message: "Invalid user type" });
    }

    const user = await userModelInfo.model.findOne({ roll_no: rollno, delete: false });
    if (!user) {
      return res.status(404).json({ message: `${user_type} Not Found` });
    }

    const nameField = userModelInfo.nameField;
    const user_name = user[nameField] || "Unknown";   

    const attendances = await Attendance.find({
      rollno,
      user_type,
      delete: false
    }).sort({ date: -1 }).lean();

    return res.status(200).json({
      message: "Attendance History Fetched Successfully",
      data: encryptData({
        rollno,
        user_type,
        user_name,
        total_records: attendances.length,
        attendances
      })
    });

  } catch (err) {
    logger.error(`ViewSelectedAttendance Error: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

// ========================
// (Advanced Search + Filters)
// ========================

// const SearchAttendanceWeb = async (req, res) => {
//   try {
//     logger.info("Search Attendance Web Request Received");
//     const result = await validateAdminRequest(req, res);
//     if (result.error) return res.status(result.status).json({ message: result.message });

//     let decryptedData;
//     try {
//       decryptedData = decryptData(req.params.data);
//     } catch (error) {
//       logger.error(`Decryption failed: ${error.message}`);
//       return res.status(400).json({ message: "Invalid data" });
//     }

//     let {
//       search,
//       page = 1,
//       user_type,
//       tap,
//       date_from,
//       date_to,
//       source
//     } = decryptedData;

//     const limit = 50;
//     const currentPage = Number(page) > 0 ? Number(page) : 1;
//     const skip = (currentPage - 1) * limit;

//     const filter = { delete: false };
//     if (search && !user_type) {
//       const trimmedSearch = search.trim().toUpperCase();
//       if (trimmedSearch.startsWith("COA")) {
//         user_type = "Coach";
//       } else if (trimmedSearch.startsWith("STA")) {
//         user_type = "Staff";
//       } else {
//         user_type = "Student"; // default fallback
//       }
//     }

//     if (user_type && ["Student", "Coach", "Staff"].includes(user_type)) {
//       filter.user_type = user_type;
//     }
//     if (tap && ["IN", "OUT"].includes(tap)) {
//       filter.tap = tap;
//     }
//     if (source) filter.source = source;

//     // Date range
//     if (date_from || date_to) {
//       filter.date = {};
//       if (date_from) filter.date.$gte = new Date(date_from);
//       if (date_to) {
//         const end = new Date(date_to);
//         end.setHours(23, 59, 59, 999);
//         filter.date.$lte = end;
//       }
//     }

//     // Search by rollno or name (via lookup)
//     let attendanceData = [];
//     let total = 0;

//     if (search && search.trim()) {
//       const regex = new RegExp(search.trim(), "i");

//       // First find matching users
//       const userPromises = [
//         Student.find({ roll_no: regex, delete: false }).select("roll_no name"),
//         Coach.find({ roll_no: regex, delete: false }).select("roll_no fullName"),
//         Staff.find({ roll_no: regex, delete: false }).select("roll_no fullName")
//       ];

//       const [students, coaches, staff] = await Promise.all(userPromises);
//       const rollnos = [
//         ...students.map(s => s.roll_no),
//         ...coaches.map(c => c.roll_no),
//         ...staff.map(s => s.roll_no)
//       ];

//       if (rollnos.length > 0) {
//         filter.rollno = { $in: rollnos };
//       } else {
//         // If no rollno match, try name search via aggregation
//         const pipeline = [
//           { $match: filter },
//           {
//             $lookup: {
//               from: "academyadmissions",
//               localField: "rollno",
//               foreignField: "roll_no",
//               as: "student" 
//             }
//           },
//           {
//             $lookup: {
//               from: "coaches",
//               localField: "rollno",
//               foreignField: "roll_no",
//               as: "coach"
//             }
//           },
//           {
//             $lookup: {
//               from: "staff",
//               localField: "rollno",
//               foreignField: "roll_no",
//               as: "staff"
//             }
//           },
//           {
//             $addFields: {
//               user_name: {
//                 $cond: [
//                   { $gt: [{ $size: "$student" }, 0] },
//                   { $arrayElemAt: ["$student.name", 0] },
//                   {
//                     $cond: [
//                       { $gt: [{ $size: "$coach" }, 0] },
//                       { $arrayElemAt: ["$coach.fullName", 0] },
//                       { $arrayElemAt: ["$staff.fullName", 0] }
//                     ]
//                   }
//                 ]
//               }
//             }
//           },
//           { $match: { user_name: regex } },
//           { $sort: { createdAt: -1 } },
//           { $skip: skip },
//           { $limit: limit }
//         ];

//         attendanceData = await Attendance.aggregate(pipeline);
//         total = await Attendance.aggregate([...pipeline, { $count: "total" }]);
//         total = total[0]?.total || 0;
//       }
//     }

//     if (!search || attendanceData.length === 0) {
//       total = await Attendance.countDocuments(filter);
//       attendanceData = await Attendance.find(filter)
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean();

//       for (let att of attendanceData) {
//         const info = getUserModel(att.user_type);
//         if (info) {
//           const user = await info.model.findOne({ roll_no: att.rollno }).select("name fullName").lean();
//           att.user_name = user ? (user.name || user.fullName || "Unknown") : "Unknown";
//         }
//       }
//     }

//     return res.status(200).json({
//       message: "Attendance Search Results Fetched",
//       data: encryptData({
//         attendances: attendanceData,
//         pagination: {
//           total,
//           current_page: currentPage,
//           total_pages: Math.ceil(total / limit),
//           per_page: limit,
//         },
//       }),
//     });

//   } catch (err) {
//     logger.error(`SearchAttendanceWeb Error: ${err.message}`);
//     return res.status(500).json({ message: "SERVER ERROR" });
//   }
// };

const SearchAttendanceWeb = async (req, res) => {
  try {
    logger.info("Search Attendance Web Request Received");
    const result = await validateAdminRequest(req, res);
    if (result.error) return res.status(result.status).json({ message: result.message });

    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }

    let {
      search,
      page = 1,
      user_type,
      tap,
      date_from,
      date_to,
      source
    } = decryptedData;

    console.log(`Search: ${search} | UserType: ${user_type} | Tap: ${tap} | DateFrom: ${date_from} | DateTo: ${date_to} | Source: ${source}`);

    const limit = 50;
    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const skip = (currentPage - 1) * limit;

    const filter = { delete: false };

    // === SUPPORT MULTIPLE USER TYPES ===
    let userTypes = [];
    if (typeof user_type === "string" && user_type) {
      userTypes = user_type.split(",").map(t => t.trim()).filter(t => ["Student", "Coach", "Staff"].includes(t));
    } else if (Array.isArray(user_type)) {
      userTypes = user_type.filter(t => ["Student", "Coach", "Staff"].includes(t));
    }

    // Auto-detect from rollno prefix if no user_type
    if (search && userTypes.length === 0) {
      const trimmed = search.trim().toUpperCase();
      if (trimmed.startsWith("COA")) userTypes = ["Coach"];
      else if (trimmed.startsWith("STA")) userTypes = ["Staff"];
      else userTypes = ["Student"];
    }
    // Default: all types if nothing selected
    if (userTypes.length === 0) userTypes = ["Student", "Coach", "Staff"];

    filter.user_type = { $in: userTypes };

    if (tap && ["IN", "OUT"].includes(tap)) filter.tap = tap;
    // if (source) filter.source = source;
    if (source) {
      let sources = [];
    
      if (typeof source === "string") {
        sources = source
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
      } else if (Array.isArray(source)) {
        sources = source.map(s => s.trim()).filter(Boolean);
      }
      console.log(`sources: ${sources}`);
      if (sources.length > 0) {
        filter.source = { $in: sources };
      }
    }
    // console.log(`Source Filter: ${source}`);
    // Date range
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to) {
        const end = new Date(date_to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    let attendanceData = [];
    let total = 0;

    // Helper: Convert UTC date to IST 12-hour time string (e.g., "07:06 AM")
    const toIST12HourTime = (date) => {
      return new Date(date).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).replace(/AM|PM/i, (match) => match.toUpperCase()); // Ensures AM/PM in uppercase
    };

    // === PRESENT / ABSENT SEARCH ===
    if (search && search.trim()) {
      const lowerSearch = search.trim().toLowerCase();

      if (lowerSearch === "present" || lowerSearch === "absent") {
        const isPresent = lowerSearch === "present";

        let allActiveRollNos = [];
        const presentRollNos = new Set();

        for (const type of userTypes) {
          const Model = type === "Coach" ? Coach : type === "Staff" ? Staff : Student;
          const activeUsers = await Model.find({ active: true, delete: false }).select("roll_no");
          const rollNos = activeUsers.map(u => u.roll_no);
          allActiveRollNos.push(...rollNos);

          const present = await Attendance.distinct("rollno", {
            ...filter,
            user_type: type,
            tap: "IN",
            rollno: { $in: rollNos }
          });
          present.forEach(r => presentRollNos.add(r));
        }

        const targetRollNos = isPresent
          ? Array.from(presentRollNos)
          : allActiveRollNos.filter(r => !presentRollNos.has(r));

        total = targetRollNos.length;
        attendanceData = total === 0 ? [] : await Attendance.find({
          ...filter,
          rollno: { $in: targetRollNos }
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // Attach user_name + checkInTime / checkOutTime in 12H IST format
        for (let att of attendanceData) {
          const Model = att.user_type === "Coach" ? Coach :
                        att.user_type === "Staff" ? Staff : Student;
          const field = att.user_type === "Student" ? "name" : "fullName";
          const user = await Model.findOne({ roll_no: att.rollno }).select(field).lean();
          att.user_name = user ? (user[field] || "Unknown") : "Unknown";

          if (att.tap === "IN") {
            att.checkInTime = toIST12HourTime(att.createdAt);
          } else if (att.tap === "OUT") {
            att.checkOutTime = toIST12HourTime(att.createdAt);
          }
        }

        return res.status(200).json({
          message: "Attendance Search Results Fetched",
          data: encryptData({
            attendances: attendanceData,
            pagination: {
              total,
              current_page: currentPage,
              total_pages: Math.ceil(total / limit),
              per_page: limit
            }
          })
        });
      }
    }

    // === ROLLNO SEARCH ===
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      let matchingRollNos = [];

      for (const type of userTypes) {
        const Model = type === "Coach" ? Coach : type === "Staff" ? Staff : Student;
        const users = await Model.find({ roll_no: regex, delete: false }).select("roll_no");
        matchingRollNos.push(...users.map(u => u.roll_no));
      }

      if (matchingRollNos.length > 0) {
        filter.rollno = { $in: matchingRollNos };
      }
    }

    // === NAME SEARCH (Fixed - No invalid pipeline) ===
    if (search && search.trim() && !filter.rollno) {
      const regex = new RegExp(search.trim(), "i");
      let allResults = [];

      for (const type of userTypes) {
        const collection = type === "Student" ? "academyadmissions" :
                           type === "Coach" ? "coaches" : "staff";
        const nameField = type === "Student" ? "name" : "fullName";

        const pipeline = [
          { $match: filter },
          {
            $lookup: {
              from: collection,
              localField: "rollno",
              foreignField: "roll_no",
              as: "user_info"
            }
          },
          { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },
          { $match: { [`user_info.${nameField}`]: regex } },
          {
            $addFields: {
              user_name: `$user_info.${nameField}`
            }
          },
          { $sort: { createdAt: -1 } },
          { $project: { user_info: 0 } }
        ];

        const results = await Attendance.aggregate(pipeline);
        allResults.push(...results);
      }

      // Deduplicate by _id
      const uniqueMap = new Map();
      allResults.forEach(item => {
        if (item._id && !uniqueMap.has(item._id.toString())) {
          uniqueMap.set(item._id.toString(), item);
        }
      });

      const uniqueResults = Array.from(uniqueMap.values());
      total = uniqueResults.length;
      attendanceData = uniqueResults.slice(skip, skip + limit);

      // Add checkInTime / checkOutTime in 12H IST format
      for (let att of attendanceData) {
        if (att.tap === "IN") {
          att.checkInTime = toIST12HourTime(att.createdAt);
        } else if (att.tap === "OUT") {
          att.checkOutTime = toIST12HourTime(att.createdAt);
        }
      }

      return res.status(200).json({
        message: "Attendance Search Results Fetched",
        data: encryptData({
          attendances: attendanceData,
          pagination: {
            total,
            current_page: currentPage,
            total_pages: Math.ceil(total / limit),
            per_page: limit
          }
        })
      });
    }

    // === DEFAULT LIST (No search or rollno match) ===
    total = await Attendance.countDocuments(filter);
    attendanceData = await Attendance.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach user_name + checkInTime / checkOutTime in 12H IST format
    for (let att of attendanceData) {
      const Model = att.user_type === "Coach" ? Coach :
                    att.user_type === "Staff" ? Staff : Student;
      const field = att.user_type === "Student" ? "name" : "fullName";
      const user = await Model.findOne({ roll_no: att.rollno }).select(field).lean();
      att.user_name = user ? (user[field] || "Unknown") : "Unknown";

      if (att.tap === "IN") {
        att.checkInTime = toIST12HourTime(att.createdAt);
      } else if (att.tap === "OUT") {
        att.checkOutTime = toIST12HourTime(att.createdAt);
      }
    }

    return res.status(200).json({
      message: "Attendance Search Results Fetched",
      data: encryptData({
        attendances: attendanceData,
        pagination: {
          total,
          current_page: currentPage,
          total_pages: Math.ceil(total / limit),
          per_page: limit
        }
      })
    });

  } catch (err) {
    logger.error(`SearchAttendanceWeb Error: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const SearchAttendance = async (req, res) => {
  try {
    logger.info("Search Attendance Web Request Received");
    const result = await validateAdminRequest(req, res);
    if (result.error) return res.status(result.status).json({ message: result.message });

    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }

    const {
      search,
      page = 1,
      user_type,
      tap,
      date_from,
      date_to,
      source
    } = decryptedData;

    const limit = 50;
    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const skip = (currentPage - 1) * limit;

    const filter = { delete: false };

    if (user_type && ["Student", "Coach", "Staff"].includes(user_type)) {
      filter.user_type = user_type;
    }
    if (tap && ["IN", "OUT"].includes(tap)) {
      filter.tap = tap;
    }
    // if (source) filter.source = source;

    // === SUPPORT MULTIPLE SOURCES (OR CONDITION) ===
    if (source) {
      let sources = [];
    
      if (typeof source === "string") {
        sources = source
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
      } else if (Array.isArray(source)) {
        sources = source.map(s => s.trim()).filter(Boolean);
      }
      console.log(`sources: ${sources}`);
      if (sources.length > 0) {
        filter.source = { $in: sources };
      }
    }
    console.log(`Source Filter: ${source}`);


    // Date range
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to) {
        const end = new Date(date_to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    // Search by rollno or name (via lookup)
    let attendanceData = [];
    let total = 0;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      // First find matching users
      const userPromises = [
        AcademyAdmissions.find({ roll_no: regex, delete: false }).select("roll_no name"),
        Coach.find({ roll_no: regex, delete: false }).select("roll_no fullName"),
        Staff.find({ roll_no: regex, delete: false }).select("roll_no fullName")
      ];

      const [students, coaches, staff] = await Promise.all(userPromises);
      const rollnos = [
        ...students.map(s => s.roll_no),
        ...coaches.map(c => c.roll_no),
        ...staff.map(s => s.roll_no)
      ];

      if (rollnos.length > 0) {
        filter.rollno = { $in: rollnos };
      } else {
        // If no rollno match, try name search via aggregation
        const pipeline = [
          { $match: filter },
          {
            $lookup: {
              from: "academyadmissions",
              localField: "rollno",
              foreignField: "roll_no",
              as: "student"
            }
          },
          {
            $lookup: {
              from: "coaches",
              localField: "rollno",
              foreignField: "roll_no",
              as: "coach"
            }
          },
          {
            $lookup: {
              from: "staff",
              localField: "rollno",
              foreignField: "roll_no",
              as: "staff"
            }
          },
          {
            $addFields: {
              user_name: {
                $cond: [
                  { $gt: [{ $size: "$student" }, 0] },
                  { $arrayElemAt: ["$student.name", 0] },
                  {
                    $cond: [
                      { $gt: [{ $size: "$coach" }, 0] },
                      { $arrayElemAt: ["$coach.fullName", 0] },
                      { $arrayElemAt: ["$staff.fullName", 0] }
                    ]
                  }
                ]
              }
            }
          },
          { $match: { user_name: regex } },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit }
        ];

        attendanceData = await Attendance.aggregate(pipeline);
        total = await Attendance.aggregate([...pipeline, { $count: "total" }]);
        total = total[0]?.total || 0;
      }
    }

    if (!search || attendanceData.length === 0) {
      total = await Attendance.countDocuments(filter);
      attendanceData = await Attendance.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

      for (let att of attendanceData) {
        const info = getUserModel(att.user_type);
        if (info) {
          const user = await info.model.findOne({ roll_no: att.rollno }).select("name fullName").lean();
          att.user_name = user ? (user.name || user.fullName || "Unknown") : "Unknown";
        }
      }
    }

    return res.status(200).json({
      message: "Attendance Search Results Fetched",
      data: encryptData({
        attendances: attendanceData,
        pagination: {
          total,
          current_page: currentPage,
          total_pages: Math.ceil(total / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    logger.error(`SearchAttendanceWeb Error: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

// ========================
// VIEW DAILY ATTENDANCE WEB (Grouped + IST Corrected)
// ========================
// const ViewDailyAttendanceWeb = async (req, res) => {
//   try {
//     logger.info("View Daily Attendance Web Request Received");

//     const result = await validateAdminRequest(req, res);
//     if (result.error) return res.status(result.status).json({ message: result.message });

//     let decryptedData;
//     try {
//       decryptedData = decryptData(req.params.data);
//     } catch (error) {
//       logger.error(`Decryption failed: ${error.message}`);
//       return res.status(400).json({ message: "Invalid data" });
//     }

//     const { page = 1, date } = decryptedData;
//     const limit = 50;
//     const currentPage = Number(page) > 0 ? Number(page) : 1;
//     const skip = (currentPage - 1) * limit;

//     const matchStage = { delete: false };

//     if (date) {
//       const targetDate = new Date(date);
//       const startOfDay = new Date(targetDate);
//       startOfDay.setHours(0, 0, 0, 0);
//       const endOfDay = new Date(targetDate);
//       endOfDay.setHours(23, 59, 59, 999);

//       // Convert to IST
//       const istOffset = 5.5 * 60 * 60 * 1000;
//       matchStage.date = {
//         $gte: new Date(startOfDay.getTime() + istOffset),
//         $lte: new Date(endOfDay.getTime() + istOffset)
//       };
//     }

//     const pipeline = [
//       { $match: matchStage },

//       // Group by rollno + user_type + date (in IST)
//       {
//         $group: {
//           _id: {
//             rollno: "$rollno",
//             user_type: "$user_type",
//             date: {
//               $dateToString: {
//                 format: "%Y-%m-%d",
//                 date: "$date",
//                 timezone: "+05:30"  // ← IST Fixed Here
//               }
//             }
//           },
//           first_in: {
//             $min: {
//               $cond: [{ $eq: ["$tap", "IN"] }, "$createdAt", null]
//             }
//           },
//           last_out: {
//             $max: {
//               $cond: [{ $eq: ["$tap", "OUT"] }, "$createdAt", null]
//             }
//           },
//           in_count: { $sum: { $cond: [{ $eq: ["$tap", "IN"] }, 1, 0] } },
//           out_count: { $sum: { $cond: [{ $eq: ["$tap", "OUT"] }, 1, 0] } },
//           sources: { $addToSet: "$source" }
//         }
//       },

//       // Calculate duration & status
//       {
//         $addFields: {
//           duration_minutes: {
//             $cond: [
//               { $and: ["$first_in", "$last_out"] },
//               { $divide: [{ $subtract: ["$last_out", "$first_in"] }, 1000 * 60] },
//               null
//             ]
//           },
//           status: {
//             $switch: {
//               branches: [
//                 { case: { $and: [{ $gte: ["$in_count", 1] }, { $gte: ["$out_count", 1] }] }, then: "Present" },
//                 { case: { $gte: ["$in_count", 1] }, then: "Half Day" },
//                 { case: { $gte: ["$out_count", 1] }, then: "Left Early" }
//               ],
//               default: "Absent"
//             }
//           }
//         }
//       },

//       { $sort: { "_id.date": -1, first_in: -1 } },
//       { $skip: skip },
//       { $limit: limit }
//     ];

//     const dailyRecords = await Attendance.aggregate(pipeline);
//     const totalResult = await Attendance.aggregate([...pipeline, { $count: "total" }]);
//     const total = totalResult[0]?.total || 0;

//     // Attach user name & format IST time
//     for (let rec of dailyRecords) {
//       const info = getUserModel(rec._id.user_type);
//       if (info) {
//         const user = await info.model.findOne({ roll_no: rec._id.rollno, delete: false })
//             .select("name fullName")
//             .lean();

//         rec.rollno = rec._id.rollno;
//         rec.user_type = rec._id.user_type;
//         rec.date = rec._id.date;
//         rec.user_name = user ? (user.name || user.fullName || "Unknown") : "Deleted User";

//         // Convert first_in & last_out to IST string
//         if (rec.first_in) {
//           const d = new Date(rec.first_in);
//           rec.first_in = d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
//         }
//         if (rec.last_out) {
//           const d = new Date(rec.last_out);
//           rec.last_out = d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
//         }
//       }
//       delete rec._id;
//     }
//     console.log(dailyRecords);
    
//     console.log("Pagination:", {
//       total,
//       current_page: currentPage,
//       total_pages: Math.ceil(total / limit),
//       per_page: limit,
//     }
//     );

//     return res.status(200).json({
//       message: "Daily Attendance Fetched Successfully",
//       data: encryptData({
//         attendance: dailyRecords,
//         pagination: {
//           total,
//           current_page: currentPage,
//           total_pages: Math.ceil(total / limit),
//           per_page: limit,
//         },
//       }),
//     });

//   } catch (err) {
//     logger.error(`ViewDailyAttendanceWeb Error: ${err.message}`);
//     return res.status(500).json({ message: "SERVER ERROR" });
//   }
// };

const ViewDailyAttendanceWeb = async (req, res) => {
  try {
    logger.info("View Daily Attendance Web Request Received");

    const result = await validateAdminRequest(req, res);
    if (result.error) return res.status(result.status).json({ message: result.message });

    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }

    const { page = 1, date } = decryptedData;

    const limit = 50;
    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const skip = (currentPage - 1) * limit;

    // === BUILD DATE FILTER IN IST ===
    let dateFilter = {};
    if (date) {
      const targetDate = new Date(date); // Expected as YYYY-MM-DD
      const startOfDayUTC = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0));
      const endOfDayUTC = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

      // Convert IST day to UTC range (IST is UTC+5:30)
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const startISTinUTC = new Date(startOfDayUTC.getTime() - istOffsetMs);
      const endISTinUTC = new Date(endOfDayUTC.getTime() - istOffsetMs);

      dateFilter = {
        $gte: startISTinUTC,
        $lte: endISTinUTC
      };
    }

    const matchStage = {
      delete: false,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    };

    // === AGGREGATION PIPELINE ===
    const pipeline = [
      { $match: matchStage },

      // Convert date to IST string for grouping
      {
        $addFields: {
          istDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: "+05:30"
            }
          }
        }
      },

      // Group by rollno + user_type + IST date
      {
        $group: {
          _id: {
            rollno: "$rollno",
            user_type: "$user_type",
            date: "$istDate"
          },
          first_in: { $min: { $cond: [{ $eq: ["$tap", "IN"] }, "$createdAt", null] } },
          last_out: { $max: { $cond: [{ $eq: ["$tap", "OUT"] }, "$createdAt", null] } },
          in_count: { $sum: { $cond: [{ $eq: ["$tap", "IN"] }, 1, 0] } },
          out_count: { $sum: { $cond: [{ $eq: ["$tap", "OUT"] }, 1, 0] } },
          sources: { $addToSet: "$source" }
        }
      },

      // Calculate duration and status
      {
        $addFields: {
          duration_minutes: {
            $cond: [
              { $and: ["$first_in", "$last_out"] },
              { $divide: [{ $subtract: ["$last_out", "$first_in"] }, 60000] },
              null
            ]
          },
          status: {
            $switch: {
              branches: [
                { case: { $and: [{ $gte: ["$in_count", 1] }, { $gte: ["$out_count", 1] }] }, then: "Present" },
                { case: { $gte: ["$in_count", 1] }, then: "Half Day" },
                { case: { $gte: ["$out_count", 1] }, then: "Left Early" }
              ],
              default: "Absent"
            }
          }
        }
      },

      // Sort by date desc, then first_in desc
      { $sort: { "_id.date": -1, first_in: -1 } }
    ];

    // === GET TOTAL COUNT (Separate aggregation) ===
    const countPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await Attendance.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    // === GET PAGINATED DATA ===
    const dataPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
    let dailyRecords = await Attendance.aggregate(dataPipeline);

    // === ATTACH USER NAME & FORMAT TIMES IN IST ===
    const toISTString = (date) => {
      if (!date) return null;
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).toUpperCase(); // e.g., "09:30 AM"
    };

    for (let rec of dailyRecords) {
      const info = getUserModel(rec._id.user_type);
      if (info) {
        const user = await info.model.findOne({ roll_no: rec._id.rollno, delete: false })
          .select("name fullName")
          .lean();

        rec.rollno = rec._id.rollno;
        rec.user_type = rec._id.user_type;
        rec.date = rec._id.date;
        rec.user_name = user ? (user.name || user.fullName || "Unknown") : "Deleted User";

        rec.checkInTime = rec.first_in ? toISTString(rec.first_in) : null;
        rec.checkOutTime = rec.last_out ? toISTString(rec.last_out) : null;

        // Optional: format duration
        if (rec.duration_minutes) {
          const hours = Math.floor(rec.duration_minutes / 60);
          const mins = Math.round(rec.duration_minutes % 60);
          rec.duration = `${hours}h ${mins}m`;
        }
      }
      delete rec._id;
      delete rec.first_in;
      delete rec.last_out;
    }

    logger.info(`Daily Attendance: ${dailyRecords.length} records for page ${currentPage}`);

    return res.status(200).json({
      message: "Daily Attendance Fetched Successfully",
      data: encryptData({
        attendance: dailyRecords,
        pagination: {
          total,
          current_page: currentPage,
          total_pages: Math.ceil(total / limit),
          per_page: limit
        }
      })
    });

  } catch (err) {
    logger.error(`ViewDailyAttendanceWeb Error: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

// ========================
// VIEW DAILY ATTENDANCE MOBILE (10 per page)
// ========================
const ViewDailyAttendance = async (req, res) => {
  try {
    logger.info("View Daily Attendance Mobile Request Received");

    const result = await validateAdminRequest(req, res);
    if (result.error) return res.status(result.status).json({ message: result.message });

    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }

    const { page = 1, date } = decryptedData;
    const limit = 10;
    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const skip = (currentPage - 1) * limit;

    const matchStage = { delete: false };

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      const istOffset = 5.5 * 60 * 60 * 1000;
      matchStage.date = {
        $gte: new Date(startOfDay.getTime() + istOffset),
        $lte: new Date(endOfDay.getTime() + istOffset)
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            rollno: "$rollno",
            user_type: "$user_type",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "+05:30" } }
          },
          first_in: { $min: { $cond: [{ $eq: ["$tap", "IN"] }, "$createdAt", null] } },
          last_out: { $max: { $cond: [{ $eq: ["$tap", "OUT"] }, "$createdAt", null] } },
          in_count: { $sum: { $cond: [{ $eq: ["$tap", "IN"] }, 1, 0] } },
          out_count: { $sum: { $cond: [{ $eq: ["$tap", "OUT"] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          status: {
            $cond: [
              { $and: [{ $gte: ["$in_count", 1] }, { $gte: ["$out_count", 1] }] },
              "Present",
              { $cond: [{ $gte: ["$in_count", 1] }, "Half Day", "Absent",]}
            ]
          }
        }
      },
      { $sort: { "_id.date": -1, first_in: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const dailyRecords = await Attendance.aggregate(pipeline);
    const totalResult = await Attendance.aggregate([...pipeline, { $count: "total" }]);
    const total = totalResult[0]?.total || 0;

    for (let rec of dailyRecords) {
      const info = getUserModel(rec._id.user_type);
      if (info) {
        const user = await info.model.findOne({ roll_no: rec._id.rollno }).lean();
        rec.user_name = user ? (user.name || user.fullName || "Unknown") : "Unknown";
        rec.rollno = rec._id.rollno;
        rec.date = rec._id.date;

        if (rec.first_in) rec.first_in = new Date(rec.first_in).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
        if (rec.last_out) rec.last_out = new Date(rec.last_out).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
      }
      delete rec._id;
    }

    return res.status(200).json({
      message: "Daily Attendance Fetched",
      data: encryptData({
        attendance: dailyRecords,
        pagination: {
          total,
          current_page: currentPage,
          total_pages: Math.ceil(total / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    logger.error(`ViewDailyAttendance Error: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};




module.exports = {
  MarkAttendance,
  // ViewAttendanceWeb,
  // ViewAttendance,
  ViewSelectedAttendance,
  SearchAttendanceWeb,
  SearchAttendance,
  ViewDailyAttendance,
  ViewDailyAttendanceWeb,
};
