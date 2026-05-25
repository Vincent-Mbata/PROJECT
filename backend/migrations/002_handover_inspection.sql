-- Migration: Add handover, inspection, and equipment acceptance tables
-- Run this after the existing schema in init-db.sql

-- ============================================================
-- SITE HANDOVERS (one per project, for Works/Both categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_handovers (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    handover_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id)
);

-- ============================================================
-- INSPECTIONS (up to 4 per project, for Works/Both categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_inspections (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inspection_number INTEGER NOT NULL CHECK (inspection_number BETWEEN 1 AND 4),
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, inspection_number)
);

-- ============================================================
-- EQUIPMENT ACCEPTANCE (one per project, for Equipment/Both)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_equipment_acceptances (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    acceptance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('accepted', 'rejected', 'pending')) DEFAULT 'pending',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id)
);

-- ============================================================
-- EVENT PHOTOS (shared across all event types)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_photos (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('handover', 'inspection', 'equipment_acceptance')),
    event_id INTEGER NOT NULL,
    photo_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES for search/filter
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_handovers_project_id ON project_handovers(project_id);
CREATE INDEX IF NOT EXISTS idx_handovers_date ON project_handovers(handover_date);
CREATE INDEX IF NOT EXISTS idx_inspections_project_id ON project_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON project_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_number ON project_inspections(project_id, inspection_number);
CREATE INDEX IF NOT EXISTS idx_equipment_acceptances_project_id ON project_equipment_acceptances(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_acceptances_date ON project_equipment_acceptances(acceptance_date);
CREATE INDEX IF NOT EXISTS idx_equipment_acceptances_decision ON project_equipment_acceptances(decision);
CREATE INDEX IF NOT EXISTS idx_event_photos_event ON event_photos(event_type, event_id);

-- ============================================================
-- TRIGGER: auto-update updated_at on handover/inspection tables
-- ============================================================
DROP TRIGGER IF EXISTS update_handovers_updated_at ON project_handovers;
CREATE TRIGGER update_handovers_updated_at
    BEFORE UPDATE ON project_handovers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inspections_updated_at ON project_inspections;
CREATE TRIGGER update_inspections_updated_at
    BEFORE UPDATE ON project_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_acceptances_updated_at ON project_equipment_acceptances;
CREATE TRIGGER update_equipment_acceptances_updated_at
    BEFORE UPDATE ON project_equipment_acceptances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
