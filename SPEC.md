# Project Indexer & Portfolio Application Specification

## 1. Project Overview
- **Project Name:** Project Indexer
- **Type:** Full-stack web application (SPA)
- **Core Functionality:** Upload project photos with rich metadata, catalog by sub-counties and ward areas, categorize by work type, filter by geographic area, status, or category without page reloads. Select a cover photo for each project. Track site handovers, inspections, and equipment acceptance.
- **Target Users:** Project managers, contractors, portfolio administrators

## 2. Technology Stack
- **Frontend:** React 19 + Vite
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL
- **File Storage:** Local filesystem (backend/uploads/)
- **HTTP Client:** Axios

## 3. Database Schema

### Table: projects
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| contractor_name | VARCHAR(255) | |
| budget | DECIMAL(15,2) | CHECK (budget >= 0) |
| project_cost | DECIMAL(15,2) | CHECK (project_cost >= 0 AND project_cost <= budget) |
| cost_to_date | DECIMAL(15,2) | CHECK (cost_to_date >= 0 AND cost_to_date <= project_cost) |
| completion_percentage | INTEGER | DEFAULT 0, CHECK (0..100) |
| status | VARCHAR(50) | DEFAULT 'Ongoing' (Ongoing, Completed, On Hold, Planning) |
| category | VARCHAR(50) | DEFAULT 'Works' (Works, Equipment, Both Works and Equipment) |
| sub_county | VARCHAR(100) | |
| ward_area | VARCHAR(100) | |
| project_type | VARCHAR(100) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### Table: project_photos
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| project_id | INTEGER | REFERENCES projects(id) ON DELETE CASCADE |
| photo_url | TEXT | NOT NULL |
| is_cover | BOOLEAN | DEFAULT FALSE |
| uploaded_at | TIMESTAMP | DEFAULT NOW() |

### Table: project_handovers
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) ON DELETE CASCADE, UNIQUE |
| handover_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| notes | TEXT | |
| metadata | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

** Business rule:** One handover per project. Only for Works or Both categories. Records initial site condition with photos.

### Table: project_inspections
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) ON DELETE CASCADE |
| inspection_number | INTEGER | NOT NULL, CHECK (1..4) |
| inspection_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| notes | TEXT | |
| metadata | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

**Business rule:** Up to 4 inspections per project (numbered 1-4). Only for Works or Both categories. Each records progress photos and notes.

### Table: project_equipment_acceptances
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) ON DELETE CASCADE, UNIQUE |
| acceptance_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| decision | VARCHAR(20) | NOT NULL, CHECK (accepted/rejected/pending), DEFAULT 'pending' |
| notes | TEXT | |
| metadata | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

**Business rule:** One acceptance per project. Only for Equipment or Both categories. Decision is accepted, rejected, or pending.

### Table: event_photos
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| event_type | VARCHAR(30) | NOT NULL, CHECK (handover/inspection/equipment_acceptance) |
| event_id | INTEGER | NOT NULL |
| photo_url | TEXT | NOT NULL |
| uploaded_at | TIMESTAMP | DEFAULT NOW() |

**Business rule:** Polymorphic table storing photos for any event type. Linked by event_type + event_id.

### Indexes
- `idx_project_photos_project_id` on `project_photos(project_id)`
- `idx_projects_ward_area` on `projects(ward_area)`
- `idx_projects_sub_county` on `projects(sub_county)`
- `idx_projects_status` on `projects(status)`
- `idx_projects_project_type` on `projects(project_type)`
- `idx_handovers_project_id` on `project_handovers(project_id)`
- `idx_handovers_date` on `project_handovers(handover_date)`
- `idx_inspections_project_id` on `project_inspections(project_id)`
- `idx_inspections_date` on `project_inspections(inspection_date)`
- `idx_inspections_number` on `project_inspections(project_id, inspection_number)`
- `idx_equipment_acceptances_project_id` on `project_equipment_acceptances(project_id)`
- `idx_equipment_acceptances_date` on `project_equipment_acceptances(acceptance_date)`
- `idx_equipment_acceptances_decision` on `project_equipment_acceptances(decision)`
- `idx_event_photos_event` on `event_photos(event_type, event_id)`

