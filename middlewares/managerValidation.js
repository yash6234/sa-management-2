// utils/validateAdminRequest.js
const jwt = require("jsonwebtoken");
const { decryptData, logger } = require("../utils/enc_dec_m");
const Hostel = require("../models/SportsAcademy");
const User = require("../models/Manager");

const validateManagerRequest = async (req, res) => {
    try {
        logger.info("Manager request validation started");

        const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        if (!hdt) {
            logger.warn("No Hostel found");
            return { error: true, status: 401, message: "No Hostel found" };
        }

        const now = Date.now();
        const expiryTime = new Date(hdt.expiry_at).getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

        if (hdt.active !== true || hdt.delete !== false) {
            logger.warn("Hostel is Inactive or Deleted");
            return {
                error: true,
                status: 500,
                message: "Hostel is Inactive or Deleted",
            };
        }

        if (now - expiryTime > threeDaysInMs) {
            logger.warn(`Hostel expired more than 3 days ago on ${hdt.expiry_at}`);
            return {
                error: true,
                status: 500,
                message: "Hostel is Expired",
            };
        } else if (now > expiryTime) {
            logger.warn(`Hostel expired within 3 days on ${hdt.expiry_at}`);
        } else if (expiryTime - now <= threeDaysInMs) {
            logger.info(`Hostel expiring soon on ${hdt.expiry_at}`);
        } else {
            logger.info("Hostel plan is valid");
        }

        // Decrypt incoming data
        let encryptedRaw = req.params.data || req.query.data || req.headers['x-manager-data'] || req.headers['x-encrypted-payload'];

        if (!encryptedRaw) {
            logger.warn("Missing manager validation data");
            return { error: true, status: 401, message: "Authentication data missing" };
        }

        let newData, decryptedData;
        try {
            // Fix URL encoding issues: Express converts '+' to ' ' in query/params
            const normalized = decodeURIComponent(encryptedRaw.trim()).replace(/ /g, '+');
            
            // Layer 1
            decryptedData = decryptData(normalized);
            
            if (!decryptedData) {
                throw new Error("First layer decryption returned null");
            }

            // Layer 2: Some requests wrap the inner token in a 'data' field, others don't.
            if (decryptedData.data && typeof decryptedData.data === 'string') {
                const normalizedInner = decodeURIComponent(decryptedData.data.trim()).replace(/ /g, '+');
                newData = decryptData(normalizedInner);
                if (!newData) throw new Error("Second layer decryption failed");
            } else {
                // If it's already the credential object, just use it
                newData = decryptedData;
            }

        } catch (error) {
            logger.error(`Decryption failed: ${error.message} for URL: ${req.originalUrl}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        const { token, id, mobile_no: mob_no, email } = newData;

        // Verify token
        let dt;
        try {
            dt = jwt.verify(token, process.env.MANAGER_JWT_SECRET);
        } catch (error) {
            logger.warn("Invalid or expired token");
            return { error: true, status: 401, message: "Unauthorized" };
        }

        const user = await User.findById(id);
        if (!user || !user.isVerified) {
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

        logger.info("Manager request validated successfully");

        return {
            error: false,
            user,
            hostel: hdt,
            managerData: newData,
        };

    } catch (err) {
        logger.error("Validation error: ", err);
        return { error: true, status: 500, message: "Server Error" };
    }
};

const validateManagerRequestPost = async (req, res) => {
    try {
        logger.info("Manager request validation started");

        const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        if (!hdt) {
            logger.warn("No Hostel found");
            return { error: true, status: 401, message: "No Hostel found" };
        }

        const now = Date.now();
        const expiryTime = new Date(hdt.expiry_at).getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

        if (hdt.active !== true || hdt.delete !== false) {
            logger.warn("Hostel is Inactive or Deleted");
            return {
                error: true,
                status: 500,
                message: "Hostel is Inactive or Deleted",
            };
        }

        if (now - expiryTime > threeDaysInMs) {
            logger.warn(`Hostel expired more than 3 days ago on ${hdt.expiry_at}`);
            return {
                error: true,
                status: 500,
                message: "Hostel is Expired",
            };
        } else if (now > expiryTime) {
            logger.warn(`Hostel expired within 3 days on ${hdt.expiry_at}`);
        } else if (expiryTime - now <= threeDaysInMs) {
            logger.info(`Hostel expiring soon on ${hdt.expiry_at}`);
        } else {
            logger.info("Hostel plan is valid");
        }

        // Decrypt incoming data
        let newData, decryptedData;

        try {
            decryptedData = req.body.data;
            if (!decryptedData) {
                throw new Error("Missing encrypted body data");
            }
        } catch (error) {
            logger.error(`Decryption failed1: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        try {
            const normalized = decodeURIComponent(decryptedData.toString().trim()).replace(/ /g, '+');
            const decrypted = decryptData(normalized);
            
            if (!decrypted) throw new Error("First layer decryption failed");

            // Handle optional inner wrapping
            if (decrypted.data && typeof decrypted.data === 'string') {
                const normalizedInner = decodeURIComponent(decrypted.data.trim()).replace(/ /g, '+');
                newData = decryptData(normalizedInner);
                if (!newData) throw new Error("Second layer decryption failed");
            } else {
                newData = decrypted;
            }

        } catch (error) {
            logger.error(`Decryption error in POST: ${error.message} for URL: ${req.originalUrl}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        const { token, id, mobile_no: mob_no, email } = newData;

        // Verify token
        let dt;
        try {
            dt = jwt.verify(token, process.env.MANAGER_JWT_SECRET);
        } catch (error) {
            logger.warn("Invalid or expired token");
            return { error: true, status: 401, message: "Unauthorized" };
        }

        const user = await User.findById(id);
        if (!user || !user.isVerified) {
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

        logger.info("Manager request validated successfully");

        return {
            error: false,
            user,
            hostel: hdt,
            managerData: newData,
        };

    } catch (err) {
        logger.error("Validation error: ", err);
        return { error: true, status: 500, message: "Server Error" };
    }
};


module.exports = {validateManagerRequest,validateManagerRequestPost};
// module.exports=validateAdminRequestPost;
