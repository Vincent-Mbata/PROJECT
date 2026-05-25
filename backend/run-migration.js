require('dotenv').config();
const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function run() {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations/002_handover_inspection.sql'), 'utf8');
    const cleanSql = sql.replace(/--.*$/gm, '').replace(/\n\s*\n/g, '\n').trim();
    const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} statements\n`);
    
    const client = await pool.connect();
    let success = 0, skipped = 0, failed = 0;
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            await client.query(stmt);
            success++;
            console.log(`[${i+1}/${statements.length}] OK`);
        } catch (err) {
            if (err.code === '42P01' && stmt.includes('IF EXISTS')) {
                skipped++;
                console.log(`[${i+1}/${statements.length}] SKIP`);
            } else {
                failed++;
                console.error(`[${i+1}/${statements.length}] FAIL: ${err.code} ${err.message.substring(0, 100)}`);
            }
        }
    }
    
    console.log(`\nDone: ${success} ok, ${skipped} skipped, ${failed} failed`);
    
    const tables = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema='public' 
        AND table_name IN ('project_handovers', 'project_inspections', 'project_equipment_acceptances', 'event_photos')
    `);
    console.log('New tables:', tables.rows.map(r => r.table_name).join(', ') || 'NONE');
    
    client.release();
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
