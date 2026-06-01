const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// --- CORS ---
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// --- Rate Limiting ---
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Too many upload requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(generalLimiter);

// --- Body Parsing ---
app.use(express.json({ limit: '1mb' }));

// --- Static Files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Request Timeout Middleware ---
const REQUEST_TIMEOUT_MS = 30000;
app.use((req, res, next) => {
    res.setTimeout(REQUEST_TIMEOUT_MS, () => {
        if (!res.headersSent) {
            res.status(408).json({ error: 'Request timeout' });
        }
    });
    next();
});

// --- Routes ---
const projectRoutes = require('./routes/projectRoutes');
const handoverInspectionRoutes = require('./routes/handoverInspectionRoutes');
app.use('/api/projects', uploadLimiter, projectRoutes);
app.use('/api/projects', uploadLimiter, handoverInspectionRoutes);

// --- Health Check Endpoints ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/detailed', async (req, res) => {
    const { pool } = require('./db');
    try {
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        const dbLatency = Date.now() - dbStart;
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: { status: 'connected', latencyMs: dbLatency },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        });
    } catch (err) {
        res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            database: { status: 'disconnected', error: err.message },
        });
    }
});

// --- Root ---
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Project Tracker API Running' });
});

// --- Multer Error Handler ---
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
    next(err);
});

// --- Generic Error Handler ---
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
        error: 'Internal server error',
        ...(isProduction ? {} : { details: err.message }),
    });
});

// --- 404 Handler ---
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// --- Graceful Shutdown ---
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Uploaded files served from: ${process.env.UPLOAD_PATH || './uploads'}`);
    console.log(`CORS origin: ${corsOptions.origin}`);
});

const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        const { pool } = require('./db');
        pool.end().then(() => {
            console.log('Database pool closed.');
            process.exit(0);
        });
    });
    // Force shutdown after 10s
    setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// --- Unhandled Rejections ---
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    gracefulShutdown('uncaughtException');
});
