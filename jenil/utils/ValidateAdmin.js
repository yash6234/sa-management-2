// jenil/utils/ValidateAdmin.js
const jwt = require("jsonwebtoken");
const { decryptData, logger } = require("../../utils/enc_dec_admin");
const Hostel = require("../../models/SportsAcademy");
const User = require("../../models/Admin");

const validateAdminRequest = async (req, res) => {
    try {
        // logger.info("Admin request validation started (Jenil Module)");

        const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        if (!hdt) {
            logger.warn("No Academy found");
            return { error: true, status: 401, message: "No Academy found" };
        }

        const now = Date.now();
        const expiryTime =  new Date(hdt.expiry_at).getTime();
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

        // Decrypt incoming data from URL param, Query, Header, or already-decrypted body
        let encryptedRaw = req.params.data || req.query.data || req.headers['x-admin-data'] || req.headers['x-encrypted-payload'];

        // If global middleware already decrypted it, use that
        if (!encryptedRaw && req.decryptedBody && req.decryptedBody.data) {
            encryptedRaw = req.decryptedBody.data;
        }

        if (!encryptedRaw) {
            logger.warn("Missing admin validation data");
            return { error: true, status: 401, message: "Authentication data missing" };
        }

        const normalize = (val) => (typeof val === 'string' ? decodeURIComponent(val).replace(/ /g, '+') : val);

        let newData, decryptedData;
        try {
            decryptedData = decryptData(normalize(encryptedRaw));
            // In this application, the payload is often nested once: { data: "AES_ENCRYPTED_INNER_PAYLOAD" }
            newData = decryptData(normalize(decryptedData.data));
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return { error: true, status: 400, message: "Invalid data format or decryption secret mismatch" };
        }

        const { token, id, mobile_no: mob_no, email } = newData;

        // Verify JWT token
        let dt;
        try {
            dt = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        } catch (error) {
            logger.warn("Invalid or expired token");
            return { error: true, status: 401, message: "Unauthorized: Token expired or invalid" };
        }

        const user = await User.findById(id);
        if (!user || !user.isVerified || user.delete == true || user.active == false) {
            logger.warn("Unauthorized user or account disabled");
            return { error: true, status: 403, message: "Unauthorized access" };
        }

        const isIdValid = dt.id.toString() === user._id.toString() && user._id.toString() === id.toString();
        const isMobileValid = dt.mobile_no === user.mobile_no && user.mobile_no === mob_no;
        const isEmailValid = dt.email === user.email && user.email === email;

        if (!isIdValid || !isMobileValid || !isEmailValid) {
            logger.warn("Identity mismatch between token and database");
            return { error: true, status: 403, message: "Unauthorized identity" };
        }

        logger.info("Admin request validated successfully");

        return {
            error: false,
            user,
            academy: hdt,
            adminData: newData,
            data: decryptedData,
        };

    } catch (err) {
        logger.error("Validation error: ", err);
        return { error: true, status: 500, message: "Server Error" };
    }
};

const validateAdminRequestPost = async (req, res) => {
    try {
        logger.info("Admin request validation started (POST)");

        const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        if (!hdt) {
            logger.warn("No Academy found");
            return { error: true, status: 401, message: "No Academy found" };
        }

        // Expiry checks (Standard)
        const now = Date.now();
        const expiryTime = new Date(hdt.expiry_at).getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        if (hdt.active !== true || hdt.delete !== false) return { error: true, status: 500, message: "Academy Inactive" };
        if (now - expiryTime > threeDaysInMs) return { error: true, status: 500, message: "Academy Expired" };

        let newData, decryptedData;

        // For POST, we try to get data from the body, headers, or params
        try {
            const normalize = (val) => (typeof val === 'string' ? decodeURIComponent(val).replace(/ /g, '+') : val);
            
            // Check body, then headers, then decryptedBody (from global middleware)
            let rawPayload = req.body;
            let encryptedRaw = rawPayload.data || req.headers['x-admin-data'] || req.headers['x-encrypted-payload'];
            
            if (!encryptedRaw && req.decryptedBody && req.decryptedBody.data) {
                encryptedRaw = req.decryptedBody.data;
            }

            if (!encryptedRaw) {
                // Fallback to params
                if (req.params.data) {
                    return validateAdminRequest(req, res);
                }
                throw new Error("Missing data in request body or headers");
            }

            // Level 1: Decrypt outer payload
            decryptedData = decryptData(normalize(encryptedRaw));
            
            // Level 2: Decrypt inner data field
            const innerCipher = decryptedData.data || "";
            if (!innerCipher) throw new Error("Missing inner data in decrypted payload");
            newData1 = decryptData(normalize(innerCipher));
        } catch (error) {
            logger.error(`Decryption failed (POST): ${error.message}`);
            return { error: true, status: 400, message: `Invalid data: ${error.message}` };
        }

        const { token, id, mobile_no: mob_no, email } = newData1;

        let dt;
        try {
            dt = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        } catch (error) {
            logger.warn("Invalid or expired token");
            return { error: true, status: 401, message: "Unauthorized" };
        }

        const user = await User.findById(id);
        if (!user || !user.isVerified || user.delete == true || user.active == false) {
            return { error: true, status: 403, message: "Unauthorized access" };
        }

        logger.info("Admin (POST) validated successfully");

        return {
            error: false,
            user,
            hostel: hdt,
            adminData: newData1,
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
    req.hostel = result.hostel;
    req.adminData = result.adminData;
    next();
};

module.exports = { validateAdminRequest, validateAdminRequestPost, middlewareAdmin, middlewareAdminPost };
