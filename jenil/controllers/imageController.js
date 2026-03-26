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
    const segments = req.path.split('/');
    const token = segments[segments.length - 1];

    if (!token) {
        return next ? next() : res.status(400).json({ success: false, error: 'Token missing' });
    }

    const realUrl = decryptImageUrl(token);
    if (!realUrl) {
        return next ? next() : res.status(400).json({ success: false, error: 'Invalid token' });
    }

    // Check if it's a local file path
    let pathname = realUrl;
    try {
        if (realUrl.startsWith('http')) {
            pathname = new URL(realUrl).pathname;
        }
    } catch (e) { }

    const cleanPath = decodeURIComponent(pathname).split('?')[0];
    let relativePath = cleanPath.replace(/^\/+/, '');

    console.log(`[ImageController] Token: ${token}, Decrypted path: ${realUrl}, Cleaned relative path: ${relativePath}`);

    // 1. Try ROOT_DIR + relativePath (for 'uploads/...')
    let localPath = path.join(ROOT_DIR, relativePath);
    if (fs.existsSync(localPath)) {
        console.log(`[ImageController] Found file at ROOT_DIR: ${localPath}`);
        return streamFile(localPath, res);
    }

    // 2. Try PUBLIC_DIR + relativePath (for static assets)
    // Strip 'public/' from the start if it exists
    if (relativePath.startsWith('public/')) {
        relativePath = relativePath.replace('public/', '');
    }
    localPath = path.join(PUBLIC_DIR, relativePath);
    if (fs.existsSync(localPath)) {
        console.log(`[ImageController] Found file at PUBLIC_DIR: ${localPath}`);
        return streamFile(localPath, res);
    }

    console.warn(`[ImageController] Resolved path does not exist: ${localPath} (Source token path: ${realUrl})`);
    if (next) return next();
    res.status(404).json({ success: false, error: 'File not found' });
};

const streamFile = (filePath, res) => {
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Content-Type', MEDIA_MIME[ext] || 'application/octet-stream');
    const stats = fs.statSync(filePath);
    res.setHeader('Content-Length', stats.size);
    return fs.createReadStream(filePath).pipe(res);
}

module.exports = { serveImage };
