const express = require('express');
const router = express.Router();
const { pool } = require('./../db');
const upload = require('../middleware/upload');
const fs = require('fs').promises;
const path = require('path');

// ============================================================
// SHARED: Get event photos for a project
// ============================================================
async function findEventPhotos(client, projectId) {
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
// SHARED: Attach photos to events
// ============================================================
function mapPhotosToEvents(events, photos, eventType) {
    return events.map(event => ({
        ...event,
        photos: photos
            .filter(p => p.event_type === eventType && p.event_id === event.id)
            .map(p => ({ id: p.id, url: p.photo_url }))
    }));
}

// ============================================================
// SHARED: Validate project exists and return category
// ============================================================
async function getProjectCategory(client, projectId) {
    const result = await client.query('SELECT category FROM projects WHERE id = $1', [projectId]);
    if (result.rows.length === 0) {
        return { error: 'Project not found', status: 404 };
    }
    return { category: result.rows[0].category };
}

// ============================================================
// SHARED: Delete event photo files from filesystem
// ============================================================
async function removePhotoFiles(client, eventType, eventId) {
    const photosRes = await client.query(
        'SELECT photo_url FROM event_photos WHERE event_type = $1 AND event_id = $2',
        [eventType, eventId]
    );
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    for (const photo of photosRes.rows) {
        const filePath = path.join(uploadsDir, photo.photo_url.replace('/uploads/', ''));
        try { await fs.unlink(filePath); } catch (e) { /* file may already be missing */ }
    }
}

// ============================================================
// GET /api/projects/:id/handover
// ============================================================
router.get('/:id/handover', async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const handoverRes = await client.query(
            'SELECT * FROM project_handovers WHERE project_id = $1', [id]
        );
        if (handoverRes.rows.length === 0) {
            return res.status(200).json(null);
        }
        const photos = await findEventPhotos(client, id);
        const handover = mapPhotosToEvents(handoverRes.rows, photos, 'handover')[0];
        res.status(200).json(handover);
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// POST /api/projects/:id/handover
// ============================================================
router.post('/:id/handover', upload.array('photos', 20), async (req, res, next) => {
    const { id } = req.params;
    const { handover_date, notes, metadata } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const project = await getProjectCategory(client, id);
        if (project.error) {
            await client.query('ROLLBACK');
            return res.status(project.status).json({ error: project.error });
        }
        if (project.category === 'Equipment') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Equipment projects do not have site handovers' });
        }

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
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/projects/:id/handover
// ============================================================
router.delete('/:id/handover', async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const handoverRes = await client.query(
            'SELECT id FROM project_handovers WHERE project_id = $1', [id]
        );
        if (handoverRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Handover not found' });
        }
        const handoverId = handoverRes.rows[0].id;

        await removePhotoFiles(client, 'handover', handoverId);
        await client.query('DELETE FROM event_photos WHERE event_type = $1 AND event_id = $2', ['handover', handoverId]);
        await client.query('DELETE FROM project_handovers WHERE id = $1', [handoverId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Handover deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// GET /api/projects/:id/inspections
// ============================================================
router.get('/:id/inspections', async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const inspectionsRes = await client.query(
            'SELECT * FROM project_inspections WHERE project_id = $1 ORDER BY inspection_number', [id]
        );
        if (inspectionsRes.rows.length === 0) {
            return res.status(200).json([]);
        }
        const photos = await findEventPhotos(client, id);
        const inspections = mapPhotosToEvents(inspectionsRes.rows, photos, 'inspection');
        res.status(200).json(inspections);
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// POST /api/projects/:id/inspections
// ============================================================
router.post('/:id/inspections', upload.array('photos', 20), async (req, res, next) => {
    const { id } = req.params;
    const { inspection_number, inspection_date, notes, metadata } = req.body;

    const inspectionNum = parseInt(inspection_number);
    if (isNaN(inspectionNum) || inspectionNum < 1 || inspectionNum > 4) {
        return res.status(400).json({ error: 'Inspection number must be between 1 and 4' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const project = await getProjectCategory(client, id);
        if (project.error) {
            await client.query('ROLLBACK');
            return res.status(project.status).json({ error: project.error });
        }
        if (project.category === 'Equipment') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Equipment projects do not have inspections' });
        }

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
            id, inspectionNum,
            inspection_date || new Date().toISOString().split('T')[0],
            notes || null,
            metadata ? JSON.stringify(metadata) : '{}'
        ]);

        const inspection = upsertRes.rows[0];

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
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/projects/:id/inspections/:inspectionNumber
// ============================================================
router.delete('/:id/inspections/:inspectionNumber', async (req, res, next) => {
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

        await removePhotoFiles(client, 'inspection', inspId);
        await client.query('DELETE FROM event_photos WHERE event_type = $1 AND event_id = $2', ['inspection', inspId]);
        await client.query('DELETE FROM project_inspections WHERE id = $1', [inspId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Inspection deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// GET /api/projects/:id/equipment-acceptance
// ============================================================
router.get('/:id/equipment-acceptance', async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const acceptanceRes = await client.query(
            'SELECT * FROM project_equipment_acceptances WHERE project_id = $1', [id]
        );
        if (acceptanceRes.rows.length === 0) {
            return res.status(200).json(null);
        }
        const photos = await findEventPhotos(client, id);
        const acceptance = mapPhotosToEvents(acceptanceRes.rows, photos, 'equipment_acceptance')[0];
        res.status(200).json(acceptance);
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// POST /api/projects/:id/equipment-acceptance
// ============================================================
router.post('/:id/equipment-acceptance', upload.array('photos', 20), async (req, res, next) => {
    const { id } = req.params;
    const { acceptance_date, decision, notes, metadata } = req.body;

    const validDecisions = ['accepted', 'rejected', 'pending'];
    const validatedDecision = validDecisions.includes(decision) ? decision : 'pending';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const project = await getProjectCategory(client, id);
        if (project.error) {
            await client.query('ROLLBACK');
            return res.status(project.status).json({ error: project.error });
        }
        if (project.category === 'Works') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Works projects do not have equipment acceptance' });
        }

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
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/projects/:id/equipment-acceptance
// ============================================================
router.delete('/:id/equipment-acceptance', async (req, res, next) => {
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

        await removePhotoFiles(client, 'equipment_acceptance', acceptanceId);
        await client.query('DELETE FROM event_photos WHERE event_type = $1 AND event_id = $2', ['equipment_acceptance', acceptanceId]);
        await client.query('DELETE FROM project_equipment_acceptances WHERE id = $1', [acceptanceId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Equipment acceptance deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/event-photos/:photoId
// ============================================================
router.delete('/event-photos/:photoId', async (req, res, next) => {
    const { photoId } = req.params;
    const client = await pool.connect();
    try {
        const photoRes = await client.query(
            'SELECT photo_url, event_type, event_id FROM event_photos WHERE id = $1', [photoId]
        );
        if (photoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const { photo_url, event_type, event_id } = photoRes.rows[0];
        await client.query('DELETE FROM event_photos WHERE id = $1', [photoId]);

        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadsDir, photo_url.replace('/uploads/', ''));
        try { await fs.unlink(filePath); } catch (e) { /* file may already be missing */ }

        res.status(200).json({ message: 'Event photo deleted successfully' });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

module.exports = router;
