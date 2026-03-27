const { decryptImageUrl } = require('../utils/imageToken');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ROOT_DIR = path.join(__dirname, '..', '..');

const MEDIA_MIME = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
};

const serveImage = (req, res, next) => {
    // 1. Recover the token from the request path
    // It could be either in req.params.token OR at the end of the path
    let token = req.params.token;
    if (!token) {
        const segments = req.path.split('/');
        token = segments[segments.length - 1];
    }

    if (!token) {
        return next ? next() : res.status(400).json({ success: false, error: 'Token missing' });
    }

    // 2. Decrypt it to a raw (unprefixed) path
    const realUrl = decryptImageUrl(token);
    if (!realUrl) {
        console.warn(`[ImageController] Failed to decrypt token: ${token.substring(0, 10)}... (likely double-encrypted or invalid)`);
        return next ? next() : res.status(400).json({ success: false, error: 'Invalid token' });
    }

    // 3. Normalize the decrypted URL into a local filesystem path
    let pathname = realUrl;
    try {
        if (realUrl.startsWith('http')) {
            pathname = new URL(realUrl).pathname;
        }
    } catch (e) { }

    const cleanPath = decodeURIComponent(pathname).split('?')[0];
    let relativePath = cleanPath.replace(/^\/+/, '');

    console.log(`[ImageController] Serving image -> Token: ${token.substring(0, 8)}... Result path: ${relativePath}`);

    // 1. Try ROOT_DIR + relativePath (for 'uploads/...')
    let localPath = path.join(ROOT_DIR, relativePath);
    if (fs.existsSync(localPath)) {
        return streamFile(localPath, res);
    }

    // 2. Try PUBLIC_DIR + relativePath (for static assets)
    // Strip 'public/' from the start if it exists
    if (relativePath.startsWith('public/')) {
        relativePath = relativePath.replace('public/', '');
    }
    localPath = path.join(PUBLIC_DIR, relativePath);
    if (fs.existsSync(localPath)) {
        return streamFile(localPath, res);
    }

    console.warn(`[ImageController] Resolved path does not exist: ${localPath} (Raw decrypted: ${realUrl})`);
    if (next) return next();
    res.status(404).json({ success: false, error: 'File not found' });
};

const streamFile = (filePath, res) => {
    const ext = path.extname(filePath).toLowerCase();
    // Use Cache-Control: no-cache to prevent "old image" issues while still allowing etags
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); 
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', MEDIA_MIME[ext] || 'application/octet-stream');
    const stats = fs.statSync(filePath);
    res.setHeader('Content-Length', stats.size);
    return fs.createReadStream(filePath).pipe(res);
}

module.exports = { serveImage };