### Triggers
- `update_projects_updated_at` — auto-updates `updated_at` on projects
- `update_handovers_updated_at` — auto-updates `updated_at` on project_handovers
- `update_inspections_updated_at` — auto-updates `updated_at` on project_inspections
- `update_equipment_acceptances_updated_at` — auto-updates `updated_at` on project_equipment_acceptances

### Workflow Rules by Category
| Category | Site Handover | Inspections (max 4) | Equipment Acceptance |
|----------|--------------|---------------------|---------------------|
| Works | Yes (1) | Yes (up to 4) | No |
| Equipment | No | No | Yes (1) |
| Both | Yes (1) | Yes (up to 4) | Yes (1) |

## 4. API Endpoints

### Projects CRUD

#### GET /api/projects
- **Description:** Returns all projects with photos, cover photo, and handover/inspection/acceptance summary
- **Response:** Array of project objects, each containing:
  - `photos` — ordered array of `{id, url}` objects
  - `cover_photo` — URL of the cover photo, or `null`
  - `handover` — `{id, handover_date, has_photos}` or `null`
  - `inspections` — array of `{id, inspection_number, inspection_date, has_photos}` or `[]`
  - `equipment_acceptance` — `{id, acceptance_date, decision, has_photos}` or `null`

#### POST /api/projects
- **Content-Type:** multipart/form-data
- **Fields:** title (req), description, contractor_name, budget, project_cost, cost_to_date, completion_percentage, status, category, sub_county, ward_area, project_type, photos (up to 50, 20MB each)
- **Response:** Created project object with photos and cover_photo

#### PUT /api/projects/:id
- **Content-Type:** multipart/form-data
- **Description:** Updates project metadata and appends new photos
- **Validation:** Budget ≥ Project Cost ≥ Cost to Date ≥ 0
- **Response:** Updated project object

#### DELETE /api/projects/:id
- **Description:** Permanently deletes project and all associated photo files
- **Response:** Success message

#### PUT /api/projects/:id/cover-photo
- **Content-Type:** application/json
- **Body:** `{ "photo_url": "/uploads/filename.jpg" }`
- **Description:** Sets cover photo. Unsets all other photos as cover.
- **Response:** Success message

#### DELETE /api/projects/:id/photos/:photoId
- **Description:** Deletes a single photo. If it was the cover, clears cover.
- **Response:** `{ message, deleted_url, was_cover }`

### Handover Endpoints

#### GET /api/projects/:id/handover
- **Description:** Returns the site handover for a project (if exists)
- **Response:** `{ id, project_id, handover_date, notes, metadata, photos: [{id, url}] }` or `null`
- **Error 400:** Equipment projects do not have site handovers

#### POST /api/projects/:id/handover
- **Content-Type:** multipart/form-data
- **Fields:** handover_date, notes, metadata (JSON), photos (files)
- **Description:** Creates or updates the site handover. First handover records initial site photos.
- **Response:** Handover object with photos

#### DELETE /api/projects/:id/handover
- **Description:** Deletes handover and all associated event photos (files + DB records)
- **Response:** Success message

### Inspection Endpoints

#### GET /api/projects/:id/inspections
- **Description:** Returns all inspections for a project (up to 4)
- **Response:** Array of `{ id, project_id, inspection_number, inspection_date, notes, metadata, photos: [{id, url}] }`

#### POST /api/projects/:id/inspections
- **Content-Type:** multipart/form-data
- **Fields:** inspection_number (1-4), inspection_date, notes, metadata (JSON), photos (files)
- **Description:** Creates or updates a specific inspection. Each records progress photos.
- **Validation:** inspection_number must be 1-4
- **Response:** Inspection object with photos

#### DELETE /api/projects/:id/inspections/:inspectionNumber
- **Description:** Deletes a specific inspection and its photos
- **Response:** Success message

### Equipment Acceptance Endpoints

#### GET /api/projects/:id/equipment-acceptance
- **Description:** Returns the equipment acceptance for a project (if exists)
- **Response:** `{ id, project_id, acceptance_date, decision, notes, metadata, photos: [{id, url}] }` or `null`
- **Error 400:** Works projects do not have equipment acceptance

