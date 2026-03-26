const crypto = require('crypto');
require('dotenv').config();

const KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';

/**
 * Encrypt a real image URL into a short hex token
 */
const encryptImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    const iv = crypto.randomBytes(16);
    const keyBuffer = KEY.length === 64 ? Buffer.from(KEY, 'hex') : Buffer.from(KEY);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    const encrypted = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()]);
    return iv.toString('hex') + '.' + encrypted.toString('hex');
};

/**
 * Decrypt a token back to the real image URL
 */
const decryptImageUrl = (token) => {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts.slice(1).join('.'), 'hex');
        const keyBuffer = KEY.length === 64 ? Buffer.from(KEY, 'hex') : Buffer.from(KEY);
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (err) {
        return null;
    }
};

module.exports = { encryptImageUrl, decryptImageUrl };
