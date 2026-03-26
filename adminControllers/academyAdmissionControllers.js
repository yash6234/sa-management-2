const { formatTimeLeft } = require("../utils/formatTime");
const Academy = require("../models/Academy");
const AcademySports = require("../models/AcademySports");
const AcademyPlans = require("../models/AcademyPlans");
const AcademySessions = require("../models/AcademySessions");
const AcademyAdmissions = require("../models/AcademyAdmissions");
const Receipts = require("../models/Receipts");
const AcademyInventory = require("../models/AcademyInventory");
const InventoryAllotment = require("../models/InventoryAllotment");

const { encryptData, decryptData ,logger} = require("../utils/enc_dec_admin");
const { validateAdminRequest,validateAdminRequestPost } = require("../middlewares/adminValidation");
const SportsAcademy = require("../models/SportsAcademy");
require('dotenv').config();

const fs = require("fs");
const path = require("path");
const {AddTransactionAdmin} = require("../utils/Trans_Fn");
const mongoose = require("mongoose");
const Accounts = require("../models/Accounts");
const {spawn} = require("child_process");
const {generateDynamicReceipt} = require("../middlewares/receiptGenerator");

function renameUploadedFile(oldPath, rollNo, fieldname) {
    if (!oldPath) return null;

    const uploadDir = "uploads/academy_admissions";

    const ext = path.extname(oldPath);
    const newName = `${rollNo}-${fieldname}${ext}`;
    const newPath = path.join(uploadDir, newName);

    try {
        fs.renameSync(path.join(uploadDir, oldPath), newPath);
        return newName;
    } catch (e) {
        console.log("Rename failed:", e);
        return oldPath;
    }
}

function getAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  // Adjust if birthday hasn't occurred yet this year
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age--;
  }

  return age;
}

