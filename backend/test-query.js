require('dotenv').config();
const { pool } = require('./db');

async function test() {
    try {
        const result = await pool.query(`
            SELECT p.id, p.title,
                   COALESCE(json_agg(json_build_object('id', ph.id, 'url', ph.photo_url) ORDER BY ph.id) FILTER (WHERE ph.id IS NOT NULL), '[]') as photos
            FROM projects p
            LEFT JOIN project_photos ph ON p.id = ph.project_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        console.log('OK:', result.rows.length, 'rows');
        if (result.rows[0]) console.log(JSON.stringify(result.rows[0]));
    } catch (e) {
        console.error('ERR:', e.message);
        console.error('DETAIL:', e.detail);
    }
    await pool.end();
}

test();
