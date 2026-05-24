const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Multer configuration for project photo uploads.
 * Files are stored locally in the backend/uploads directory.
 */

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Prepend timestamp to avoid filename collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit per file
        files: 50,                   // Max 50 files per request
        fieldSize: 1024 * 1024 * 1024 // 1GB total field size
    },
    fileFilter: (req, file, cb) => {
        // Only allow images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error(`File "${file.originalname}" is not an image. Only image files are allowed.`), false);
        }
    }
});

module.exports = upload;
