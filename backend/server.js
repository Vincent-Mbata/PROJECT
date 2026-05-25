const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security Middleware ---

// CORS: restrict to specific origins in production
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,                  // limit each IP to 1000 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,                   // stricter limit for uploads
    message: { error: 'Too many upload requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Routes ---
const projectRoutes = require('./routes/projectRoutes');
const handoverInspectionRoutes = require('./routes/handoverInspectionRoutes');
app.use('/api/projects', uploadLimiter, projectRoutes);
app.use('/api/projects', uploadLimiter, handoverInspectionRoutes);

// Basic root test route
app.get('/', (req, res) => {
    res.status(200).json({ message: "Project Indexer API Running" });
});

// --- Error Handler Middleware ---

// Multer-specific error handler
app.use((err, req, res, next) => {
    if (err instanceof require('multer').MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum file size is 20MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum 50 files allowed.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Unexpected file field. Use "photos" as the field name.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    // Generic error handler
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ error: 'Something broke on the server!', details: err.message });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Uploaded files served from: ${process.env.UPLOAD_PATH || './uploads'}`);
    console.log(`CORS origin: ${corsOptions.origin}`);
});
