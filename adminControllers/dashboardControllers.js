const Accounts = require("../models/Accounts");
const AcademyAdmissions = require("../models/AcademyAdmissions");
const Attendance = require("../models/harsh/Attendance");
const Staff = require("../models/harsh/Staff");
const Coach = require("../models/harsh/Coach");
const GroundBooking = require("../models/GroundBookings");
const AcademyInventory = require("../models/AcademyInventory");
const InventoryAllotment = require("../models/InventoryAllotment");
const { validateAdminRequest } = require("../middlewares/adminValidation");
const { encryptData, decryptData, logger } = require("../utils/enc_dec_admin");

const Dashboard = async (req, res) => {
  try {
    logger.info("Dashboard Analytics API Called");

    const result = await validateAdminRequest(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }

    const { from_date, to_date } = result.data;
    console.log(from_date,to_date)

    const from = new Date(from_date);
    from.setHours(0, 0, 0, 0);

    const to = new Date(to_date);
    to.setHours(23, 59, 59, 999);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      summary,
      finance,
      admissions,
      attendance,
      staffCoach,
      ground,
      inventory,
      charts,
      alerts
    ] = await Promise.all([
      summaryAnalytics(from, to),
      financeAnalytics(from, to, todayStart, todayEnd),
      admissionAnalytics(from, to),
      attendanceAnalytics(from, to),
      staffCoachAnalytics(),
      groundAnalytics(from, to),
      inventoryAnalytics(),
      chartAnalytics(from, to),
      alertAnalytics()
    ]);
    const dt = {
        summary,
        finance,
        admissions,
        attendance,
        staffCoach,
        ground,
        inventory,
        charts,
        alerts
      }
      console.log(dt)

    return res.status(200).json({
      message: "Dashboard Data Fetched Successfully",
      data: encryptData({
        summary,
        finance,
        admissions,
        attendance,
        staffCoach,
        ground,
        inventory,
        charts,
        alerts
      })
    });

  } catch (err) {
    logger.error("Dashboard Error", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {Dashboard};

/* ============================ ANALYTICS ============================ */

async function summaryAnalytics(from, to) {
  const [revenue, activeStudents, pending] = await Promise.all([
    Accounts.aggregate([
      { $match: { amt_in_out: "IN", date: { $gte: from, $lte: to }, active: true, delete: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    AcademyAdmissions.countDocuments({ active: true, delete: false }),
    AcademyAdmissions.aggregate([
      { $match: { active: true, delete: false } },
      { $group: { _id: null, total: { $sum: "$leftover" } } }
    ])
  ]);

  return {
    total_revenue: revenue[0]?.total || 0,
    active_students: activeStudents,
    pending_amount: pending[0]?.total || 0
  };
}

async function financeAnalytics(from, to, todayStart, todayEnd) {
  const [incomeByMethod, expense, todayIncome] = await Promise.all([
    Accounts.aggregate([
      { $match: { amt_in_out: "IN", date: { $gte: from, $lte: to }, delete: false } },
      { $group: { _id: "$payment_method", total: { $sum: "$amount" } } }
    ]),
    Accounts.aggregate([
      { $match: { amt_in_out: "OUT", date: { $gte: from, $lte: to }, delete: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    Accounts.aggregate([
      { $match: { amt_in_out: "IN", date: { $gte: todayStart, $lte: todayEnd }, delete: false } },
      { $group: { _id: "$payment_method", total: { $sum: "$amount" } } }
    ])
  ]);

  return {
    income_by_method: incomeByMethod,
    expense: expense[0]?.total || 0,
    todays_income_by_method: todayIncome
  };
}

// async function admissionAnalytics(from, to) {
//   const [newAdmissions, expired, expiring, renewals] = await Promise.all([
//     AcademyAdmissions.countDocuments({ createdAt: { $gte: from, $lte: to }, delete: false }),
//     AcademyAdmissions.countDocuments({ expiry_date: { $lt: new Date() }, active: true }),
//     AcademyAdmissions.countDocuments({
//       expiry_date: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) },
//       active: true
//     }),
//     AcademyAdmissions.aggregate([
//       { $unwind: "$past_details" },
//       { $match: { "past_details.end_date": { $gte: from, $lte: to } } },
//       { $count: "count" }
//     ])
//   ]);
//
//   return {
//     new_admissions: newAdmissions,
//     renewals: renewals[0]?.count || 0,
//     expired_admissions: expired,
//     expiring_next_7_days: expiring
//   };
// }

async function admissionAnalytics(from, to) {

  const now = new Date();
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [
    newAdmissionsCount,
    renewalAgg,

    expiredCount,
    expiredList,

    expiringCount,
    expiringList

  ] = await Promise.all([

    // 1️⃣ New admissions count
    AcademyAdmissions.countDocuments({
      createdAt: { $gte: from, $lte: to },
      delete: false
    }),

    // 2️⃣ Renewals count
    AcademyAdmissions.aggregate([
      { $match: { "past_details.0": { $exists: true }, delete: false } },
      { $count: "count" }
    ]),

    // 3️⃣ Expired admissions count
    AcademyAdmissions.countDocuments({
      expiry_date: { $lt: now },
      active: true,
      delete: false
    }),

    // 4️⃣ Expired admissions list (LIMITED)
    AcademyAdmissions.find({
      expiry_date: { $lt: now },
      active: true,
      delete: false
    })
      .select(
        "roll_no name phone plan_name sports_name expiry_date academy_name"
      )
      .sort({ expiry_date: 1 })
      .limit(10)
      .lean(),

    // 5️⃣ Expiring in next 7 days count
    AcademyAdmissions.countDocuments({
      expiry_date: { $gte: now, $lte: next7Days },
      active: true,
      delete: false
    }),

    // 6️⃣ Expiring in next 7 days list
    AcademyAdmissions.find({
      expiry_date: { $gte: now, $lte: next7Days },
      active: true,
      delete: false
    })
      .select(
        "roll_no name phone plan_name sports_name expiry_date academy_name"
      )
      .sort({ expiry_date: 1 })
      .limit(10)
      .lean()

  ]);

  return {
    new_admissions: newAdmissionsCount,

    renewals: renewalAgg[0]?.count || 0,

    expired: {
      count: expiredCount,
      list: expiredList
    },

    expiring_next_7_days: {
      count: expiringCount,
      list: expiringList
    }
  };
}


async function attendanceAnalytics(from, to) {
  const [total, present] = await Promise.all([
    Attendance.countDocuments({ date: { $gte: from, $lte: to }, active: true }),
    Attendance.countDocuments({ date: { $gte: from, $lte: to }, tap: "IN", active: true })
  ]);

  return {
    total,
    present,
    absent: total - present
  };
}

async function staffCoachAnalytics() {
  const [staff, coach] = await Promise.all([
    Staff.countDocuments({ active: true, delete: false }),
    Coach.countDocuments({ active: true, delete: false })
  ]);

  return { staff, coach };
}

async function groundAnalytics(from, to) {
  const [bookings, revenue] = await Promise.all([
    GroundBooking.countDocuments({ date: { $gte: from, $lte: to }, active: true, delete: false }),
    GroundBooking.aggregate([
      { $match: { date: { $gte: from, $lte: to }, active: true, delete: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  return {
    total_bookings: bookings,
    revenue: revenue[0]?.total || 0
  };
}

async function inventoryAnalytics() {
  const [items, value, allotment] = await Promise.all([
    AcademyInventory.countDocuments({ active: true, delete: false }),
    AcademyInventory.aggregate([
      { $match: { active: true, delete: false } },
      { $group: { _id: null, total: { $sum: { $multiply: ["$amount", "$qty"] } } } }
    ]),
    InventoryAllotment.countDocuments({ active: true, delete: false })
  ]);

  return {
    total_items: items,
    total_inventory_value: value[0]?.total || 0,
    total_allotments: allotment
  };
}

async function chartAnalytics(from, to) {
  const [monthlyRevenue, renewalVsFresh] = await Promise.all([
    Accounts.aggregate([
      { $match: { amt_in_out: "IN", date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    AcademyAdmissions.aggregate([
      {
        $project: {
          type: {
            $cond: [{ $gt: [{ $size: "$past_details" }, 0] }, "Renewal", "Fresh"]
          }
        }
      },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ])
  ]);

  return {
    monthly_revenue: monthlyRevenue,
    renewal_vs_fresh: renewalVsFresh
  };
}

async function alertAnalytics() {
  const [expired, pending, lowStock] = await Promise.all([
    AcademyAdmissions.countDocuments({ expiry_date: { $lt: new Date() }, active: true }),
    AcademyAdmissions.countDocuments({ leftover: { $gt: 0 }, active: true }),
    AcademyInventory.countDocuments({ qty: { $lte: 5 }, active: true })
  ]);

  return {
    expired_admissions: expired,
    pending_payments: pending,
    low_stock_items: lowStock
  };
}
