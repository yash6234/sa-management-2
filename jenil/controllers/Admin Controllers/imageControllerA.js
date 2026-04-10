const { decryptImageUrl } = require('../../utils/imageToken');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

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
    let token = req.params.token;
    if (!token) {
        const segments = req.path.split('/');
        token = segments[segments.length - 1];
    }

    if (!token) {
        return next ? next() : res.status(400).json({ success: false, error: 'Token missing' });
    }

    const realUrl = decryptImageUrl(token);
    let relativePath;

    if (realUrl) {
        let pathname = realUrl;
        try {
            if (realUrl.startsWith('http')) {
                pathname = new URL(realUrl).pathname;
            }
        } catch (e) { }

        const cleanPath = decodeURIComponent(pathname).split('?')[0];
        relativePath = cleanPath.replace(/^\/+/, '');
    } else {
        const rawPath = decodeURIComponent(req.path).split('?')[0];
        relativePath = rawPath.replace(/^\/+/, '');
    }

    return resolveAndServe(relativePath, res, next);
};

const resolveAndServe = (relativePath, res, next) => {
    relativePath = relativePath.replace(/\\/g, '/');
    const candidates = [];

    // 1. Try as-is from ROOT_DIR
    candidates.push(path.join(ROOT_DIR, relativePath));

    // 2. Look for 'uploads/' anywhere in the path
    const uplIdx = relativePath.indexOf('uploads/');
    if (uplIdx >= 0) {
        const fromUploads = relativePath.substring(uplIdx);
        candidates.push(path.join(ROOT_DIR, fromUploads));
        candidates.push(path.join(ROOT_DIR, 'jenil', fromUploads));
    }

    // 3. Look for 'public/' anywhere in the path
    const pubIdx = relativePath.indexOf('public/');
    if (pubIdx >= 0) {
        const afterPublic = relativePath.substring(pubIdx + 7);
        candidates.push(path.join(PUBLIC_DIR, afterPublic));
        candidates.push(path.join(ROOT_DIR, 'public', afterPublic)); // if root public
    }

    // 4. Try stripping segments from the front one by one
    const segments = relativePath.split('/');
    if (segments.length > 1) {
        // Try the last two segments as a relative path from common root folders
        const lastTwo = segments.slice(-2).join('/');
        candidates.push(path.join(PUBLIC_DIR, lastTwo));
        candidates.push(path.join(ROOT_DIR, 'uploads', 'cms', segments[segments.length - 1]));
    }

    // 5. Try PUBLIC_DIR directly (strip leading 'public/' if present)
    let pubRelative = relativePath;
    if (pubRelative.startsWith('public/')) {
        pubRelative = pubRelative.replace('public/', '');
    }
    candidates.push(path.join(PUBLIC_DIR, pubRelative));

    // Try each candidate
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            try {
                const stats = fs.statSync(candidate);
                if (stats.isFile()) {
                    return streamFile(candidate, res);
                }
            } catch (err) {
                // Ignore stat errors and move to next candidate
            }
        }
    }

    console.warn(`[ImageController] File not found: ${relativePath}`);
    if (next) return next();
    res.status(404).json({ success: false, error: 'File not found' });
};

const streamFile = (filePath, res) => {
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); 
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', MEDIA_MIME[ext] || 'application/octet-stream');
    const stats = fs.statSync(filePath);
    res.setHeader('Content-Length', stats.size);
    const readStream = fs.createReadStream(filePath);
    readStream.on('error', (err) => {
        console.error(`[ImageController] Error streaming file ${filePath}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Error reading file' });
        }
    });
    return readStream.pipe(res);
}

module.exports = { serveImage };
