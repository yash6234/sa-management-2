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

    // 2. Try to decrypt it to a raw (unprefixed) path
    const realUrl = decryptImageUrl(token);

    // 3. Determine the relative path to serve
    //    - If decryption succeeded, use the decrypted URL
    //    - If decryption failed, fall back to the full request path as a plain file path
    let relativePath;

    if (realUrl) {
        // Decrypted successfully — normalize the URL
        let pathname = realUrl;
        try {
            if (realUrl.startsWith('http')) {
                pathname = new URL(realUrl).pathname;
            }
        } catch (e) { }

        const cleanPath = decodeURIComponent(pathname).split('?')[0];
        relativePath = cleanPath.replace(/^\/+/, '');
        console.log(`[ImageController] Serving decrypted image -> Token: ${token.substring(0, 8)}... Path: ${relativePath}`);
    } else {
        // Decryption failed — treat the full request path as a plain file path
        // e.g. /public/home/join_img.webp -> public/home/join_img.webp
        const rawPath = decodeURIComponent(req.path).split('?')[0];
        relativePath = rawPath.replace(/^\/+/, '');
        console.log(`[ImageController] Serving plain file path: ${relativePath}`);
    }

    // 4. Try to find and serve the file from known directories
    return resolveAndServe(relativePath, res, next);
};

const resolveAndServe = (relativePath, res, next) => {
    // Normalize backslashes
    relativePath = relativePath.replace(/\\/g, '/');

    // Build a list of candidate paths to try
    const candidates = [];

    // 1. Try as-is from ROOT_DIR
    candidates.push(path.join(ROOT_DIR, relativePath));

    // 2. If path contains 'public/', extract from 'public/' onwards and try ROOT_DIR
    //    e.g. "home/public/home/join_img.webp" -> "public/home/join_img.webp"
    const pubIdx = relativePath.indexOf('public/');
    if (pubIdx > 0) {
        const fromPublic = relativePath.substring(pubIdx); // "public/home/join_img.webp"
        candidates.push(path.join(ROOT_DIR, fromPublic));
        // Also try PUBLIC_DIR + path after 'public/'
        const afterPublic = fromPublic.replace('public/', ''); // "home/join_img.webp"
        candidates.push(path.join(PUBLIC_DIR, afterPublic));
    }

    // 3. If path contains 'uploads/', extract from 'uploads/' onwards and try ROOT_DIR
    const uplIdx = relativePath.indexOf('uploads/');
    if (uplIdx > 0) {
        candidates.push(path.join(ROOT_DIR, relativePath.substring(uplIdx)));
    }

    // 4. Try PUBLIC_DIR directly (strip 'public/' prefix if present)
    let pubRelative = relativePath;
    if (pubRelative.startsWith('public/')) {
        pubRelative = pubRelative.replace('public/', '');
    }
    candidates.push(path.join(PUBLIC_DIR, pubRelative));

    // Try each candidate
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return streamFile(candidate, res);
        }
    }

    console.warn(`[ImageController] File not found: ${relativePath}`);
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
