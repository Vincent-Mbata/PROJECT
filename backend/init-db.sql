-- Project Indexer Database Schema
-- Initialize tables for projects and project photos

-- Table: projects
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    contractor_name VARCHAR(255),
    budget DECIMAL(15,2) CHECK (budget >= 0),
    project_cost DECIMAL(15,2) CHECK (project_cost >= 0 AND project_cost <= budget),
    cost_to_date DECIMAL(15,2) CHECK (cost_to_date >= 0 AND cost_to_date <= project_cost),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    status VARCHAR(50) DEFAULT 'Ongoing' CHECK (status IN ('Ongoing', 'Completed', 'On Hold', 'Planning')),
    category VARCHAR(50) DEFAULT 'Works' CHECK (category IN ('Works', 'Equipment', 'Both Works and Equipment')),
    sub_county VARCHAR(100),
    ward_area VARCHAR(100),
    project_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: project_photos
CREATE TABLE IF NOT EXISTS project_photos (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_project_photos_project_id ON project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_ward_area ON projects(ward_area);
CREATE INDEX IF NOT EXISTS idx_projects_sub_county ON projects(sub_county);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);

-- Trigger to auto-update updated_at on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
