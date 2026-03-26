// utils/validateAdminRequest.js
const jwt = require("jsonwebtoken");
const { decryptData, logger } = require("../utils/enc_dec_u");
const Hostel = require("../models/SportsAcademy");
const User = require("../models/Users");

const validateUserRequest = async (req, res) => {
    try {
        logger.info("User request validation started");

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
            decryptedData = decryptData(req.params.data);
            newData = decryptData(decryptedData.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        const { token, id, mobile_no: mob_no, email } = newData;

        // Verify token
        let dt;
        try {
            dt = jwt.verify(token, process.env.USER_JWT_SECRET);
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

        logger.info("User request validated successfully");

        return {
            error: false,
            user,
            hostel: hdt,
            userData: newData,
        };

    } catch (err) {
        logger.error("Validation error: ", err);
        return { error: true, status: 500, message: "Server Error" };
    }
};

const validateUserRequestPost = async (req, res) => {
    try {
        logger.info("User request validation started");

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
        console.log(req.body)
        try {
            decryptedData = req.body.data;
            console.log(decryptedData)

        } catch (error) {
            logger.error(`Decryption failed1: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }
        try {
            newData =decryptData(decryptedData);
            console.log(newData)

        } catch (error) {
            logger.error(`Decryption failed2: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data" };
        }

        const { token, id, mobile_no: mob_no, email } = newData;

        // Verify token
        let dt;
        try {
            dt = jwt.verify(token, process.env.USER_JWT_SECRET);
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

        logger.info("User request validated successfully");

        return {
            error: false,
            user,
            hostel: hdt,
            userData: newData,
        };

    } catch (err) {
        logger.error("Validation error: ", err);
        return { error: true, status: 500, message: "Server Error" };
    }
};


module.exports = {validateUserRequest,validateUserRequestPost};
// module.exports=validateAdminRequestPost;
