const {logger, decryptData, encryptData} = require("../utils/enc_dec_admin");
const {validateAdminRequest,validateAdminRequestPost} = require("../middlewares/adminValidation");
const Setting = require("../models/Setting");
const {formatTimeLeft} = require("../utils/formatTime");
const mongoose = require("mongoose");
const Academy = require("../models/Academy");
const AcademySports = require("../models/AcademySports");
const AcademySessions = require("../models/AcademySessions");
const AcademyPlans = require("../models/AcademyPlans");
const AcademyAdmissions = require("../models/AcademyAdmissions");
const {AddTransactionAdmin} = require("../utils/Trans_Fn");
const AcademyInventory = require("../models/AcademyInventory");
const InventoryAllotment = require("../models/InventoryAllotment");
const {generateDynamicReceipt} = require("../middlewares/receiptGenerator");
const path = require("path");
const fs = require("fs");

const FetchSettingData = async (req, res) => {
  try {
    logger.info("Fetch Settings Data Request Received");
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


    // ✅ 5. Send encrypted response
    return res.status(200).json({
      message: "Settings Data Fetched Successfully",
      data: encryptData(),
    });

  } catch (err) {
    logger.error(`Error fetching admissions: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

const EditSettingsData = async (req, res) => {
  try {
    logger.info("Fetch Settings Data Request Received");
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


    // ✅ 5. Send encrypted response
    return res.status(200).json({
      message: "Settings Data Fetched Successfully",
      data: encryptData(),
    });

  } catch (err) {
    logger.error(`Error fetching admissions: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

function renameUploadedFile(oldPath, fieldname) {
    if (!oldPath) return null;

    const uploadDir = "Logo";

    const ext = path.extname(oldPath);
    const newName = `${fieldname}${ext}`;
    const newPath = path.join(uploadDir, newName);

    try {
        fs.renameSync(path.join(uploadDir, oldPath), newPath);
        return newName;
    } catch (e) {
        console.log("Rename failed:", e);
        return oldPath;
    }
}

const ChangeLogo = async (req, res) => {
  try {
    logger.info('Change Logo Request Received');

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

    const logo_old = req.files?.logo?.[0]?.filename || null;


    const logo = logo_old ? renameUploadedFile(logo_old, "logo") : null;

    const sdt = await Setting.findOne({field:"logo"});
    if(!sdt){
        const dt = new Setting({
            field:"logo",value:logo,
        });
        await dt.save()
    }
    else {
        sdt.value = logo;
        await sdt.save();
    }
    return res.status(200).json({
        message:"Logo Changed Successfully"
    })

  } catch (err) {
    logger.error(`ChangeLogo Error : ${err.stack || err}`);
    return res.status(400).json({ message: "Server error" });
  }
};

module.exports = { FetchSettingData ,ChangeLogo,EditSettingsData};