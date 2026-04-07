// Test script to demonstrate image encryption
const crypto = require('crypto');
const path = require('path');

// Load the encryption key from .env
const rawKey = '12345678901234567890123456789012';
const KEY = crypto.createHash('sha256').update(rawKey).digest();

/**
 * Encrypt a real image URL into a short hex token
 */
const encryptImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;

    const iv = crypto.createHash('md5').update(url).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()]);

    const ext = path.extname(url);
    return iv.toString('hex') + '.' + encrypted.toString('hex') + ext;
};

/**
 * Decrypt a token back to the real image URL
 */
const decryptImageUrl = (token) => {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;

        const ivHex = parts[0];
        const encHex = parts[1];

        if (!/^[0-9a-f]{32}$/i.test(ivHex)) return null;
        if (!encHex || !/^[0-9a-f]+$/i.test(encHex)) return null;

        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (err) {
        console.error('Decryption error:', err.message);
        return null;
    }
};

// ─── Examples ────────────────────────────────────────

console.log('\n=== Image URL Encryption Demo ===\n');

const testUrls = [
    'public/home/join_img.webp',
    'uploads/users/avatar.jpg',
    'public/courses/cricket_banner.png',
];

testUrls.forEach(url => {
    const encrypted = encryptImageUrl(url);
    const decrypted = decryptImageUrl(encrypted);

    console.log(`Original:  ${url}`);
    console.log(`Encrypted: ${encrypted}`);
    console.log(`Decrypted: ${decrypted}`);
    console.log(`Match: ${url === decrypted ? '✓' : '✗'}`);
    console.log('---');
});

console.log('\n=== Usage in URL ===\n');
const imageUrl = 'public/home/join_img.webp';
const token = encryptImageUrl(imageUrl);
console.log(`Client requests: GET /acade360/img/${token}`);
console.log(`Server decrypts to: ${decryptImageUrl(token)}`);
console.log(`Then serves the file from disk.`);
