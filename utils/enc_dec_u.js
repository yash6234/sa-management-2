const fs = require('fs');
const forge = require('node-forge');
const CryptoJS = require("crypto-js");

const decryptData = (encryptedData) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, process.env.ENCRYPTION_SECRET_U);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

const encryptData = (data)=>{
  return CryptoJS.AES.encrypt(
    JSON.stringify(data),
    process.env.ENCRYPTION_SECRET_U
  ).toString();
}
const axios = require('axios');

// Optional: In-memory token store (or use Redis/DB for real production)
const usedTokens = new Set();

const verifyRecaptcha = async (token) => {
    try {
        // Reject empty or already-used tokens
        if (!token || usedTokens.has(token)) {
            return false;
        }

        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: token
                }
            }
        );

        const data = response.data;
        console.log("reCAPTCHA response:", data);

        if (data.success) {
            // Mark token as used (you can expire these later)
            usedTokens.add(token);
            return true;
        }

        return false;
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return false;
    }
};

const winston = require("winston");
require("winston-mongodb");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/auth.log" }),
    new winston.transports.MongoDB({
      level: "info",
      db: process.env.MONGO_URI,
      collection: "logs",
      tryReconnect: true,
      format: winston.format.metadata(), // stores metadata in Mongo
    })
  ]
});
module.exports = {decryptData,encryptData,logger,verifyRecaptcha}