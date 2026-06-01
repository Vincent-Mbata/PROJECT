const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const upload = require('../middleware/upload');
const fs = require('fs').promises;
const path = require('path');

const ALLOWED_STATUSES = ['Ongoing', 'Completed', 'On Hold', 'Planning'];
const ALLOWED_CATEGORIES = ['Works', 'Equipment', 'Both Works and Equipment'];

// ============================================================
// SHARED: Build the full project query with photos + events
// ============================================================
const PROJECT_FULL_QUERY = `
    SELECT p.*,
           COALESCE(json_agg(json_build_object('id', ph.id, 'url', ph.photo_url) ORDER BY ph.id) FILTER (WHERE ph.id IS NOT NULL), '[]') as photos,
           (SELECT ph2.photo_url FROM project_photos ph2 WHERE ph2.project_id = p.id AND ph2.is_cover = TRUE LIMIT 1) as cover_photo,
           (SELECT json_build_object(
               'id', h.id,
               'handover_date', h.handover_date,
               'has_photos', EXISTS(SELECT 1 FROM event_photos ep WHERE ep.event_type = 'handover' AND ep.event_id = h.id)
            ) FROM project_handovers h WHERE h.project_id = p.id LIMIT 1) as handover,
           (SELECT json_agg(json_build_object(
               'id', i.id,
               'inspection_number', i.inspection_number,
               'inspection_date', i.inspection_date,
               'has_photos', EXISTS(SELECT 1 FROM event_photos ep WHERE ep.event_type = 'inspection' AND ep.event_id = i.id)
            ) ORDER BY i.inspection_number) FROM project_inspections i WHERE i.project_id = p.id) as inspections,
           (SELECT json_build_object(
               'id', ea.id,
               'acceptance_date', ea.acceptance_date,
               'decision', ea.decision,
               'has_photos', EXISTS(SELECT 1 FROM event_photos ep WHERE ep.event_type = 'equipment_acceptance' AND ep.event_id = ea.id)
            ) FROM project_equipment_acceptances ea WHERE ea.project_id = p.id LIMIT 1) as equipment_acceptance
    FROM projects p
    LEFT JOIN project_photos ph ON p.id = ph.project_id
    WHERE p.id = $1
    GROUP BY p.id;
`;

// ============================================================
// SHARED: Sanitize and validate project input
// ============================================================
function sanitizeProjectInput(body) {
    const {
        title, description, contractor_name, budget, project_cost,
        cost_to_date, completion_percentage, status, sub_county,
        ward_area, project_type, category
    } = body;

    const b = parseFloat(budget) || 0;
    const pc = parseFloat(project_cost) || 0;
    const ctd = parseFloat(cost_to_date) || 0;
    const cp = parseInt(completion_percentage) || 0;

    const errors = [];
    if (b < 0 || pc < 0 || ctd < 0) {
        errors.push('Financial values cannot be negative');
    }
    if (pc > b) {
        errors.push('Project Cost cannot be greater than Budget');
    }
    if (ctd > pc) {
        errors.push('Cost to Date cannot be greater than Project Cost');
    }
    if (cp < 0 || cp > 100) {
        errors.push('Completion percentage must be between 0 and 100');
    }

    return {
        errors,
        sanitized: {
            title: title ? title.trim().substring(0, 255) : null,
            description: description ? description.trim().substring(0, 5000) : null,
            contractor_name: contractor_name ? contractor_name.trim().substring(0, 255) : null,
            budget: b,
            project_cost: pc,
            cost_to_date: ctd,
            completion_percentage: cp,
            status: status && ALLOWED_STATUSES.includes(status) ? status : null,
            sub_county: sub_county ? sub_county.trim().substring(0, 100) : null,
            ward_area: ward_area ? ward_area.trim().substring(0, 100) : null,
            project_type: project_type ? project_type.trim().substring(0, 100) : null,
            category: category && ALLOWED_CATEGORIES.includes(category) ? category : null,
        }
    };
}

// ============================================================
// ============================================================
// GET /api/projects
// ============================================================
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT p.*,
                   COALESCE(json_agg(json_build_object('id', ph.id, 'url', ph.photo_url) ORDER BY ph.id) FILTER (WHERE ph.id IS NOT NULL), '[]') as photos,
                   (SELECT ph2.photo_url FROM project_photos ph2 WHERE ph2.project_id = p.id AND ph2.is_cover = TRUE LIMIT 1) as cover_photo,
                   (SELECT json_build_object(
                       'id', h.id, 'handover_date', h.handover_date,
                       'has_photos', EXISTS(SELECT 1 FROM event_photos ep WHERE ep.event_type = 'handover' AND ep.event_id = h.id)
                    ) FROM project_handovers h WHERE h.project_id = p.id LIMIT 1) as handover,
                   (SELECT json_agg(json_build_object(
                       'id', i.id, 'inspection_number', i.inspection_number,
                       'inspection_date', i.inspection_date,
                       'has_photos', EXISTS(SELECT 1 FROM event_photos ep WHERE ep.event_type = 'inspection' AND ep.event_id = i.id)
                    ) ORDER BY i.inspection_number) FROM project_inspections i WHERE i.project_id = p.id) as inspections,
                   (SELECT json_build_object(
                       'id', ea.id, 'acceptance_date', ea.acceptance_date, 'decision', ea.decision,
                       'has_photos', EXISTS(SELECT 1 FROM event_photos ep WHERE ep.event_type = 'equipment_acceptance' AND ep.event_id = ea.id)
                    ) FROM project_equipment_acceptances ea WHERE ea.project_id = p.id LIMIT 1) as equipment_acceptance
            FROM projects p
            LEFT JOIN project_photos ph ON p.id = ph.project_id
            GROUP BY p.id
            ORDER BY p.created_at DESC;
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
});

