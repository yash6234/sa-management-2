const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';

const encryptData = (data) => {
    try {
        return CryptoJS.AES.encrypt(
            JSON.stringify(data),
            SECRET_KEY
        ).toString();
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
};

const decryptData = (encryptedData) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
};

// Middleware to encrypt all JSON responses
const encryptionMiddleware = (req, res, next) => {
    // Store the original json method
    const originalJson = res.json.bind(res);

    // Override res.json to encrypt the data
    res.json = function(data) {
        // Check if the request wants encrypted data (via query param or header)
        const wantsEncrypted = req.query.encrypted !== 'false' && req.headers['x-encrypted'] !== 'false';

        if (wantsEncrypted && data && typeof data === 'object') {
            const encrypted = encryptData(data);
            if (encrypted) {
                // Set content type to indicate encrypted response
                res.setHeader('X-Encrypted-Response', 'true');
                return originalJson({
                    encrypted: true,
                    data: encrypted
                });
            }
        }

        // Fallback to normal JSON response
        return originalJson(data);
    };

    next();
};

// Wrapper function to encrypt controller responses
const encryptResponse = (data) => {
    const encrypted = encryptData(data);
    return {
        encrypted: true,
        data: encrypted
    };
};

module.exports = {
    encryptData,
    decryptData,
    encryptionMiddleware,
    encryptResponse
};
