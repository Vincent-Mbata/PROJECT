# Project Indexer & Portfolio Application Specification

## 1. Project Overview
- **Project Name:** Project Indexer
- **Type:** Full-stack web application (SPA)
- **Core Functionality:** Upload project photos with rich metadata, catalog by sub-counties and ward areas, categorize by work type, filter by geographic area, status, or category without page reloads. Select a cover photo for each project to display on the project card.
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

### Indexes
- `idx_project_photos_project_id` on `project_photos(project_id)`
- `idx_projects_ward_area` on `projects(ward_area)`
- `idx_projects_sub_county` on `projects(sub_county)`
- `idx_projects_status` on `projects(status)`
- `idx_projects_project_type` on `projects(project_type)`

### Triggers
- `update_projects_updated_at` — auto-updates `updated_at` on row update.

## 4. API Endpoints

### GET /api/projects
- **Response:** Array of projects, each containing:
  - `photos` — ordered array of `{id, url}` objects (ordered by photo id)
  - `cover_photo` — URL of the cover photo, or `null` if none set

### POST /api/projects
- **Content-Type:** multipart/form-data
- **Fields:** title (req), description, contractor_name, budget, project_cost, cost_to_date, completion_percentage, status, category, sub_county, ward_area, project_type, photos (up to 50, 20MB each).
- **Response:** Created project object with photos (as `{id, url}` objects) and cover_photo.

### PUT /api/projects/:id
- **Content-Type:** multipart/form-data
- **Description:** Updates project metadata and appends new photos.
- **Validation:** Budget ≥ Project Cost ≥ Cost to Date ≥ 0.
- **Response:** Updated project object with photos (as `{id, url}` objects) and cover_photo.

### DELETE /api/projects/:id
- **Description:** Permanently deletes the project and all associated image files from storage.
- **Response:** Success message.

### PUT /api/projects/:id/cover-photo
- **Content-Type:** application/json
- **Body:** `{ "photo_url": "/uploads/filename.jpg" }`
- **Description:** Sets the specified photo as the project's cover photo. All other photos for the project are automatically unset as cover.
- **Response:** Success message.

### DELETE /api/projects/:id/photos/:photoId
- **Description:** Deletes a single photo from a project. Removes both the database record and the file from the filesystem. If the deleted photo was the cover, the cover is cleared and the first remaining photo is automatically set as the new cover.
- **Response:** `{ message, deleted_url, was_cover }`.

## 5. UI/UX Specification

### Layout Structure
- **Header:** Fixed top bar with app title and "Add Project" button.
- **Filter Bar:** Horizontal controls for Search, Sub-County, Ward Area, Category, Status, and Type.
- **Content Area:** Projects grouped by Sub-County, each sub-group containing a responsive grid of project cards.
- **Modals:** Add/Edit project form overlay, Project Detail overlay with photo gallery.

### Visual Design
- **Color Palette:** Deep Charcoal (#0d1117), Surface (#161b22), Primary Blue (#58a6ff), Success Green (#3fb950), Warning Amber (#d29922), Danger Red (#f85149).
- **Typography:** "JetBrains Mono", "Fira Code", monospace.

### Components

#### Filter Bar
- Search input (Title/Description).
- Sub-County dropdown (9 real Kisii County sub-counties from `WARDS.md`).
- Ward Area dropdown — dynamically populated from the wards data. When a sub-county is selected, only its wards are shown. When "All Sub-Counties" is selected, shows all wards from existing projects.
- Category dropdown (Works, Equipment, Both).
- Status dropdown (Ongoing, Completed, On Hold, Planning).
- Project Type dropdown (dynamic from existing projects).
- Clear Filters button.

#### Project Card
- Cover photo displayed as the card image (falls back to first photo if no cover set).
- Visual tags for Status, Sub-County, Ward Area, and Category.
- Budget and Project Cost display.
- Completion progress bar.
- Action buttons: View, Edit, Delete (overlay on image).

#### Project Detail Modal
- Full project information display (title, category, sub-county/ward, status, budget, costs, completion, description, contractor, project type, last updated).
- Photo gallery grid with all project photos.
- Cover photo highlighted with a gold border and "COVER" badge (star icon).
- "Set as cover" button on each non-cover photo — click to set as the card image.
- Delete button (✕) on each photo — click to delete with confirmation dialog. If the deleted photo was the cover, the first remaining photo is automatically set as the new cover.
- Success/error feedback for cover and delete operations.
- Click any photo to open full-size in new tab.

- **Add/Edit Modal**:
  - Toggle between "Add" and "Edit" titles/buttons.
  - Pre-filled data in Edit mode.
  - Sub-County dropdown (real Kisii County sub-counties).
  - Ward Area dropdown — dynamically populated based on selected Sub-County. Resets when Sub-County changes.
  - Photo upload zone (max 50 photos, 20MB each, images only).
  - Photo previews with remove buttons.
  - Validation alerts for financial constraints.

## 6. Geographic Data

Sub-counties and wards are defined in `frontend/src/data/wards.js`, sourced from `WARDS.md` (Kisii County).

**9 Sub-Counties:** Bobasi, Bomachoge Borabu, Bomachoge Chache, Bonchari, Kitutu Chache North, Kitutu Chache South, Nyaribari Chache, Nyaribari Masaba, South Mugirango.

**45 Wards** mapped to their respective sub-counties.

## 7. Frontend Architecture

- **API proxy:** Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000`.
- **API base URL:** defaults to `/api` (relative, goes through proxy).
- **State management:** React `useState` and `useEffect` hooks. No external state library.
- **Data flow:** `App.jsx` owns the projects state. Fetches on mount. Passes data down to `FilterBar`, `ProjectCard`, `AddProjectModal`, `ProjectDetailModal`.
- **Cover photo update:** `ProjectDetailModal` calls the cover photo API, then notifies `App.jsx` via `onCoverUpdate` callback to update the projects list in real-time.