const AddAcademyAdmission = async (req, res) => {
  const session = await mongoose.startSession();

  let admissionDoc = null;

  try {
    logger.info('Adding New Academy Admission Request Received');

    // 1) Basic request validation (admin)
    const result = await validateAdminRequestPost(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt payload
    let decryptedData;
    try {
      const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, '+');
      decryptedData = decryptData(fixedCipher);
      console.log('add adm decryptedData', decryptedData);
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      return res.status(400).json({ message: "Invalid data" });
    }

    logger.info("User Verified Successfully");

    // 3) Destructure
    const {
      name, father_name, phone, date_of_birth, gender, weight, address, aadhar_card,
      school_name, current_class, father_occupation, start_date, expiry_date,
      registration_fee, transaction = [], amount = 0, inventory = [],
      inv_trans = [], agree_tnc, session_id, sports_id, academy_id, plan_id
    } = decryptedData || {};

    if (!academy_id || !sports_id || !session_id || !plan_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 4) Validate IDs
    const acad = await Academy.findById(academy_id);
    const spt = await AcademySports.findById(sports_id);
    const ses = await AcademySessions.findById(session_id);
    const pln = await AcademyPlans.findById(plan_id);

    if (!acad || acad.delete || !acad.active) return res.status(404).json({ message: "Academy not found" });
    if (!spt || spt.delete || !spt.active) return res.status(404).json({ message: "Sport not found" });
    if (!ses || ses.delete || !ses.active) return res.status(404).json({ message: "Session not found" });
    if (!pln || pln.delete || !pln.active) return res.status(404).json({ message: "Plan not found" });

    // 5) Files (UNCHANGED)
    const trainee_photo_old = req.files?.trainee_photo?.[0]?.filename || null;
    const trainee_signature_old = req.files?.trainee_signature?.[0]?.filename || null;
    const aadhar_old = req.files?.aadhar?.[0]?.filename || null;
    const father_signature_old = req.files?.father_signature?.[0]?.filename || null;
    const self_declaration_old = req.files?.self_declaration?.[0]?.filename || null;
    const medical_form_old = req.files?.medical_form?.[0]?.filename || null;
    const other_docs_old = Array.isArray(req.files?.other_docs)
      ? req.files.other_docs.map(f => f.filename)
      : [];

    // 6) Generate roll_no
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01T00:00:00Z`);
    const yearEnd = new Date(`${currentYear}-12-31T23:59:59Z`);

    const countOfYear = await AcademyAdmissions.countDocuments({
      createdAt: { $gte: yearStart, $lte: yearEnd }
    });

    const roll_no = `${currentYear}${String(countOfYear + 1).padStart(4, "0")}`;

    // rename (UNCHANGED)
    const trainee_photo = trainee_photo_old ? renameUploadedFile(trainee_photo_old, roll_no, "trainee_photo") : null;
    const trainee_signature = trainee_signature_old ? renameUploadedFile(trainee_signature_old, roll_no, "trainee_signature") : null;
    const father_signature = father_signature_old ? renameUploadedFile(father_signature_old, roll_no, "father_signature") : null;
    const aadhar = aadhar_old ? renameUploadedFile(aadhar_old, roll_no, "aadhar") : null;
    const self_declaration = self_declaration_old ? renameUploadedFile(self_declaration_old, roll_no, "self_declaration") : null;
    const medical_form = medical_form_old ? renameUploadedFile(medical_form_old, roll_no, "medical_form") : null;
    const other_docs = other_docs_old.map((f, i) =>
      renameUploadedFile(f, roll_no, `other_docs_${i}`)
    );

    // 7) Dates (UNCHANGED)
    const startDateObj = start_date ? new Date(start_date) : new Date();
    const expiryDateObj = new Date(expiry_date);

    // 8) Transactions total (UNCHANGED)
    const safeTransactions = Array.isArray(transaction) ? transaction : [];
    const totalAmount = safeTransactions.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0
    );
    const totalAmountInv = inv_trans.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0
    );
    for (const tr of safeTransactions) tr.pay_for = "Admission";

    let payment_type = "Pending";
    if (totalAmount === Number(amount)) payment_type = "Paid";
    else if (totalAmount > 0 && totalAmount < Number(amount)) payment_type = "Partial";
    else if (amount == 0) payment_type = "Exempt";

    // 9) Age + time_left (UNCHANGED)
    let age = null;
    if (date_of_birth) {
      try { age = getAge(date_of_birth); } catch (_) {}
    }
    const now = new Date();
    const expiry = new Date(decryptedData.expiry_date);
    const timeLeft = expiry - now;
    decryptedData.time_left = timeLeft > 0 ? timeLeft : 0;

    // ===============================
    // 🚀 TRANSACTION START
    // ===============================
    await session.withTransaction(async () => {

      // 10) Create admission
      admissionDoc = await AcademyAdmissions.create([{
        name, father_name, phone, date_of_birth, gender, weight, address,
        school_name, current_class, father_occupation,
        trainee_photo, trainee_signature, father_signature, aadhar,
        self_declaration, medical_form, other_docs, agree_tnc,
        roll_no, aadhar_card,
        plan_id: pln._id, plan_name: pln.name, plan_amount: pln.amount,
        plan_validity: pln.days, registration_fee: pln.registration_fee,
        sports_id: spt._id, sports_name: spt.name,
        session_id: ses._id, session_from: ses.session_from, session_to: ses.session_to,
        academy_id: acad._id, academy_name: acad.name,
        start_date: startDateObj, expiry_date: expiryDateObj,
        amount: Number(amount), paid: totalAmount,
        leftover: Number(amount) - totalAmount,
        amount_without_discount: pln.amount + pln.registration_fee,
        admission_by: result.user?.name,
        admission_by_id: result.user?._id,
        admission_by_role: "Admin",
        payment_type,
        time_left: timeLeft
      }], { session });

      admissionDoc = admissionDoc[0];

      // 11) Payment transactions
      const tid = [];
      for (const tr of safeTransactions) {
        const txDate = tr.date ? new Date(tr.date) : new Date();
        const tidr = await AddTransactionAdmin(
          txDate,
          Number(tr.amount) || 0,
          "IN",
          roll_no,
          roll_no,
          tr.method || "CASH",
          { session }
        );
        tid.push({
          transaction_id: tidr._id,
          amount: Number(tr.amount),
          method: tr.method,
          date: txDate
        });
      }

      if (tid.length) {
        admissionDoc.transactions = tid;
        await admissionDoc.save({ session });
      }

      // 12) Inventory Validation
      for (const inv of inventory) {
        const invDoc = await AcademyInventory.findById(inv.inv_id).session(session);
        if (!invDoc || invDoc.delete || !invDoc.active)
          throw new Error(`Inventory Not found with id ${inv.inv_id}`);
        if (Number(inv.qty) > invDoc.qty)
          throw new Error(`Not Enough Quantity Available for ${invDoc.name}`);
      }

      // 13) Inventory Allotment
      for (const inv of inventory) {
        const invDoc = await AcademyInventory.findById(inv.inv_id).session(session);
        invDoc.qty -= Number(inv.qty);
        await invDoc.save({ session });

        await InventoryAllotment.create([{
          to: roll_no,
          academy_id: acad._id,
          inventory: invDoc._id,
          amount: Number(inv.amount) || 0,
          name: invDoc.name,
          qty: Number(inv.qty),
          description: `Inventory Allotted to ${roll_no}`,
          createdAt: new Date()
        }], { session });
      }

      // 14) Inventory payments
      for (const tr of inv_trans || []) {
        const txDate = tr.date ? new Date(tr.date) : new Date();
        await AddTransactionAdmin(
          txDate,
          Number(tr.amount),
          "IN",
          `Inventory:${roll_no}`,
          roll_no,
          tr.method || "UNKNOWN",
          { session }
        );
      }
    });
    // ===============================
    // 🚀 TRANSACTION COMMIT
    // ===============================

    session.endSession();

    // Receipt generation (UNCHANGED, after commit)
    let txt = inventory.length > 0 ? `Inventory Taken : ${inventory.length}` : "";
    await generateDynamicReceipt(academy_id, {
      roll_no,
      receivedFrom: name,
      amount: totalAmount,
      transactions: [...safeTransactions],
      remarks: `New Academy Admission Receipt!`
    });

    generateDynamicReceipt(academy_id,{
      roll_no,
      receivedFrom:name,
      amount:totalAmountInv,
      transactions:[...inv_trans],
      remarks:`Inventory Allotment Receipt - ${txt}`
    })

    // twilio part is started.

    
    // twilio message part ends here.

    logger.info(`New Admission Created Successfully ${roll_no}`);
    return res.status(200).json({
      message: "Admission Created Successfully",
      data: encryptData(admissionDoc)
    });

  } catch (err) {
    console.log(err);
    session.endSession();
    logger.error(`AddAcademyAdmission Error : ${err.stack || err}`);
    return res.status(400).json({ message: err.message || "Server error" });
  }
};

const ViewSelectedAdmission = async (req, res) => {
    try{
        logger.info('View Selected Admission Request Received');
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
        logger.info("User Verified Successfully");
        const { admission_id }=decryptedData;

        const dt = await AcademyAdmissions.findById(admission_id).populate("plan_id").populate("sports_id").populate("session_id").populate("academy_id");
        if(!dt || dt.delete==true ){
            logger.error("Admission Not Found")
            return res.status(404).json({message:"Admission Not Found"})
        }
        const time_left_formatted = formatTimeLeft(dt.time_left);

        const accountsdt = await Accounts.find({identification:dt.roll_no});

        const inv_aldt = await InventoryAllotment.find({to:dt.roll_no}).populate("inventory").populate("academy_id");

        logger.info(`Admission Fetched Successfully`)
        const admission= {details:dt,time_left_formatted,accounts:accountsdt,inventory:inv_aldt};

        return res.status(200).json({message:'Admission Fetched Successfully',data:encryptData(admission)});
    } catch (err){
        logger.error(`ViewSelectedAdmission Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAllAdmissions = async (req, res) => {
  try {
    logger.info("Fetch All Admissions Request Received");
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
    logger.info("User Verified Successfully");
    const { page }=decryptedData;

    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    const totalAdm = await AcademyAdmissions.countDocuments({
      delete: false,
    });

    const dt = await AcademyAdmissions.find({
      delete: false,
    })
      .populate("plan_id").populate("sports_id").populate("session_id").populate("academy_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    for(const tx of dt){
      tx.time_left_formatted = formatTimeLeft(tx.time_left);
    }

    // ✅ 5. Send encrypted response
    return res.status(200).json({
      message: "Admissions Fetched Successfully",
      data: encryptData({
        admissions: dt,
        pagination: {
          total: totalAdm,
          current_page: Number(page),
          total_pages: Math.ceil(totalAdm / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    logger.error(`Error fetching admissions: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const ViewAdmissions = async (req, res) => {
  try {
    logger.info("Fetch Admissions Request Received");
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
    logger.info("User Verified Successfully");
    const { page }=decryptedData;

    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    const totalAdm = await AcademyAdmissions.countDocuments({
      delete: false,
      active:true,
    });

    const dt = await AcademyAdmissions.find({
      delete: false,
      active:true,
    })
      .populate("plan_id").populate("sports_id").populate("session_id").populate("academy_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    for(const tx of dt){
      tx.time_left_formatted = formatTimeLeft(tx.time_left);
    }
    // ✅ 5. Send encrypted response
    return res.status(200).json({
      message: "Admissions Fetched Successfully",
      data: encryptData({
        admissions: dt,
        pagination: {
          total: totalAdm,
          current_page: Number(page),
          total_pages: Math.ceil(totalAdm / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    logger.error(`Error fetching admissions: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const ViewAllAdmissionsWeb = async (req, res) => {
  try {
    logger.info("Fetch All Admissions Web Request Received");
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
    logger.info("User Verified Successfully");
      const { page }=decryptedData;

    const limit = 50;
    const skip = (parseInt(page) - 1) * limit;

    const totalAdm = await AcademyAdmissions.countDocuments({
      delete: false,
    });

    const dt = await AcademyAdmissions.find({
      delete: false,
    })
      .populate("plan_id").populate("sports_id").populate("session_id").populate("academy_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    for(const tx of dt){
      tx.time_left_formatted = formatTimeLeft(tx.time_left);
    }


    // ✅ 5. Send encrypted response
    return res.status(200).json({
      message: "Admissions Fetched Successfully",
      data: encryptData({
        admissions: dt,
        pagination: {
          total: totalAdm,
          current_page: Number(page),
          total_pages: Math.ceil(totalAdm / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    logger.error(`Error fetching admissions web: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const ViewInactiveAdmissionsWeb = async (req, res) => {
  try {
    logger.info("Fetch Inactive Admissions Web Request Received");
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
    logger.info("User Verified Successfully");
    const { page }=decryptedData;

    const limit = 50;
    const skip = (parseInt(page) - 1) * limit;

    const totalAdm = await AcademyAdmissions.countDocuments({
      delete: false,
      active:false,
    });

    const dt = await AcademyAdmissions.find({
      delete: false,
      active:true,
    })
      .populate("plan_id").populate("sports_id").populate("session_id").populate("academy_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    for(const tx of dt){
      tx.time_left_formatted = formatTimeLeft(tx.time_left);
    }

    // ✅ 5. Send encrypted response
    return res.status(200).json({
      message: "Admissions Fetched Successfully",
      data: encryptData({
        admissions: dt,
        pagination: {
          total: totalAdm,
          current_page: Number(page),
          total_pages: Math.ceil(totalAdm / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    logger.error(`Error fetching inactive admissions web: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const ViewInactiveAdmissions = async (req, res) => {
  try {
    logger.info("Fetch Inactive Admissions Request Received");
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
    logger.info("User Verified Successfully");
    const { page }=decryptedData;

    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    const totalAdm = await AcademyAdmissions.countDocuments({
      delete: false,
      active:false,
    });

    const dt = await AcademyAdmissions.find({
      delete: false,
      active:true,
    })
      .populate("plan_id").populate("sports_id").populate("session_id").populate("academy_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    for(const tx of dt){
      tx.time_left_formatted = formatTimeLeft(tx.time_left);
    }

    // ✅ 5. Send encrypted response
    return res.status(200).json({
      message: "Admissions Fetched Successfully",
      data: encryptData({
        admissions: dt,
        pagination: {
          total: totalAdm,
          current_page: Number(page),
          total_pages: Math.ceil(totalAdm / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    logger.error(`Error fetching inactive admissions: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const ViewAdmissionsWeb = async (req, res) => {
  try {
    logger.info("Fetch Admissions Web Request Received");
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
    logger.info("User Verified Successfully");
    const { page }=decryptedData;

    const limit = 50;
    const skip = (parseInt(page) - 1) * limit;

    const totalAdm = await AcademyAdmissions.countDocuments({
      delete: false,
      active:true,
    });

    const dt = await AcademyAdmissions.find({
      delete: false,
      active:true,
    })
      .populate("plan_id").populate("sports_id").populate("session_id").populate("academy_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    for(const item of dt){
      item.time_left_formatted = formatTimeLeft(item.time_left);
    }

    // ✅ 5. Send encrypted response
    return res.status(200).json({
      message: "Admissions Fetched Successfully",
      data: encryptData({
        admissions: dt,
        pagination: {
          total: totalAdm,
          current_page: Number(page),
          total_pages: Math.ceil(totalAdm / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    logger.error(`Error fetching admissions web: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const EditAdmission = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    logger.info("Edit Academy Admission Request Received");

    // 1) Validate Admin
    const result = await validateAdminRequestPost(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }
    const adminUser = result.user || { name: "Admin", _id: null, role: "Admin" };

    // 2) Decrypt
    let dec;
    try {
      dec = decryptData(decodeURIComponent(req.body.data));
    } catch (err) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const {
      admission_id,
      name,
      father_name,
      phone, aadhar_card,
      gender,
      weight,
      address,
      school_name,
      current_class,
      father_occupation,
      date_of_birth,
      edit_note,
      expiry_date,
    } = dec || {};

    if (!admission_id) {
      return res.status(400).json({ message: "admission_id required" });
    }

    // 3) Load admission (SESSION ATTACHED)
    const adm = await AcademyAdmissions.findById(admission_id).session(session);
    if (!adm) return res.status(404).json({ message: "Admission not found" });

    // -----------------------------------------------
    // ★ STEP 4 → PREPARE everything first (NO SAVE)
    // -----------------------------------------------
    const newData = { ...adm._doc };
    const edits = [];

    const pushEdit = (field, oldVal, newVal) => {
      if (String(oldVal ?? "") !== String(newVal ?? "")) {
        edits.push({
          field,
          old: oldVal,
          new: newVal,
          changed_by: adminUser.name,
          changed_by_id: adminUser._id,
          changed_by_role: adminUser.role,
          changed_at: new Date(),
          note: edit_note || ""
        });
      }
    };

    // BASIC FIELDS
    if (name !== undefined) { pushEdit("name", newData.name, name); newData.name = name; }
    if (father_name !== undefined) { pushEdit("father_name", newData.father_name, father_name); newData.father_name = father_name; }
    if (phone !== undefined) { pushEdit("phone", newData.phone, phone); newData.phone = phone; }
    if (gender !== undefined) { pushEdit("gender", newData.gender, gender); newData.gender = gender; }
    if (weight !== undefined) { pushEdit("weight", newData.weight, weight); newData.weight = weight; }
    if (address !== undefined) { pushEdit("address", newData.address, address); newData.address = address; }
    if (school_name !== undefined) { pushEdit("school_name", newData.school_name, school_name); newData.school_name = school_name; }
    if (current_class !== undefined) { pushEdit("current_class", newData.current_class, current_class); newData.current_class = current_class; }
    if (father_occupation !== undefined) { pushEdit("father_occupation", newData.father_occupation, father_occupation); newData.father_occupation = father_occupation; }
    if (aadhar_card !== undefined) { pushEdit("aadhar_card", newData.aadhar_card, aadhar_card); newData.aadhar_card = aadhar_card; }

    // DOB + AGE
    if (date_of_birth !== undefined) {
      const newDob = date_of_birth ? new Date(date_of_birth) : null;
      const newAge = date_of_birth ? getAge(newDob) : newData.age;

      pushEdit("date_of_birth", newData.date_of_birth, newDob);
      pushEdit("age", newData.age, newAge);

      newData.date_of_birth = newDob;
      newData.age = newAge;
    }

    // EXPIRY DATE UPDATE + ACTIVE STATUS
    if (expiry_date !== undefined) {
      const newExpiry = expiry_date ? new Date(expiry_date) : null;

      pushEdit("expiry_date", newData.expiry_date, newExpiry);
      newData.expiry_date = newExpiry;

      const now = new Date();
      const newActive = newExpiry ? newExpiry >= now : false;

      pushEdit("active", newData.active, newActive);
      newData.active = newActive;
    }

    // -----------------------------------------------
    // FILES — PREPARE ONLY
    // -----------------------------------------------
    const uploads = {
      trainee_photo: req.files?.trainee_photo?.[0]?.filename || null,
      trainee_signature: req.files?.trainee_signature?.[0]?.filename || null,
      father_signature: req.files?.father_signature?.[0]?.filename || null,
      aadhar: req.files?.aadhar?.[0]?.filename || null,
      self_declaration: req.files?.self_declaration?.[0]?.filename || null,
      medical_form: req.files?.medical_form?.[0]?.filename || null
    };

    let other_docs_uploaded = [];
    if (Array.isArray(req.files?.other_docs)) {
      other_docs_uploaded = req.files.other_docs.map(f => f.filename);
    }

    if (other_docs_uploaded.length > 0) {
      const renamed_other_docs = other_docs_uploaded.map((file, i) =>
        renameUploadedFile(file, adm.roll_no, `other_docs_${i}`)
      );

      pushEdit(
        "other_docs",
        newData.other_docs,
        [...(newData.other_docs || []), ...renamed_other_docs]
      );

      newData.other_docs = [
        ...(newData.other_docs || []),
        ...renamed_other_docs
      ];
    }

    for (const key in uploads) {
      if (uploads[key]) {
        const newFile = renameUploadedFile(uploads[key], adm.roll_no, key);
        pushEdit(`file:${key}`, newData[key], newFile);
        newData[key] = newFile;
      }
    }

    // -----------------------------------------------
    // ★ STEP 5 — TRANSACTIONAL SAVE
    // -----------------------------------------------
    await session.withTransaction(async () => {
      adm.set(newData);
      if (edits.length) adm.edit_logs.push(...edits);
      await adm.save({ session });
    });

    session.endSession();

    return res.status(200).json({
      message: "Admission Updated Successfully",
      data: encryptData(adm)
    });

  } catch (err) {
    session.endSession();
    logger.error(`Edit Admission Error: ${err.stack || err}`);
    return res.status(500).json({ message: "Update failed — no data was changed" });
  }
};

const DeleteAdmission = async (req, res) => {
    try{
        logger.info('Delete Academy Admission Request Received');
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
        logger.info("User Verified Successfully");
        const { admission_id }=decryptedData;

        const dt = await AcademyAdmissions.findById(admission_id);
        if(!dt || dt.delete==true){
            logger.error("Admission Not Found")
            return res.status(404).json({message:"Admission Not Found"})
        }

        dt.active==false;
        dt.delete=true;
        await dt.save();

        logger.info(`Admission Deleted Successfully - ${dt.roll_no} deleted successfully`)

        return res.status(200).json({message:'Admission Deleted Successfully'});
    } catch (err){
        logger.error(`DeleteAdmission Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const RenewAdmission = async (req, res) => {
  let session = null;

  try {
    logger.info("Renew Academy Admission Request Received");

    // 1) Validate Admin
    const result = await validateAdminRequest(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt Request
    let decrypted;
    try {
      decrypted = decryptData(req.params.data);
    } catch (err) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const {
      admission_id,
      plan_id,
      start_date,
      expiry_date,
      transaction = [],
      amount = 0
    } = decrypted;

    if (!admission_id || !plan_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 3) Start Session FIRST
    session = await mongoose.startSession();

    // 4) Load Admission WITH SESSION
    const adm = await AcademyAdmissions
      .findById(admission_id)
      .session(session);

    if (!adm) {
      return res.status(404).json({ message: "Admission not found" });
    }

    // 5) Load New Plan (read-only, session optional but safe)
    const pln = await AcademyPlans
      .findById(plan_id)
      .session(session);

    if (!pln || pln.delete || !pln.active) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // 6) Dates
    const startDateObj = start_date ? new Date(start_date) : new Date();
    const expiryDateObj = new Date(expiry_date);

    // 7) Payment
    const safeTransactions = Array.isArray(transaction) ? transaction : [];
    const totalAmount = safeTransactions.reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    );

    const leftover = (Number(amount) || 0) - totalAmount;

    let payment_type = "Pending";
    if (totalAmount === Number(amount)) payment_type = "Paid";
    else if (totalAmount > 0 && totalAmount < Number(amount)) payment_type = "Partial";
    else if (amount == 0) payment_type = "Exempt";

    // ===============================
    // 🚀 TRANSACTION START
    // ===============================
    await session.withTransaction(async () => {

      // ------------------------------
      // STORE OLD DETAILS IN HISTORY
      // ------------------------------
      adm.past_details.push({
        renewed_on: new Date(),
        old_start: adm.start_date,
        old_expiry: adm.expiry_date,
        old_plan_id: adm.plan_id,
        old_plan_name: adm.plan_name,
        old_amount: adm.amount,
        old_registration_fee: adm.registration_fee,
        old_paid: adm.paid,
        old_sports_name: adm.sports_name,
        old_sports_id: adm.sports_id,
        old_session_from: adm.session_from,
        old_session_to: adm.session_to,
        old_session_id: adm.session_id,
        old_leftover: adm.leftover,
        old_admission_by: adm.admission_by,
        old_admission_by_id: adm.admission_by_id,
        old_admission_by_role: adm.admission_by_role,
        transactions: adm.transactions || []
      });

      // ------------------------------
      // UPDATE ADMISSION WITH NEW PLAN
      // ------------------------------
      adm.plan_id = pln._id;
      adm.plan_name = pln.name;
      adm.plan_amount = pln.amount;
      adm.registration_fee = 0;
      adm.plan_validity = pln.days;
      adm.start_date = startDateObj;
      adm.expiry_date = expiryDateObj;
      adm.amount = Number(amount) || 0;
      adm.paid = totalAmount;
      adm.leftover = leftover;
      adm.payment_type = payment_type;
      adm.amount_without_discount =
        Number(pln.amount) + Number(pln.registration_fee);

      await adm.save({ session });

      // ------------------------------
      // SAVE NEW TRANSACTIONS
      // ------------------------------
      const newTx = [];

      for (const tr of safeTransactions) {
        const txDate = tr.date ? new Date(tr.date) : new Date();
        const txAmount = Number(tr.amount) || 0;
        const txMethod = tr.method || "CASH";

        const tid = await AddTransactionAdmin(
          txDate,
          txAmount,
          "IN",
          adm.roll_no,
          adm.roll_no,
          txMethod,
          { session }
        );

        newTx.push({
          transaction_id: tid._id,
          amount: txAmount,
          method: txMethod,
          date: txDate,
          description: tr.description || ""
        });
      }

      // ✅ FIX: flatten transactions
      adm.transactions.push(...newTx);
      await adm.save({ session });
    });
    // ===============================
    // 🚀 TRANSACTION COMMIT
    // ===============================

    return res.status(200).json({
      message: "Renewal Successful",
      data: encryptData(adm)
    });

  } catch (err) {
    logger.error(`Renew Error: ${err}`);
    return res.status(500).json({ message: err.message || "SERVER ERROR" });
  } finally {
    if (session) session.endSession();
  }
};

const AddNewTransaction = async (req, res) => {
  let session = null;

  try {
    logger.info('Add New Admission Transaction Request Received');

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

    logger.info("User Verified Successfully");

    const { admission_id, transaction } = decryptedData;

    // 1️⃣ Start session FIRST
    session = await mongoose.startSession();

    // 2️⃣ Load admission WITH session
    const dt = await AcademyAdmissions
      .findById(admission_id)
      .session(session);

    if (!dt || dt.delete === true) {
      logger.error("Admission Not Found");
      return res.status(404).json({ message: "Admission Not Found" });
    }

    if (!(dt.leftover > 0)) {
      logger.error(`No Leftover Amount For this Admission With Roll No : ${dt.roll_no}`);
      return res.status(404).json({
        message: `No Leftover Amount For this Admission With Roll No : ${dt.roll_no}`
      });
    }

    const safeTransactions = Array.isArray(transaction) ? transaction : [];
    const totalAmount = safeTransactions.reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    );

    if (totalAmount > dt.leftover) {
      logger.error("Transaction is Higher than leftover amount");
      return res.status(400).json({
        message: "Transaction is Higher than leftover amount"
      });
    }

    // ===============================
    // 🚀 TRANSACTION START
    // ===============================
    await session.withTransaction(async () => {

      const newTx = [];

      for (const tr of safeTransactions) {
        const txDate = tr.date ? new Date(tr.date) : new Date();
        const txAmount = Number(tr.amount) || 0;
        const txMethod = tr.method || "CASH";

        const tid = await AddTransactionAdmin(
          txDate,
          txAmount,
          "IN",
          dt.roll_no,
          dt.roll_no,
          txMethod,
          { session }
        );

        newTx.push({
          transaction_id: tid._id,
          amount: txAmount,
          method: txMethod,
          date: txDate,
          description: tr.description || ""
        });
      }

      // UPDATE PAYMENT FIELDS
      dt.leftover -= totalAmount;
      dt.paid += totalAmount;

      if (dt.leftover > 0 && dt.paid > 0) {
        dt.payment_type = 'Partial';
      }
      if (dt.leftover === 0) {
        dt.payment_type = 'Paid';
      }

      // ✅ FIX: flatten array
      dt.transactions.push(...newTx);

      await dt.save({ session });
    });
    // ===============================
    // 🚀 TRANSACTION COMMIT
    // ===============================

    return res.status(200).json({
      message: 'Admission Transaction Added Successfully'
    });

  } catch (err) {
    logger.error(`AddNewTransaction Error : ${err}`);
    return res.status(500).json({ message: 'SERVER ERROR' });
  } finally {
    if (session) session.endSession();
  }
};

function generateIDCard(data, callback) {
    const scriptPath = path.join(__dirname, '..', 'main.py');

    const args = [
        scriptPath,
        '--name', data.name,
        '--dob', data.dob,
        '--address', data.address,
        '--mobile', data.phone,
        '--rollno', data.roll_no,
        '--photo',data.photo,
    ];

    const pythonProcess = spawn('python3', args);

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0 || error) {
            callback(`Python script failed: ${error}`, null);
        } else {
            callback(null, output);
        }
    });
}

const GenerateIDCard = async (req, res) => {
    try{
        logger.info('Generate ID Card Request Received');
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
        logger.info("User Verified Successfully");
        const {admission_id}=decryptedData;

        const data = await AcademyAdmissions.findById(admission_id);
        if(!data||data.delete==true){
          logger.error("Admission Not Found")
          return res.status(404).json({message:"Admission Not Found"})
        }
        const formattedData = {
            ...data._doc,
            dob: new Date(data.date_of_birth).toISOString().split('T')[0]  // format as "YYYY-MM-DD"
        };

        const fileName = `${formattedData.roll_no}.jpg`;
        const fileName1 = `${formattedData.roll_no}.pdf`;
        const filePath = path.join(__dirname, '../id_card_output', fileName);
        const filePath1 = path.join(__dirname, '../id_card_output_pdf', fileName1);

        // Delete existing file if it exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted existing ID card: ${fileName}`);
        }
        if (fs.existsSync(filePath1)) {
            fs.unlinkSync(filePath1);
            console.log(`Deleted existing ID card: ${fileName1}`);
        }

        generateIDCard(formattedData, async (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).send({message: 'ID card generation failed.', error: err});
          }
          data.id_card_status = 'Generated';
          data.id_status_updated_on=Date.now()
          await data.save();
          console.log('ID card generated successfully.');
          return res.status(200).send({
            message: 'ID card generated successfully!',
            fileName: formattedData.roll_no + ".jpg",
            fileName1: formattedData.roll_no + ".pdf"
          });
        });
    } catch (err){
        logger.error(`GenerateIDCard Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const MarkCreatedIDCard = async (req, res) => {
    try{
        logger.info('Mark ID Card Created Request Received');
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
        logger.info("User Verified Successfully");
        const {admission_id}=decryptedData;

        const acad = await AcademyAdmissions.findById(admission_id);
        if(!acad || acad.delete==true){
            logger.error(`Admission Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Admission not found"})
        }
        acad.id_card_status = 'Created';
        acad.id_status_updated_on=Date.now()
        await acad.save();
        return res.status(200).json({message:'ID Card Mark Created Successfully'});
    } catch (err){
        logger.error(`MarkCreatedIDCard Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const MarkGivenIDCard =async (req, res) => {
    try{
        logger.info('Mark ID Card Given Request Received');
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
        logger.info("User Verified Successfully");
        const {admission_id}=decryptedData;

        const acad = await AcademyAdmissions.findById(admission_id);
        if(!acad || acad.delete==true){
            logger.error(`Admission Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Admission not found"})
        }
        acad.id_card_status = 'Given';
        acad.id_status_updated_on=Date.now()
        await acad.save();
        return res.status(200).json({message:'ID Card Mark Created Successfully'});
    } catch (err){
        logger.error(`MarkGivenIDCard Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const toObjId = (id) =>
  id && mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : null;

const SearchAcademyAdmissionsWeb = async (req, res) => {
  try {
    logger.info("Search Academy Admissions Web Request Received");

    const result = await validateAdminRequest(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }

    // -----------------------------
    // DECRYPT PAYLOAD
    // -----------------------------
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

      // FILTERS:
      sports_id:sprt_id,
      session_id:ses_id,
      academy_id:acd_id,
      payment_type,
      gender,
      active,
      start_from,
      start_to,
      expiry_from,
      expiry_to
    } = decryptedData;
    const limit = 50;
    const sports_id = toObjId(sprt_id);
    const session_id = toObjId(ses_id);
    const academy_id = toObjId(acd_id);


    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const skip = (currentPage - 1) * limit;


    // -----------------------------
    // BASE FILTER
    // -----------------------------
    const filter = { delete: false };

    // ACTIVE FILTER
    if (active !== undefined) {
      filter.active = active;
    }

    // -----------------------------
    // APPLY SEARCH
    // -----------------------------
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");

      filter.$or = [
        { roll_no: regex },
        { name: regex },
        { father_name: regex },
        { phone: regex },
        { school_name: regex },
        { sports_name: regex },
        { academy_name: regex }
      ];
    }

    // -----------------------------
    // APPLY FILTERS
    // -----------------------------
    if (sports_id) filter.sports_id = sports_id;
    if (session_id) filter.session_id = session_id;
    if (academy_id) filter.academy_id = academy_id;
    if (payment_type) filter.payment_type = payment_type;
    if (gender) filter.gender = gender;

    // DATE RANGE FILTERS
    if (start_from || start_to) {
      filter.start_date = {};
      if (start_from) filter.start_date.$gte = new Date(start_from);
      if (start_to) filter.start_date.$lte = new Date(start_to);
    }

    if (expiry_from || expiry_to) {
      filter.expiry_date = {};
      if (expiry_from) filter.expiry_date.$gte = new Date(expiry_from);
      if (expiry_to) filter.expiry_date.$lte = new Date(expiry_to);
    }

    // -----------------------------
    // AGGREGATION PIPELINE
    // -----------------------------
    const regex = new RegExp(search || "", "i");

    const pipeline = [
      { $match: filter },

      // PRIORITY scoring
      {
        $addFields: {
          priority: {
            $cond: [
              { $regexMatch: { input: "$name", regex } }, 2,
              {
                $cond: [
                  { $regexMatch: { input: "$father_name", regex } }, 3,
                  {
                    $cond: [
                      { $regexMatch: { input: "$phone", regex } }, 4,
                      {
                        $cond: [
                          { $regexMatch: { input: "$roll_no", regex } }, 1,
                          {
                            $cond: [
                              { $regexMatch: { input: "$school_name", regex } }, 5,
                              {
                                $cond: [
                                  { $regexMatch: { input: "$sports_name", regex } }, 6,
                                  7
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },

      // POPULATE: session
      {
        $lookup: {
          from: "academysessions",
          localField: "session_id",
          foreignField: "_id",
          as: "session_id"
        }
      },
      { $unwind: { path: "$session_id", preserveNullAndEmptyArrays: true } },

      // POPULATE: sports
      {
        $lookup: {
          from: "academysports",
          localField: "sports_id",
          foreignField: "_id",
          as: "sports_id"
        }
      },
      { $unwind: { path: "$sports_id", preserveNullAndEmptyArrays: true } },

      // POPULATE: academy
      {
        $lookup: {
          from: "academies",
          localField: "academy_id",
          foreignField: "_id",
          as: "academy_id"
        }
      },
      { $unwind: { path: "$academy_id", preserveNullAndEmptyArrays: true } },

      // SORTING
      { $sort: { priority: 1, createdAt: -1 } },

      // PAGINATION
      { $skip: skip },
      { $limit: limit }
    ];

    // EXECUTE
    const data = await AcademyAdmissions.aggregate(pipeline);
    const total = await AcademyAdmissions.countDocuments(filter);

    for(const item of data){
      item.time_left_formatted = formatTimeLeft(item.time_left);
    }
    // return res.status(200).json({
    //   message: "Search & filtered results fetched",
    //   page,
    //   limit,
    //   total,
    //   totalPages: Math.ceil(total / limit),
    //   data: encryptData(data)
    // });

    return res.status(200).json({
      message: "Search & filtered results fetched",
      data: encryptData({
        admissions: data,
        pagination: {
          total: total,
          current_page: Number(currentPage),
          total_pages: Math.ceil(total / limit),
          per_page: limit,
        },
      }),
    });

  } catch (err) {
    console.log("              *")
    console.log("              *")
    console.log("              *")
    console.log("              *")
    console.log("              *")
    console.log(err)
    console.log("              *")
    console.log("              *")
    console.log("              *")
    console.log("              *")
    console.log("              *")

    logger.error(`Error searching Academy Admissions: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const SearchAcademyAdmissions = async (req, res) => {
  try {
    logger.info("Search Academy Admissions Request Received");

    const result = await validateAdminRequest(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }

    // -----------------------------
    // DECRYPT PAYLOAD
    // -----------------------------
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

      // FILTERS:
      sports_id,
      session_id,
      academy_id,
      payment_type,
      gender,
      active,
      start_from,
      start_to,
      expiry_from,
      expiry_to
    } = decryptedData;

    const limit = 10;
    const skip = (page - 1) * limit;

    // -----------------------------
    // BASE FILTER
    // -----------------------------
    const filter = { delete: false };

    // ACTIVE FILTER
    if (active !== undefined) {
      filter.active = active;
    }

    // -----------------------------
    // APPLY SEARCH
    // -----------------------------
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");

      filter.$or = [
        { roll_no: regex },
        { name: regex },
        { father_name: regex },
        { phone: regex },
        { school_name: regex },
        { sports_name: regex },
        { academy_name: regex }
      ];
    }

    // -----------------------------
    // APPLY FILTERS
    // -----------------------------
    if (sports_id) filter.sports_id = sports_id;
    if (session_id) filter.session_id = session_id;
    if (academy_id) filter.academy_id = academy_id;
    if (payment_type) filter.payment_type = payment_type;
    if (gender) filter.gender = gender;

    // DATE RANGE FILTERS
    if (start_from || start_to) {
      filter.start_date = {};
      if (start_from) filter.start_date.$gte = new Date(start_from);
      if (start_to) filter.start_date.$lte = new Date(start_to);
    }

    if (expiry_from || expiry_to) {
      filter.expiry_date = {};
      if (expiry_from) filter.expiry_date.$gte = new Date(expiry_from);
      if (expiry_to) filter.expiry_date.$lte = new Date(expiry_to);
    }

    // -----------------------------
    // AGGREGATION PIPELINE
    // -----------------------------
    const regex = new RegExp(search || "", "i");

    const pipeline = [
      { $match: filter },

      // PRIORITY scoring
      {
        $addFields: {
          priority: {
            $cond: [
              { $regexMatch: { input: "$name", regex } }, 2,
              {
                $cond: [
                  { $regexMatch: { input: "$father_name", regex } }, 3,
                  {
                    $cond: [
                      { $regexMatch: { input: "$phone", regex } }, 4,
                      {
                        $cond: [
                          { $regexMatch: { input: "$roll_no", regex } }, 1,
                          {
                            $cond: [
                              { $regexMatch: { input: "$school_name", regex } }, 5,
                              {
                                $cond: [
                                  { $regexMatch: { input: "$sports_name", regex } }, 6,
                                  7
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },

      // POPULATE: session
      {
        $lookup: {
          from: "academysessions",
          localField: "session_id",
          foreignField: "_id",
          as: "session"
        }
      },
      { $unwind: { path: "$session", preserveNullAndEmptyArrays: true } },

      // POPULATE: sports
      {
        $lookup: {
          from: "academysports",
          localField: "sports_id",
          foreignField: "_id",
          as: "sports"
        }
      },
      { $unwind: { path: "$sports", preserveNullAndEmptyArrays: true } },

      // POPULATE: academy
      {
        $lookup: {
          from: "academies",
          localField: "academy_id",
          foreignField: "_id",
          as: "academy"
        }
      },
      { $unwind: { path: "$academy", preserveNullAndEmptyArrays: true } },

      // SORTING
      { $sort: { priority: 1, createdAt: -1 } },

      // PAGINATION
      { $skip: skip },
      { $limit: limit }
    ];

    // EXECUTE
    const data = await AcademyAdmissions.aggregate(pipeline);
    const total = await AcademyAdmissions.countDocuments(filter);
    for(const item of data){
      item.time_left_formatted = formatTimeLeft(item.time_left);
    }
    return res.status(200).json({
      message: "Search & filtered results fetched",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: encryptData(data)
    });

  } catch (err) {
    logger.error(`Error searching Academy Admissions: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const GenerateReceipt = async (req, res) => {
    try{
        logger.info('Adding New Academy Admission Request Received');
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
        logger.info("User Verified Successfully");
        const {name,session_id,sports_id,academy_id,plan_id}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }
        const sport = await AcademySports.findById(sports_id);
        if(!sport){
            logger.error(`Sport Not Found With this ID : ${sports_id}`)
            return res.status(404).json({message:"Sport not found"})
        }

        const session = await AcademySessions.findById(session_id);
        if(!session){
            logger.error(`Session Not Found With this ID : ${session_id}`)
            return res.status(404).json({message:"Session not found"})
        }

        const plan = await AcademyPlans.findById(plan_id);
        if(!plan){
            logger.error(`Plan Not Found With this ID : ${plan_id}`)
            return res.status(404).json({message:"Plan not found"})
        }

        const adt = new AcademyAdmissions({

        })
        await adt.save()
        logger.info(`New Admission Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Admission Created Successfully'});
    } catch (err){
        logger.error(`AddAcademyPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const SendRenewalReminder = async (req, res) => {
    try{
        logger.info('Adding New Academy Admission Request Received');
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
        logger.info("User Verified Successfully");
        const {name,session_id,sports_id,academy_id,plan_id}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }
        const sport = await AcademySports.findById(sports_id);
        if(!sport){
            logger.error(`Sport Not Found With this ID : ${sports_id}`)
            return res.status(404).json({message:"Sport not found"})
        }

        const session = await AcademySessions.findById(session_id);
        if(!session){
            logger.error(`Session Not Found With this ID : ${session_id}`)
            return res.status(404).json({message:"Session not found"})
        }

        const plan = await AcademyPlans.findById(plan_id);
        if(!plan){
            logger.error(`Plan Not Found With this ID : ${plan_id}`)
            return res.status(404).json({message:"Plan not found"})
        }

        const adt = new AcademyAdmissions({

        })
        await adt.save()
        logger.info(`New Admission Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Admission Created Successfully'});
    } catch (err){
        logger.error(`AddAcademyPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const SendReceipt = async (req, res) => {
    try{
        logger.info('Adding New Academy Admission Request Received');
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
        logger.info("User Verified Successfully");
        const {name,session_id,sports_id,academy_id,plan_id}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }
        const sport = await AcademySports.findById(sports_id);
        if(!sport){
            logger.error(`Sport Not Found With this ID : ${sports_id}`)
            return res.status(404).json({message:"Sport not found"})
        }

        const session = await AcademySessions.findById(session_id);
        if(!session){
            logger.error(`Session Not Found With this ID : ${session_id}`)
            return res.status(404).json({message:"Session not found"})
        }

        const plan = await AcademyPlans.findById(plan_id);
        if(!plan){
            logger.error(`Plan Not Found With this ID : ${plan_id}`)
            return res.status(404).json({message:"Plan not found"})
        }

        const adt = new AcademyAdmissions({

        })
        await adt.save()
        logger.info(`New Admission Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Admission Created Successfully'});
    } catch (err){
        logger.error(`AddAcademyPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports = { AddAcademyAdmission,ViewSelectedAdmission,ViewAllAdmissions, ViewAdmissions,ViewAllAdmissionsWeb, ViewAdmissionsWeb,
    EditAdmission, DeleteAdmission, RenewAdmission, AddNewTransaction, GenerateIDCard,
    MarkCreatedIDCard, MarkGivenIDCard, GenerateReceipt, SendRenewalReminder, SendReceipt
,ViewInactiveAdmissions,ViewInactiveAdmissionsWeb, SearchAcademyAdmissions, SearchAcademyAdmissionsWeb }
