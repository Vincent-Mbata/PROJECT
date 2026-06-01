require('dotenv').config();
const { pool } = require('./db');

async function test() {
    try {
        // Test the full query from the route
        const result = await pool.query(`
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
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        console.log('FULL QUERY OK:', result.rows.length, 'rows');
    } catch (e) {
        console.error('FULL QUERY ERR:', e.message);
        console.error('DETAIL:', e.detail);
        console.error('POSITION:', e.position);
    }
    await pool.end();
}

test();
