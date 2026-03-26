const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
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

// Middleware to standardize req.file.filename or req.files paths by prepending 'public/uploads/'
// This ensures that when the controller saves it to the DB, the encryption middleware 
// will detect it as an image path and return an encrypted token to the frontend.
const standardizeFilePath = (req, res, next) => {
    const prefix = 'public/uploads/';

    // Handle single file (upload.single)
    if (req.file) {
        if (!req.file.filename.startsWith(prefix)) {
            req.file.filename = prefix + req.file.filename;
        }
    }

    // Handle multiple files (upload.array or upload.fields)
    if (req.files) {
        if (Array.isArray(req.files)) {
            // upload.array
            req.files.forEach(file => {
                if (!file.filename.startsWith(prefix)) {
                    file.filename = prefix + file.filename;
                }
            });
        } else {
            // upload.fields
            Object.keys(req.files).forEach(fieldName => {
                req.files[fieldName].forEach(file => {
                    if (!file.filename.startsWith(prefix)) {
                        file.filename = prefix + file.filename;
                    }
                });
            });
        }
    }
    next();
};

module.exports = { upload, standardizeFilePath };
