const { encryptData, decryptData ,logger} = require("../utils/enc_dec_admin");
const {validateAdminRequest} = require("../middlewares/adminValidation");
const User = require("../models/Admin");
const path = require("path");
const fs = require("fs");
require('dotenv').config();

const ViewProfile = async (req, res) => {
    try{
        logger.info('View Profile Request Received From Admin');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = result.user;
        logger.info("User Verified Successfully");
        const udt = await User.findById(result.user._id).select('name mobile_no date_of_birth gender photo')
        return res.status(200).json({data:encryptData(udt),message:'USER_PROFILE_DATA_SENT_SUCCESSFULLY'})
    } catch (err){
        logger.error(`ViewProfile Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const EditProfile = async (req, res) => {
    try{
        logger.info('Edit Profile Request Received From Admin');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        let newData, decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
            newData = decryptData(decryptedData.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        logger.info("User Verified Successfully");
        const {name, mobile_no, date_of_birth, gender ,} = decryptedData;
        const id=result.user._id
        const files = req.files || {};

    // Folder where multer saved files
        const uploadPath = path.join(__dirname, '../uploads/profile_photos/');

        // Rename photo file if exists
        let photo = null;
        try {
          if (files.photo && files.photo[0]) {
            const oldPath = files.photo[0].path;
            const ext = path.extname(files.photo[0].originalname).toLowerCase();
            const newName = `${id.toString()}_photo${ext}`;
            const newPath = path.join(uploadPath, newName);

            fs.renameSync(oldPath, newPath);
            photo = newName;
          }
        } catch (err) {
          logger.warn(`Photo upload failed or skipped for ${id}: ${err.message}`);
        }




    } catch (err){
        logger.error(`EditProfile Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ChangePassword = async (req, res) => {
    try{
        logger.info('Change Password Request Received From Admin');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        let newData, decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
            newData = decryptData(decryptedData.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        const { token, id, mobile_no: mob_no, email } = newData;
        logger.info("User Verified Successfully");
    } catch (err){
        logger.error(`ChangePassword Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports ={ViewProfile,EditProfile,ChangePassword}