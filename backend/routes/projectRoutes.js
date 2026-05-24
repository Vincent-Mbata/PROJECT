const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const upload = require('../middleware/upload');
const fs = require('fs').promises;
const path = require('path');

// Allowed values for validation
const ALLOWED_STATUSES = ['Ongoing', 'Completed', 'On Hold', 'Planning'];
const ALLOWED_CATEGORIES = ['Works', 'Equipment', 'Both Works and Equipment'];

/**
 * GET /api/projects
 * Retrieves all projects with their associated photos aggregated into an array.
 */
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT p.*,
                   COALESCE(json_agg(json_build_object('id', ph.id, 'url', ph.photo_url) ORDER BY ph.id) FILTER (WHERE ph.id IS NOT NULL), '[]') as photos,
                   (SELECT ph2.photo_url FROM project_photos ph2 WHERE ph2.project_id = p.id AND ph2.is_cover = TRUE LIMIT 1) as cover_photo
            FROM projects p
            LEFT JOIN project_photos ph ON p.id = ph.project_id
            GROUP BY p.id
            ORDER BY p.created_at DESC;
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Internal server error while fetching projects' });
    }
});

/**
 * POST /api/projects
 * Creates a new project and uploads associated photos.
 * Expects multipart/form-data.
 */
router.post('/', upload.array('photos', 10), async (req, res) => {
    const {
        title,
        description,
        contractor_name,
        budget,
        project_cost,
        cost_to_date,
        completion_percentage,
        status,
        sub_county,
        ward_area,
        project_type,
        category
    } = req.body;

    // Basic validation
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Project title is required' });
    }

    // Financial Constraints Validation
    const b = parseFloat(budget) || 0;
    const pc = parseFloat(project_cost) || 0;
    const ctd = parseFloat(cost_to_date) || 0;
    const cp = parseInt(completion_percentage) || 0;

    if (b < 0 || pc < 0 || ctd < 0) {
        return res.status(400).json({ error: 'Budget, Project Cost, and Cost to Date cannot be negative' });
    }
    if (pc > b) {
        return res.status(400).json({ error: 'Project Cost cannot be greater than Budget' });
    }
    if (ctd > pc) {
        return res.status(400).json({ error: 'Cost to Date cannot be greater than Project Cost' });
    }
    if (cp < 0 || cp > 100) {
        return res.status(400).json({ error: 'Completion percentage must be between 0 and 100' });
    }

    // Validate status
    const validatedStatus = status && ALLOWED_STATUSES.includes(status) ? status : 'Ongoing';

    // Validate category
    const validatedCategory = category && ALLOWED_CATEGORIES.includes(category) ? category : 'Works';

    // Sanitize text fields (trim and limit length)
    const sanitizedTitle = title.trim().substring(0, 255);
    const sanitizedDescription = description ? description.trim().substring(0, 5000) : null;
    const sanitizedContractor = contractor_name ? contractor_name.trim().substring(0, 255) : null;
    const sanitizedSubCounty = sub_county ? sub_county.trim().substring(0, 100) : null;
    const sanitizedWardArea = ward_area ? ward_area.trim().substring(0, 100) : null;
    const sanitizedProjectType = project_type ? project_type.trim().substring(0, 100) : null;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert Project
        const projectInsertQuery = `
            INSERT INTO projects (title, description, contractor_name, budget, project_cost, cost_to_date, completion_percentage, status, sub_county, ward_area, project_type, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;
        const projectValues = [
            sanitizedTitle,
            sanitizedDescription,
            sanitizedContractor,
            b,
            pc,
            ctd,
            cp,
            validatedStatus,
            sanitizedSubCounty,
            sanitizedWardArea,
            sanitizedProjectType,
            validatedCategory
        ];
        const projectRes = await client.query(projectInsertQuery, projectValues);
        const project = projectRes.rows[0];

        // 2. Insert Photos (first photo becomes cover by default)
        if (req.files && req.files.length > 0) {
            const photoInsertQuery = `
                INSERT INTO project_photos (project_id, photo_url, is_cover)
                VALUES ($1, $2, $3);
            `;

            req.files.forEach((file, idx) => {
                const photoUrl = `/uploads/${file.filename}`;
                const isCover = idx === 0 ? true : false;
                client.query(photoInsertQuery, [project.id, photoUrl, isCover]);
            });

            // Wait for all inserts to complete
            await client.query('SELECT 1'); // sync point
        }

        await client.query('COMMIT');

        // Fetch the project with photos to return the complete object
        const finalQuery = `
            SELECT p.*,
                   COALESCE(json_agg(json_build_object('id', ph.id, 'url', ph.photo_url) ORDER BY ph.id) FILTER (WHERE ph.id IS NOT NULL), '[]') as photos,
                   (SELECT ph2.photo_url FROM project_photos ph2 WHERE ph2.project_id = p.id AND ph2.is_cover = TRUE LIMIT 1) as cover_photo
            FROM projects p
            LEFT JOIN project_photos ph ON p.id = ph.project_id
            WHERE p.id = $1
            GROUP BY p.id;
        `;
        const finalRes = await pool.query(finalQuery, [project.id]);

        res.status(201).json(finalRes.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating project:', err.message);
        console.error('Error detail:', err.detail || 'none');
        console.error('Error hint:', err.hint || 'none');
        console.error('Error where:', err.where || 'none');
        res.status(500).json({ error: 'Internal server error while creating project', details: err.message });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/projects/:id
 * Updates project details and optionally adds new photos.
 */
router.put('/:id', upload.array('photos', 10), async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        contractor_name,
        budget,
        project_cost,
        cost_to_date,
        completion_percentage,
        status,
        sub_county,
        ward_area,
        project_type,
        category
    } = req.body;

    const b = parseFloat(budget) || 0;
    const pc = parseFloat(project_cost) || 0;
    const ctd = parseFloat(cost_to_date) || 0;
    const cp = parseInt(completion_percentage) || 0;

    if (b < 0 || pc < 0 || ctd < 0) {
        return res.status(400).json({ error: 'Financial values cannot be negative' });
    }
    if (pc > b) {
        return res.status(400).json({ error: 'Project Cost cannot be greater than Budget' });
    }
    if (ctd > pc) {
        return res.status(400).json({ error: 'Cost to Date cannot be greater than Project Cost' });
    }
    if (cp < 0 || cp > 100) {
        return res.status(400).json({ error: 'Completion percentage must be between 0 and 100' });
    }

    // Validate status
    const validatedStatus = status && ALLOWED_STATUSES.includes(status) ? status : null;

    // Validate category
    const validatedCategory = category && ALLOWED_CATEGORIES.includes(category) ? category : null;

    // Sanitize text fields
    const sanitizedTitle = title ? title.trim().substring(0, 255) : null;
    const sanitizedDescription = description ? description.trim().substring(0, 5000) : null;
    const sanitizedContractor = contractor_name ? contractor_name.trim().substring(0, 255) : null;
    const sanitizedSubCounty = sub_county ? sub_county.trim().substring(0, 100) : null;
    const sanitizedWardArea = ward_area ? ward_area.trim().substring(0, 100) : null;
    const sanitizedProjectType = project_type ? project_type.trim().substring(0, 100) : null;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateQuery = `
            UPDATE projects
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                contractor_name = COALESCE($3, contractor_name),
                budget = $4,
                project_cost = $5,
                cost_to_date = $6,
                completion_percentage = COALESCE($7, completion_percentage),
                status = COALESCE($8, status),
                sub_county = COALESCE($9, sub_county),
                ward_area = COALESCE($10, ward_area),
                project_type = COALESCE($11, project_type),
                category = COALESCE($12, category)
            WHERE id = $13
            RETURNING *;
        `;
        const updateValues = [
            sanitizedTitle, sanitizedDescription, sanitizedContractor, b, pc, ctd,
            cp, validatedStatus, sanitizedSubCounty, sanitizedWardArea, sanitizedProjectType, validatedCategory, id
        ];
        const updateRes = await client.query(updateQuery, updateValues);

        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }

        if (req.files && req.files.length > 0) {
            const photoInsertQuery = `INSERT INTO project_photos (project_id, photo_url) VALUES ($1, $2);`;
            for (const file of req.files) {
                const photoUrl = `/uploads/${file.filename}`;
                await client.query(photoInsertQuery, [id, photoUrl]);
            }
        }

        await client.query('COMMIT');

        // Return the updated project with photos (consistent with POST)
        const finalQuery = `
            SELECT p.*,
                   COALESCE(json_agg(json_build_object('id', ph.id, 'url', ph.photo_url) ORDER BY ph.id) FILTER (WHERE ph.id IS NOT NULL), '[]') as photos,
                   (SELECT ph2.photo_url FROM project_photos ph2 WHERE ph2.project_id = p.id AND ph2.is_cover = TRUE LIMIT 1) as cover_photo
            FROM projects p
            LEFT JOIN project_photos ph ON p.id = ph.project_id
            WHERE p.id = $1
            GROUP BY p.id;
        `;
        const finalRes = await pool.query(finalQuery, [id]);
        res.status(200).json(finalRes.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating project:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/projects/:id
 * Deletes a project and its associated photo files.
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find all photos to delete from filesystem
        const photoRes = await client.query('SELECT photo_url FROM project_photos WHERE project_id = $1', [id]);
        const photos = photoRes.rows;

        // 2. Delete files from storage BEFORE committing DB transaction
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const deletedFiles = [];
        for (const photo of photos) {
            const filePath = path.join(uploadsDir, photo.photo_url.replace('/uploads/', ''));
            try {
                await fs.unlink(filePath);
                deletedFiles.push(filePath);
            } catch (err) {
                // File may already be missing; log but don't fail the deletion
                console.warn(`Could not delete file ${filePath}:`, err.message);
            }
        }

        // 3. Delete project (Cascades to project_photos table)
        const deleteRes = await client.query('DELETE FROM projects WHERE id = $1', [id]);

        if (deleteRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting project:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/projects/:id/cover-photo
 * Sets a specific photo as the cover photo for a project.
 * Expects { photo_url: string } in the body.
 */
router.put('/:id/cover-photo', async (req, res) => {
    const { id } = req.params;
    const { photo_url } = req.body;

    if (!photo_url) {
        return res.status(400).json({ error: 'photo_url is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Unset all cover photos for this project
        await client.query('UPDATE project_photos SET is_cover = FALSE WHERE project_id = $1', [id]);

        // Set the selected photo as cover
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
        console.error('Error setting cover photo:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/projects/:id/photos/:photoId
 * Deletes a single photo from a project (DB record + filesystem).
 * If the deleted photo was the cover, clears cover_photo.
 */
router.delete('/:id/photos/:photoId', async (req, res) => {
    const { id, photoId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get the photo_url before deleting
        const photoRes = await client.query(
            'SELECT photo_url, is_cover FROM project_photos WHERE id = $1 AND project_id = $2',
            [photoId, id]
        );

        if (photoRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Photo not found' });
        }

        const { photo_url, is_cover } = photoRes.rows[0];

        // Delete from database
        await client.query('DELETE FROM project_photos WHERE id = $1 AND project_id = $2', [photoId, id]);

        // Delete file from filesystem
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadsDir, photo_url.replace('/uploads/', ''));
        try {
            await fs.unlink(filePath);
        } catch (fileErr) {
            console.warn(`Could not delete file ${filePath}:`, fileErr.message);
        }

        await client.query('COMMIT');
        res.status(200).json({
            message: 'Photo deleted successfully',
            deleted_url: photo_url,
            was_cover: is_cover
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting photo:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
