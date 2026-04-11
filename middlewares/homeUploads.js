const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

const uploadDir = "uploads/website/home";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename:    (_req, file,  cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits:     { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        allowed.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error("Unsupported file type: " + file.mimetype));
    },
});

module.exports = upload;