#### POST /api/projects/:id/equipment-acceptance
- **Content-Type:** multipart/form-data
- **Fields:** acceptance_date, decision (accepted/rejected/pending), notes, metadata (JSON), photos (files)
- **Description:** Creates or updates equipment acceptance with inspection decision
- **Response:** Acceptance object with photos

#### DELETE /api/projects/:id/equipment-acceptance
- **Description:** Deletes acceptance and all associated photos
- **Response:** Success message

### Event Photos

#### DELETE /api/event-photos/:photoId
- **Description:** Deletes a single event photo (works for handover, inspection, or acceptance photos)
- **Response:** Success message

## 5. UI/UX Specification

### Layout Structure
- **Header:** Fixed top bar with app title and "Add Project" button.
- **Filter Bar:** Horizontal controls for Search, Sub-County, Ward Area, Category, Status, and Type.
- **Content Area:** Projects grouped by Sub-County, each sub-group containing a responsive grid of project cards.
- **Modals:** Add/Edit project form overlay, Project Detail overlay with tabbed interface.

### Visual Design
- **Color Palette:** Deep Charcoal (#0d1117), Surface (#161b22), Primary Blue (#58a6ff), Success Green (#3fb950), Warning Amber (#d29922), Danger Red (#f85149).
- **Typography:** "JetBrains Mono", "Fira Code", monospace.

### Components

#### Filter Bar
- Search input (Title/Description).
- Sub-County dropdown (9 real Kisii County sub-counties from `WARDS.md`).
- Ward Area dropdown — dynamically populated from the wards data.
- Category dropdown (Works, Equipment, Both).
- Status dropdown (Ongoing, Completed, On Hold, Planning).
- Project Type dropdown (dynamic from existing projects).
- Clear Filters button.

#### Project Card
- Cover photo displayed as the card image.
- Visual tags for Status, Sub-County, Ward Area, Category, Type.
- **New:** Handover badge (green), Inspections count badge (yellow), Equipment decision badge (green/red/yellow).
- Budget and Project Cost display (Kshs).
- Completion progress bar.
- Action buttons: View, Edit, Delete.

#### Project Detail Modal — Tabbed Interface
1. **Project Info Tab:** Full project details + photo gallery with cover photo management.
2. **Site Handover Tab** (Works/Both only): Date picker, notes textarea, photo upload for initial records initial site condition photos. Existing photos shown with delete buttons.
3. **Inspections Tab** (Works/Both only): 4 inspection forms, each with inspection number, date picker, notes textarea, progress photos upload. Editable after creation.
4. **Equipment Tab** (Equipment/Both only): Date picker, decision dropdown (pending/accepted/rejected), notes textarea, photo upload for equipment inspection photos.

#### Add/Edit Modal
- Toggle between "Add" and "Edit" titles/buttons.
- Sub-County dropdown with dynamic ward filtering.
- Photo upload zone (max 50 photos, 20MB each, images only).
- Validation alerts for financial constraints.

## 6. Geographic Data
Sub-counties and wards are defined in `frontend/src/data/wards.js`, sourced from `WARDS.md` (Kisii County).

**9 Sub-Counties:** Bobasi, Bomachoge Borabu, Bomachoge Chache, Bonchari, Kitutu Chache North, Kitutu Chache South, Nyaribari Chache, Nyaribari Masaba, South Mugirango.

**45 Wards** mapped to their respective sub-counties.

## 7. Frontend Architecture
- **API proxy:** Vite dev server proxies `/api` and `/uploads` to `http://localhost:3000`.
- **API base URL:** defaults to `/api` (relative, goes through proxy).
- **State management:** React `useState` and `useEffect` hooks. No external state library.
- **Data flow:** `App.jsx` owns the projects state. Fetches on mount. Passes data down to `FilterBar`, `ProjectCard`, `AddProjectModal`, `ProjectDetailModal`.
- **Cover photo update:** `ProjectDetailModal` calls the cover photo API, then notifies `App.jsx` via `onCoverUpdate` callback.
- **Icons:** All icons use inline SVG components in `Icons.jsx` (no lucide-react dependency).

## 8. Migration History
- `backend/init-db.sql` — Initial schema (projects, project_photos)
- `backend/migrations/002_handover_inspection.sql` — Adds handover, inspection, equipment_acceptance, and event_photos tables with indexes and triggers
