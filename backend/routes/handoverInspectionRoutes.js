const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const upload = require('../middleware/upload');
const fs = require('fs').promises;
const path = require('path');

// ============================================================
// HELPER: Get all event photos for a project
// ============================================================
async function getEventPhotos(client, projectId) {
    const photosRes = await client.query(`
        SELECT ep.id, ep.event_type, ep.event_id, ep.photo_url
        FROM event_photos ep
        WHERE ep.event_id IN (
            SELECT id FROM project_handovers WHERE project_id = $1
            UNION
            SELECT id FROM project_inspections WHERE project_id = $1
            UNION
            SELECT id FROM project_equipment_acceptances WHERE project_id = $1
        )
        ORDER BY ep.event_type, ep.event_id, ep.id
    `, [projectId]);
    return photosRes.rows;
}

// ============================================================
// HELPER: Attach photos to events
// ============================================================
function attachPhotosToEvents(events, photos, eventType) {
    return events.map(event => ({
        ...event,
        photos: photos
            .filter(p => p.event_type === eventType && p.event_id === event.id)
            .map(p => ({ id: p.id, url: p.photo_url }))
    }));
}

// ============================================================
// GET /api/projects/:id/handover
// Returns the site handover for a project (if exists)
// ============================================================
router.get('/:id/handover', async (req, res) => {
    const { id } = req.params;
    try {
        const handoverRes = await pool.query(
            'SELECT * FROM project_handovers WHERE project_id = $1',
            [id]
        );
        if (handoverRes.rows.length === 0) {
            return res.status(200).json(null);
        }
        const photos = await getEventPhotos(await pool.connect(), id);
        const handover = attachPhotosToEvents(handoverRes.rows, photos, 'handover')[0];
        res.status(200).json(handover);
    } catch (err) {
        console.error('Error fetching handover:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// POST /api/projects/:id/handover
// Creates or updates the site handover for a project
// ============================================================
router.post('/:id/handover', upload.array('photos', 20), async (req, res) => {
    const { id } = req.params;
    const { handover_date, notes, metadata } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if project exists and is Works/Both
        const projectRes = await client.query(
            'SELECT category FROM projects WHERE id = $1', [id]
        );
        if (projectRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }
        const category = projectRes.rows[0].category;
        if (category === 'Equipment') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Equipment projects do not have site handovers' });
        }

        // Upsert handover
        const upsertRes = await client.query(`
            INSERT INTO project_handovers (project_id, handover_date, notes, metadata)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (project_id)
            DO UPDATE SET
                handover_date = EXCLUDED.handover_date,
                notes = EXCLUDED.notes,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING *
        `, [
            id,
            handover_date || new Date().toISOString().split('T')[0],
            notes || null,
            metadata ? JSON.stringify(metadata) : '{}'
        ]);

        const handover = upsertRes.rows[0];

        // Insert new photos
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const photoUrl = `/uploads/${file.filename}`;
                await client.query(
                    'INSERT INTO event_photos (event_type, event_id, photo_url) VALUES ($1, $2, $3)',
                    ['handover', handover.id, photoUrl]
                );
            }
        }

        await client.query('COMMIT');

        // Return with photos
        const photosRes = await pool.query(
            'SELECT id, photo_url FROM event_photos WHERE event_type = $1 AND event_id = $2 ORDER BY id',
            ['handover', handover.id]
        );
        res.status(200).json({
            ...handover,
            photos: photosRes.rows.map(p => ({ id: p.id, url: p.photo_url }))
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving handover:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/projects/:id/handover
// Deletes the site handover and its photos
// ============================================================
router.delete('/:id/handover', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get handover id
        const handoverRes = await client.query(
            'SELECT id FROM project_handovers WHERE project_id = $1', [id]
        );
        if (handoverRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Handover not found' });
        }
        const handoverId = handoverRes.rows[0].id;

        // Delete photo files
        const photosRes = await client.query(
            'SELECT photo_url FROM event_photos WHERE event_type = $1 AND event_id = $2',
            ['handover', handoverId]
        );
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        for (const photo of photosRes.rows) {
            const filePath = path.join(uploadsDir, photo.photo_url.replace('/uploads/', ''));
            try { await fs.unlink(filePath); } catch (e) { /* ignore */ }
        }

        // Delete event photos (cascade would handle this if we had FK, but we use polymorphic)
        await client.query('DELETE FROM event_photos WHERE event_type = $1 AND event_id = $2', ['handover', handoverId]);

        // Delete handover
        await client.query('DELETE FROM project_handovers WHERE id = $1', [handoverId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Handover deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting handover:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ============================================================
// GET /api/projects/:id/inspections
// Returns all inspections for a project (up to 4)
// ============================================================
router.get('/:id/inspections', async (req, res) => {
    const { id } = req.params;
    try {
        const inspectionsRes = await pool.query(
            'SELECT * FROM project_inspections WHERE project_id = $1 ORDER BY inspection_number',
            [id]
        );
        if (inspectionsRes.rows.length === 0) {
            return res.status(200).json([]);
        }
        const photos = await getEventPhotos(await pool.connect(), id);
        const inspections = attachPhotosToEvents(inspectionsRes.rows, photos, 'inspection');
        res.status(200).json(inspections);
    } catch (err) {
        console.error('Error fetching inspections:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// POST /api/projects/:id/inspections
// Creates or updates an inspection for a project
// ============================================================
router.post('/:id/inspections', upload.array('photos', 20), async (req, res) => {
    const { id } = req.params;
    const { inspection_number, inspection_date, notes, metadata } = req.body;

    const inspNum = parseInt(inspection_number);
    if (isNaN(inspNum) || inspNum < 1 || inspNum > 4) {
        return res.status(400).json({ error: 'Inspection number must be between 1 and 4' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check project category
        const projectRes = await client.query(
            'SELECT category FROM projects WHERE id = $1', [id]
        );
        if (projectRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }
        const category = projectRes.rows[0].category;
        if (category === 'Equipment') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Equipment projects do not have inspections' });
        }

        // Upsert inspection
        const upsertRes = await client.query(`
            INSERT INTO project_inspections (project_id, inspection_number, inspection_date, notes, metadata)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (project_id, inspection_number)
            DO UPDATE SET
                inspection_date = EXCLUDED.inspection_date,
                notes = EXCLUDED.notes,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING *
        `, [
            id,
            inspNum,
            inspection_date || new Date().toISOString().split('T')[0],
            notes || null,
            metadata ? JSON.stringify(metadata) : '{}'
        ]);

        const inspection = upsertRes.rows[0];

        // Insert new photos
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const photoUrl = `/uploads/${file.filename}`;
                await client.query(
                    'INSERT INTO event_photos (event_type, event_id, photo_url) VALUES ($1, $2, $3)',
                    ['inspection', inspection.id, photoUrl]
                );
            }
        }

        await client.query('COMMIT');

        // Return with photos
        const photosRes = await pool.query(
            'SELECT id, photo_url FROM event_photos WHERE event_type = $1 AND event_id = $2 ORDER BY id',
            ['inspection', inspection.id]
        );
        res.status(200).json({
            ...inspection,
            photos: photosRes.rows.map(p => ({ id: p.id, url: p.photo_url }))
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving inspection:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/projects/:id/inspections/:inspectionNumber
// Deletes a specific inspection and its photos
// ============================================================
router.delete('/:id/inspections/:inspectionNumber', async (req, res) => {
    const { id, inspectionNumber } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const inspRes = await client.query(
            'SELECT id FROM project_inspections WHERE project_id = $1 AND inspection_number = $2',
            [id, inspectionNumber]
        );
        if (inspRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Inspection not found' });
        }
        const inspId = inspRes.rows[0].id;

        // Delete photo files
        const photosRes = await client.query(
            'SELECT photo_url FROM event_photos WHERE event_type = $1 AND event_id = $2',
            ['inspection', inspId]
        );
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        for (const photo of photosRes.rows) {
            const filePath = path.join(uploadsDir, photo.photo_url.replace('/uploads/', ''));
            try { await fs.unlink(filePath); } catch (e) { /* ignore */ }
        }

        await client.query('DELETE FROM event_photos WHERE event_type = $1 AND event_id = $2', ['inspection', inspId]);
        await client.query('DELETE FROM project_inspections WHERE id = $1', [inspId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Inspection deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting inspection:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ============================================================
// GET /api/projects/:id/equipment-acceptance
// Returns the equipment acceptance for a project (if exists)
// ============================================================
router.get('/:id/equipment-acceptance', async (req, res) => {
    const { id } = req.params;
    try {
        const acceptanceRes = await pool.query(
            'SELECT * FROM project_equipment_acceptances WHERE project_id = $1',
            [id]
        );
        if (acceptanceRes.rows.length === 0) {
            return res.status(200).json(null);
        }
        const photos = await getEventPhotos(await pool.connect(), id);
        const acceptance = attachPhotosToEvents(acceptanceRes.rows, photos, 'equipment_acceptance')[0];
        res.status(200).json(acceptance);
    } catch (err) {
        console.error('Error fetching equipment acceptance:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// POST /api/projects/:id/equipment-acceptance
// Creates or updates equipment acceptance for a project
// ============================================================
router.post('/:id/equipment-acceptance', upload.array('photos', 20), async (req, res) => {
    const { id } = req.params;
    const { acceptance_date, decision, notes, metadata } = req.body;

    const validDecisions = ['accepted', 'rejected', 'pending'];
    const validatedDecision = validDecisions.includes(decision) ? decision : 'pending';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check project category
        const projectRes = await client.query(
            'SELECT category FROM projects WHERE id = $1', [id]
        );
        if (projectRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }
        const category = projectRes.rows[0].category;
        if (category === 'Works') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Works projects do not have equipment acceptance' });
        }

        // Upsert acceptance
        const upsertRes = await client.query(`
            INSERT INTO project_equipment_acceptances (project_id, acceptance_date, decision, notes, metadata)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (project_id)
            DO UPDATE SET
                acceptance_date = EXCLUDED.acceptance_date,
                decision = EXCLUDED.decision,
                notes = EXCLUDED.notes,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING *
        `, [
            id,
            acceptance_date || new Date().toISOString().split('T')[0],
            validatedDecision,
            notes || null,
            metadata ? JSON.stringify(metadata) : '{}'
        ]);

        const acceptance = upsertRes.rows[0];

        // Insert new photos
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const photoUrl = `/uploads/${file.filename}`;
                await client.query(
                    'INSERT INTO event_photos (event_type, event_id, photo_url) VALUES ($1, $2, $3)',
                    ['equipment_acceptance', acceptance.id, photoUrl]
                );
            }
        }

        await client.query('COMMIT');

        // Return with photos
        const photosRes = await pool.query(
            'SELECT id, photo_url FROM event_photos WHERE event_type = $1 AND event_id = $2 ORDER BY id',
            ['equipment_acceptance', acceptance.id]
        );
        res.status(200).json({
            ...acceptance,
            photos: photosRes.rows.map(p => ({ id: p.id, url: p.photo_url }))
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving equipment acceptance:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/projects/:id/equipment-acceptance
// Deletes equipment acceptance and its photos
// ============================================================
router.delete('/:id/equipment-acceptance', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const acceptanceRes = await client.query(
            'SELECT id FROM project_equipment_acceptances WHERE project_id = $1', [id]
        );
        if (acceptanceRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Equipment acceptance not found' });
        }
        const acceptanceId = acceptanceRes.rows[0].id;

        // Delete photo files
        const photosRes = await client.query(
            'SELECT photo_url FROM event_photos WHERE event_type = $1 AND event_id = $2',
            ['equipment_acceptance', acceptanceId]
        );
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        for (const photo of photosRes.rows) {
            const filePath = path.join(uploadsDir, photo.photo_url.replace('/uploads/', ''));
            try { await fs.unlink(filePath); } catch (e) { /* ignore */ }
        }

        await client.query('DELETE FROM event_photos WHERE event_type = $1 AND event_id = $2', ['equipment_acceptance', acceptanceId]);
        await client.query('DELETE FROM project_equipment_acceptances WHERE id = $1', [acceptanceId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Equipment acceptance deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting equipment acceptance:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/event-photos/:photoId
// Deletes a single event photo (shared across all event types)
// ============================================================
router.delete('/event-photos/:photoId', async (req, res) => {
    const { photoId } = req.params;
    try {
        const photoRes = await pool.query(
            'SELECT photo_url FROM event_photos WHERE id = $1', [photoId]
        );
        if (photoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Delete file
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadsDir, photoRes.rows[0].photo_url.replace('/uploads/', ''));
        try { await fs.unlink(filePath); } catch (e) { /* ignore */ }

        await pool.query('DELETE FROM event_photos WHERE id = $1', [photoId]);
        res.status(200).json({ message: 'Photo deleted successfully' });
    } catch (err) {
        console.error('Error deleting event photo:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
