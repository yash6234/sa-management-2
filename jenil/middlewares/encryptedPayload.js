const { decryptData, encryptData } = require('../utils/encryption');

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

/**
 * Middleware to decrypt payload from request body or header
 * Looks for encrypted data in:
 * 1. req.body.encrypted (if body has { encrypted: true, data: "..." })
 * 2. req.headers['x-encrypted-payload'] (encrypted string)
 * 3. req.params.data (legacy URL param)
 * Decrypted data is attached to req.decryptedBody
 */
const decryptPayload = (req, res, next) => {
    try {
        let encryptedData = null;

        // Check if body itself is encrypted wrapper: { encrypted: true, data: "..." }
        if (req.body?.encrypted === true && req.body?.data) {
            encryptedData = normalizeEncryptedPayload(req.body.data);
        }
        // Check header
        else if (req.headers['x-encrypted-payload']) {
            encryptedData = normalizeEncryptedPayload(req.headers['x-encrypted-payload']);
        }
        // Check legacy :data param (for backward compatibility)
        else if (req.params?.data) {
            encryptedData = normalizeEncryptedPayload(req.params.data);
        }

        if (!encryptedData) {
            // No encrypted data found, continue with regular body
            req.decryptedBody = req.body;
            return next();
        }

        const decrypted = decryptData(encryptedData);

        if (!decrypted) {
            return res.status(400).json({
                success: false,
                message: 'Invalid encrypted data'
            });
        }

        // Attach decrypted data to request
        req.decryptedBody = decrypted;

        // Merge with body for compatibility
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

/**
 * Optional variant - always tries to decrypt if data exists, otherwise passes through
 */
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

        const decrypted = decryptData(encryptedData);

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

/**
 * Middleware to encrypt response data
 * Wraps res.json to automatically encrypt responses
 * Can be controlled via:
 * - req.headers['x-encrypt-response']: 'true' to force encryption
 * - req.query.encrypt: 'true' to force encryption
 */
const encryptResponse = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
        // Check if encryption is requested
        const forceEncrypt = req.headers['x-encrypt-response'] === 'true' || req.query?.encrypt === 'true';

        // Skip encryption if explicitly disabled
        const skipEncrypt = req.headers['x-encrypt-response'] === 'false' ||
            req.query?.encrypt === 'false' ||
            req.query?.raw === 'true';

        // If already encrypted wrapper, pass through
        if (data?.encrypted === true && data?.data) {
            return originalJson(data);
        }

        // Encrypt if forced or if data is sensitive (no skip flag)
        const shouldEncrypt = forceEncrypt || (!skipEncrypt && data && typeof data === 'object');

        if (shouldEncrypt) {
            const encrypted = encryptData(data);
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

/**
 * Selective encryption middleware - only encrypts if explicitly requested
 */
const conditionalEncryptResponse = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
        const shouldEncrypt = req.headers['x-encrypt-response'] === 'true' ||
            req.query?.encrypt === 'true';

        if (shouldEncrypt && data && typeof data === 'object' && !(data?.encrypted === true)) {
            const encrypted = encryptData(data);
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