// ============================================================
// POST /api/projects
// ============================================================
router.post('/', upload.array('photos', 50), async (req, res, next) => {
    const { errors, sanitized } = sanitizeProjectInput(req.body);

    if (!sanitized.title) {
        return res.status(400).json({ error: 'Project title is required' });
    }
    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0] });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const projectRes = await client.query(`
            INSERT INTO projects (title, description, contractor_name, budget, project_cost, cost_to_date, completion_percentage, status, sub_county, ward_area, project_type, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id;
        `, [
            sanitized.title, sanitized.description, sanitized.contractor_name,
            sanitized.budget, sanitized.project_cost, sanitized.cost_to_date,
            sanitized.completion_percentage,
            sanitized.status || 'Ongoing',
            sanitized.sub_county, sanitized.ward_area,
            sanitized.project_type, sanitized.category || 'Works'
        ]);

        const projectId = projectRes.rows[0].id;

        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const photoUrl = `/uploads/${req.files[i].filename}`;
                await client.query(
                    'INSERT INTO project_photos (project_id, photo_url, is_cover) VALUES ($1, $2, $3)',
                    [projectId, photoUrl, i === 0]
                );
            }
        }

        await client.query('COMMIT');

        const finalRes = await pool.query(PROJECT_FULL_QUERY, [projectId]);
        res.status(201).json(finalRes.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// PUT /api/projects/:id
// ============================================================
router.put('/:id', upload.array('photos', 50), async (req, res, next) => {
    const { id } = req.params;
    const { errors, sanitized } = sanitizeProjectInput(req.body);

    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0] });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateRes = await client.query(`
            UPDATE projects
            SET title = COALESCE($1, title), description = COALESCE($2, description),
                contractor_name = COALESCE($3, contractor_name), budget = $4,
                project_cost = $5, cost_to_date = $6,
                completion_percentage = COALESCE($7, completion_percentage),
                status = COALESCE($8, status), sub_county = COALESCE($9, sub_county),
                ward_area = COALESCE($10, ward_area), project_type = COALESCE($11, project_type),
                category = COALESCE($12, category)
            WHERE id = $13
            RETURNING *;
        `, [
            sanitized.title, sanitized.description, sanitized.contractor_name,
            sanitized.budget, sanitized.project_cost, sanitized.cost_to_date,
            sanitized.completion_percentage, sanitized.status,
            sanitized.sub_county, sanitized.ward_area,
            sanitized.project_type, sanitized.category, id
        ]);

        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const photoUrl = `/uploads/${file.filename}`;
                await client.query(
                    'INSERT INTO project_photos (project_id, photo_url) VALUES ($1, $2)',
                    [id, photoUrl]
                );
            }
        }

        await client.query('COMMIT');

        const finalRes = await pool.query(PROJECT_FULL_QUERY, [id]);
        res.status(200).json(finalRes.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/projects/:id
// ============================================================
router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const photoRes = await client.query(
            'SELECT photo_url FROM project_photos WHERE project_id = $1', [id]
        );

        const uploadsDir = path.join(__dirname, '..', 'uploads');
        for (const photo of photoRes.rows) {
            const filePath = path.join(uploadsDir, photo.photo_url.replace('/uploads/', ''));
            try { await fs.unlink(filePath); } catch (e) { /* file may already be missing */ }
        }

        const deleteRes = await client.query('DELETE FROM projects WHERE id = $1', [id]);
        if (deleteRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// PUT /api/projects/:id/cover-photo
// ============================================================
router.put('/:id/cover-photo', async (req, res, next) => {
    const { id } = req.params;
    const { photo_url } = req.body;

    if (!photo_url) {
        return res.status(400).json({ error: 'photo_url is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE project_photos SET is_cover = FALSE WHERE project_id = $1', [id]);
        const updateRes = await client.query(
            'UPDATE project_photos SET is_cover = TRUE WHERE project_id = $1 AND photo_url = $2',
            [id, photo_url]
        );
        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Photo not found for this project' });
        }
        await client.query('COMMIT');
        res.status(200).json({ message: 'Cover photo updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/projects/:id/photos/:photoId
// ============================================================
router.delete('/:id/photos/:photoId', async (req, res, next) => {
    const { id, photoId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const photoRes = await client.query(
            'SELECT photo_url, is_cover FROM project_photos WHERE id = $1 AND project_id = $2',
            [photoId, id]
        );
        if (photoRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Photo not found' });
        }

        const { photo_url, is_cover } = photoRes.rows[0];
        await client.query('DELETE FROM project_photos WHERE id = $1 AND project_id = $2', [photoId, id]);

        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadsDir, photo_url.replace('/uploads/', ''));
        try { await fs.unlink(filePath); } catch (e) { /* file may already be missing */ }

        await client.query('COMMIT');
        res.status(200).json({
            message: 'Photo deleted successfully',
            deleted_url: photo_url,
            was_cover: is_cover
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

module.exports = router;
