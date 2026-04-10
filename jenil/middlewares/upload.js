const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to determine destination based on URL
const getDynamicDestination = (req) => {
    const url = req.originalUrl || req.url;
    // Strip prefix: /acade360/admin or /acade360
    const cleanUrl = url.replace(/^\/?acade360\/admin\//, '').replace(/^\/?acade360\//, '').replace(/^\//, '');
    const parts = cleanUrl.split('/').filter(Boolean);
    
    let subPath = 'general';
    if (parts.length >= 1) {
        // Exclude action verbs at the end
        const actions = new Set(['add', 'update', 'delete', 'upload', 'edit']);
        const last = parts[parts.length - 1].toLowerCase();
        const pathSegments = actions.has(last) ? parts.slice(0, -1) : parts;
        
        if (pathSegments.length > 0) {
            subPath = pathSegments.join('/');
        }
    }
    
    // Target is jenil/public/<subPath>
    const fullPath = path.join(__dirname, '..', 'public', subPath);
    
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    
    return { fullPath, subPath };
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { fullPath } = getDynamicDestination(req);
        cb(null, fullPath); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const { decryptImageUrl } = require('../utils/imageToken');

/**
 * Standardizes paths in req.body and req.files/file.
 * Now it uses path.join('public', subPath, filename) for internal DB storage.
 */
const standardizeFilePath = (req, res, next) => {
    let { subPath } = getDynamicDestination(req);
    
    // Override if req.body has pageName and sectionId (for generic adminPage routes)
    if (req.body && req.body.pageName && req.body.sectionId) {
        subPath = `${req.body.pageName}/${req.body.sectionId}`.toLowerCase();
    }
    
    const finalFullPath = path.join(__dirname, '..', 'public', subPath);
    if (!fs.existsSync(finalFullPath)) {
        fs.mkdirSync(finalFullPath, { recursive: true });
    }

    const dbPrefix = `public/${subPath}/`.replace(/\\/g, '/');

    const cleanupPath = (val) => {
        if (typeof val !== 'string') return val;

        let raw = val;
        try {
            if (/^https?:\/\//i.test(raw)) {
                const url = new URL(raw);
                raw = url.pathname || raw;
            }
        } catch { }
        
        let clean = raw.replace(/^\/?acade360\/img\//, '').replace(/^\/?acade360\//, '').replace(/^\//, '');

        if (/^[0-9a-f]{32}\./i.test(clean)) {
            const decrypted = decryptImageUrl(clean);
            if (decrypted) return decrypted;
        }

        return clean;
    };

    const processObject = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (typeof obj[i] === 'string') {
                    if (obj[i].includes('acade360') || obj[i].startsWith('public/') || obj[i].startsWith('uploads/')) {
                        obj[i] = cleanupPath(obj[i]);
                    }
                } else {
                    processObject(obj[i]);
                }
            }
        } else {
            for (const key in obj) {
                const value = obj[key];
                if (typeof value === 'string') {
                    if (value.includes('acade360') || value.startsWith('public/') || value.startsWith('uploads/')) {
                        obj[key] = cleanupPath(value);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    processObject(value);
                }
            }
        }
    };

    processObject(req.body);

    const relocateFile = (fileObj) => {
        const currentPath = fileObj.path;
        const newFilename = path.basename(currentPath);
        const newFullPath = path.join(finalFullPath, newFilename);
        
        // Only move if it's currently stored somewhere else
        if (currentPath !== newFullPath) {
            try {
                fs.renameSync(currentPath, newFullPath);
                fileObj.path = newFullPath;
                fileObj.destination = finalFullPath;
            } catch (err) {
                console.error(`[StandardizePath] Failed to move file to ${newFullPath}`, err);
            }
        }
        
        if (!newFilename.startsWith('public/')) {
            fileObj.filename = dbPrefix + newFilename;
        }
    };

    if (req.file) {
        relocateFile(req.file);
    }

    if (req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        files.forEach(file => relocateFile(file));
    }

    next();
};

module.exports = { upload, standardizeFilePath };
