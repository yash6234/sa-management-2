const { 
    decryptData, 
    encryptData, 
    decryptDataCommon, 
    encryptDataCommon 
} = require('../utils/encryption');

const normalizeEncryptedPayload = (value) => {
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        return decodeURIComponent(trimmed).replace(/ /g, '+');
    } catch {
        return trimmed.replace(/ /g, '+');
    }
};

const isPlainObject = (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Helper to determine if we should use the Common key based on the route
const isCommonRoute = (req) => {
    const path = req.originalUrl || req.url;
    // If it's NOT an admin route, it's a common route
    // Note: This logic assumes admin routes are prefixed with /admin or /acade360/admin
    return !path.includes('/admin');
};

const getEncryptionFunctions = (req) => {
    if (isCommonRoute(req)) {
        return { decrypt: decryptDataCommon, encrypt: encryptDataCommon };
    }
    return { decrypt: decryptData, encrypt: encryptData };
};

const decryptPayload = (req, res, next) => {
    try {
        let encryptedData = null;

        if (req.body?.encrypted === true && req.body?.data) {
            encryptedData = normalizeEncryptedPayload(req.body.data);
        }
        else if (req.headers['x-encrypted-payload']) {
            encryptedData = normalizeEncryptedPayload(req.headers['x-encrypted-payload']);
        }
        else if (req.params?.data) {
            encryptedData = normalizeEncryptedPayload(req.params.data);
        }

        if (!encryptedData) {
            req.decryptedBody = req.body;
            return next();
        }

        const { decrypt } = getEncryptionFunctions(req);
        const decrypted = decrypt(encryptedData);

        if (!decrypted) {
            return res.status(400).json({
                success: false,
                message: 'Invalid encrypted data'
            });
        }

        req.decryptedBody = decrypted;
        const mergedBody = { ...(req.body || {}) };
        delete mergedBody.encrypted;
        delete mergedBody.data;
        req.body = isPlainObject(decrypted) ? { ...mergedBody, ...decrypted } : decrypted;

        next();
    } catch (error) {
        console.error('Decryption error:', error);
        return res.status(400).json({
            success: false,
            message: 'Failed to decrypt data'
        });
    }
};

const optionalDecryptPayload = (req, res, next) => {
    try {
        let encryptedData = null;

        if (req.body?.encrypted === true && req.body?.data) {
            encryptedData = normalizeEncryptedPayload(req.body.data);
        }
        else if (req.headers['x-encrypted-payload']) {
            encryptedData = normalizeEncryptedPayload(req.headers['x-encrypted-payload']);
        }
        else if (req.params?.data) {
            encryptedData = normalizeEncryptedPayload(req.params.data);
        }

        if (!encryptedData) {
            req.decryptedBody = req.body;
            return next();
        }

        const { decrypt } = getEncryptionFunctions(req);
        const decrypted = decrypt(encryptedData);

        if (!decrypted) {
            return res.status(400).json({
                success: false,
                message: 'Invalid encrypted data'
            });
        }

        req.decryptedBody = decrypted;
        const mergedBody = { ...(req.body || {}) };
        delete mergedBody.encrypted;
        delete mergedBody.data;
        req.body = isPlainObject(decrypted) ? { ...mergedBody, ...decrypted } : decrypted;

        next();
    } catch (error) {
        console.error('Decryption error:', error);
        return res.status(400).json({
            success: false,
            message: 'Failed to decrypt data'
        });
    }
};

const encryptResponse = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
        const forceEncrypt = req.headers['x-encrypt-response'] === 'true' || req.query?.encrypt === 'true';
        const skipEncrypt = req.headers['x-encrypt-response'] === 'false' ||
            req.query?.encrypt === 'false' ||
            req.query?.raw === 'true';

        if (data?.encrypted === true && data?.data) {
            return originalJson(data);
        }

        const shouldEncrypt = forceEncrypt || (!skipEncrypt && data && typeof data === 'object');

        if (shouldEncrypt) {
            const { encrypt } = getEncryptionFunctions(req);
            const encrypted = encrypt(data);
            if (encrypted) {
                res.setHeader('X-Encrypted-Response', 'true');
                return originalJson({
                    encrypted: true,
                    data: encrypted
                });
            }
        }

        return originalJson(data);
    };

    next();
};

const conditionalEncryptResponse = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
        const shouldEncrypt = req.headers['x-encrypt-response'] === 'true' ||
            req.query?.encrypt === 'true';

        if (shouldEncrypt && data && typeof data === 'object' && !(data?.encrypted === true)) {
            const { encrypt } = getEncryptionFunctions(req);
            const encrypted = encrypt(data);
            if (encrypted) {
                res.setHeader('X-Encrypted-Response', 'true');
                return originalJson({
                    encrypted: true,
                    data: encrypted
                });
            }
        }

        return originalJson(data);
    };

    next();
};

module.exports = {
    decryptPayload,
    optionalDecryptPayload,
    encryptResponse,
    conditionalEncryptResponse
};
