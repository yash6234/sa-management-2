// utils/validateAdminRequest.js
const jwt = require("jsonwebtoken");
const { decryptData, logger } = require("../utils/enc_dec_admin");
const Hostel = require("../models/SportsAcademy");
const User = require("../models/Admin");

const validateAdminRequest = async (req, res) => {
    try {
        logger.info("Admin request validation started");

        const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        if (!hdt) {
            logger.warn("No Academy found");
            return { error: true, status: 401, message: "No Academy found" };
        }

        const now = Date.now();
        const expiryTime = new Date(hdt.expiry_at).getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

        if (hdt.active !== true || hdt.delete !== false) {
            logger.warn("Academy is Inactive or Deleted");
            return {
                error: true,
                status: 500,
                message: "Academy is Inactive or Deleted",
            };
        }

        if (now - expiryTime > threeDaysInMs) {
            logger.warn(`Academy expired more than 3 days ago on ${hdt.expiry_at}`);
            return {
                error: true,
                status: 500,
                message: "Academy is Expired",
            };
        } else if (now > expiryTime) {
            logger.warn(`Academy expired within 3 days on ${hdt.expiry_at}`);
        } else if (expiryTime - now <= threeDaysInMs) {
            logger.info(`Academy expiring soon on ${hdt.expiry_at}`);
        } else {
            logger.info("Academy plan is valid");
        }

        // Decrypt incoming data
        let encryptedRaw = req.params.data || req.query.data || req.headers['x-admin-data'];

        if (!encryptedRaw) {
            logger.warn("Missing admin validation data");
            return { error: true, status: 401, message: "Authentication data missing" };
        }

        let newData, decryptedData;
        try {
            decryptedData = decryptData(encryptedRaw);
            newData = decryptData(decryptedData.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        const { token, id, mobile_no: mob_no, email } = newData;

        // Verify token
        let dt;
        try {
            dt = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        } catch (error) {
            logger.warn("Invalid or expired token");
            return { error: true, status: 401, message: "Unauthorized" };
        }

        const user = await User.findById(id);
        if (!user || !user.isVerified || user.delete==true || user.active==false) {
            logger.warn("Unauthorized user");
            return { error: true, status: 403, message: "Unauthorized" };
        }

        const isIdValid = dt.id.toString() === user._id.toString() && user._id.toString() === id.toString();
        const isMobileValid = dt.mobile_no === user.mobile_no && user.mobile_no === mob_no;
        const isEmailValid = dt.email === user.email && user.email === email;

        if (!isIdValid || !isMobileValid || !isEmailValid) {
            logger.warn("Unauthorized user");
            return { error: true, status: 403, message: "Unauthorized" };
        }

        logger.info("Admin request validated successfully");

        return {
            error: false,
            user,
            academy: hdt,
            adminData: newData,
            data:decryptedData,
        };

    } catch (err) {
        logger.error("Validation error: ", err);
        return { error: true, status: 500, message: "Server Error" };
    }
};

const validateAdminRequestPost = async (req, res) => {
    try {
        logger.info("Admin request validation started");

        const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        if (!hdt) {
            logger.warn("No Academy found");
            return { error: true, status: 401, message: "No Academy found" };
        }

        const now = Date.now();
        const expiryTime = new Date(hdt.expiry_at).getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

        if (hdt.active !== true || hdt.delete !== false) {
            logger.warn("Academy is Inactive or Deleted");
            return {
                error: true,
                status: 500,
                message: "Academy is Inactive or Deleted",
            };
        }

        if (now - expiryTime > threeDaysInMs) {
            logger.warn(`Academy expired more than 3 days ago on ${hdt.expiry_at}`);
            return {
                error: true,
                status: 500,
                message: "Academy is Expired",
            };
        } else if (now > expiryTime) {
            logger.warn(`Academy expired within 3 days on ${hdt.expiry_at}`);
        } else if (expiryTime - now <= threeDaysInMs) {
            logger.info(`Academy expiring soon on ${hdt.expiry_at}`);
        } else {
            logger.info("Academy plan is valid");
        }

        // Decrypt incoming data
        let newData, decryptedData;

        try {
            decryptedData = req.body;
        } catch (error) {
            logger.error(`Decryption failed1: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }
        try {
            const fixedCipher = decodeURIComponent(decryptedData.data);
            newData = decryptData(fixedCipher);
        } catch (error) {
            console.log(error)
            logger.error(`Decryption failed2: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        try {
            const fixedCipher = decodeURIComponent(newData.data);
            newData1 = decryptData(fixedCipher);

            // newData = decryptData(decryptedData.data);


        } catch (error) {
            console.log(error)
            logger.error(`Decryption failed2: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        const { token, id, mobile_no: mob_no, email } = newData1;

        // Verify token
        let dt;
        try {
            dt = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        } catch (error) {
            logger.warn("Invalid or expired token");
            return { error: true, status: 401, message: "Unauthorized" };
        }

        const user = await User.findById(id);
        if (!user || !user.isVerified || user.delete==true || user.active==false) {
            logger.warn("Unauthorized user");
            return { error: true, status: 403, message: "Unauthorized" };
        }

        const isIdValid = dt.id.toString() === user._id.toString() && user._id.toString() === id.toString();
        const isMobileValid = dt.mobile_no === user.mobile_no && user.mobile_no === mob_no;
        const isEmailValid = dt.email === user.email && user.email === email;

        if (!isIdValid || !isMobileValid || !isEmailValid) {
            logger.warn("Unauthorized user");
            return { error: true, status: 403, message: "Unauthorized" };
        }

        logger.info("Admin request validated successfully");

        return {
            error: false,
            user,
            hostel: hdt,
            adminData: newData,
        };

    } catch (err) {
        logger.error("Validation error: ", err);
        return { error: true, status: 500, message: "Server Error" };
    }
};


const middlewareAdmin = async (req, res, next) => {
    const result = await validateAdminRequest(req, res);
    if (result.error) {
        return res.status(result.status).json({ message: result.message });
    }
    req.admin = result.user;
    req.academy = result.academy;
    req.adminData = result.adminData;
    next();
};

const middlewareAdminPost = async (req, res, next) => {
    const result = await validateAdminRequestPost(req, res);
    if (result.error) {
        return res.status(result.status).json({ message: result.message });
    }
    req.admin = result.user;
    req.hostel = result.hostel; // Matches the naming in validateAdminRequestPost
    req.adminData = result.adminData;
    next();
};

module.exports = { validateAdminRequest, validateAdminRequestPost, middlewareAdmin, middlewareAdminPost };
