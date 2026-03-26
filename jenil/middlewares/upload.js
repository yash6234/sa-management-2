const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the directory exists in the root project
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'cms');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
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

// Middleware to standardize req.file.filename or req.files paths by prepending 'uploads/cms/'
// This ensures that when the controller saves it to the DB, the encryption middleware 
// will detect it as an image path and return an encrypted token to the frontend.
const { decryptImageUrl } = require('../utils/imageToken');

const standardizeFilePath = (req, res, next) => {
    const dbPrefix = 'uploads/cms/';

    // Helper to strip prefixes and decrypt tokens if necessary
    const cleanupPath = (val) => {
        if (typeof val !== 'string') return val;
        
        // 1. Strip common prefixes (/acade360/img/ or /acade360/)
        let clean = val.replace(/^\/?acade360\/img\//, '').replace(/^\/?acade360\//, '').replace(/^\//, '');

        // 2. If it's a token (contains a dot), try to decrypt it
        if (clean.includes('.')) {
            const decrypted = decryptImageUrl(clean);
            if (decrypted) {
                console.log(`[StandardizePath] Decrypted token and cleaned: ${val} -> ${decrypted}`);
                return decrypted;
            }
        }

        if (clean !== val) {
            console.log(`[StandardizePath] Cleaned path prefix: ${val} -> ${clean}`);
        }
        return clean;
    };

    // Helper to recursively process an object/array (for req.body)
    const processObject = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (typeof obj[i] === 'string') {
                    if (obj[i].includes('acade360') || obj[i].startsWith('uploads/')) {
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
                    // If it looks like a CMS path or a token, clean it
                    if (value.includes('acade360') || value.startsWith('uploads/')) {
                        obj[key] = cleanupPath(value);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    processObject(value);
                }
            }
        }
    };

    // 1. Process req.body (find any existing image URLs being sent back)
    processObject(req.body);

    // 2. Handle single file (upload.single)
    if (req.file) {
        let filename = req.file.filename;
        if (!filename.startsWith(dbPrefix)) {
            req.file.filename = dbPrefix + filename;
        }
    }

    // 3. Handle multiple files (upload.array or upload.fields)
    if (req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        files.forEach(file => {
            if (!file.filename.startsWith(dbPrefix)) {
                file.filename = dbPrefix + file.filename;
            }
        });
    }

    next();
};

module.exports = { upload, standardizeFilePath };
