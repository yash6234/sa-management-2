const CryptoJS = require("crypto-js");
require('dotenv').config();

const decryptData = (encryptedData) => {
    try {
        if (!encryptedData) return null;
        const bytes = CryptoJS.AES.decrypt(encryptedData, process.env.ENCRYPTION_SECRET_COMMON);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) return null;
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption error:', error.message);
        return null;
    }
};

const encryptData = (data) => {
    try {
        if (!data) return null;
        return CryptoJS.AES.encrypt(
            JSON.stringify(data),
            process.env.ENCRYPTION_SECRET_COMMON
        ).toString();
    } catch (error) {
        console.error('Encryption error:', error.message);
        return null;
    }
};

module.exports = { decryptData, encryptData };