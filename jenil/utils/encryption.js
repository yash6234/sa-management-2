const CryptoJS = require("crypto-js");
require('dotenv').config();

// Generic helper
const decrypt = (encryptedData, secret) => {
    try {
        if (!encryptedData) return null;
        const bytes = CryptoJS.AES.decrypt(encryptedData, secret);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) return null;
        
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted; 
        }
    } catch (error) {
        console.error('Decryption error:', error.message);
        return null;
    }
};

const encrypt = (data, secret) => {
    try {
        if (!data) return null;
        return CryptoJS.AES.encrypt(
            JSON.stringify(data),
            secret
        ).toString();
    } catch (error) {
        console.error('Encryption error:', error.message);
        return null;
    }
};

// Admin specific (using ENCRYPTION_SECRET)
const decryptData = (encryptedData) => decrypt(encryptedData, process.env.ENCRYPTION_SECRET);
const encryptData = (data) => encrypt(data, process.env.ENCRYPTION_SECRET);

// Common/User specific (using ENCRYPTION_SECRET_COMMON)
const decryptDataCommon = (encryptedData) => decrypt(encryptedData, process.env.ENCRYPTION_SECRET_COMMON);
const encryptDataCommon = (data) => encrypt(data, process.env.ENCRYPTION_SECRET_COMMON);

module.exports = { 
    decryptData, 
    encryptData, 
    decryptDataCommon, 
    encryptDataCommon 
};