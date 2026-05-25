# Setup Guide: Project Indexer Application

This guide provides step-by-step instructions to set up and run the Project Indexer full-stack application.

## Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v16 or later)
- **PostgreSQL** (v13 or later)
- **npm** (comes with Node.js)

## Getting Started

### 1. Database Setup
1. Open your PostgreSQL management tool (e.g., pgAdmin, psql).
2. Create a new database named `project_indexer_db`.
3. Run the initialization script located at `backend/init-db.sql` to create the necessary tables, constraints, indices, and triggers.
4. Run the migration script located at `backend/migrations/002_handover_inspection.sql` to add handover, inspection, equipment acceptance, and event photos tables.
   - **Note:** You can run migrations using the provided helper: `cd backend && node run-migration.js`
5. **Note:** If the `projects` table already exists without the `updated_at` column, run:
   ```sql
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
   ```
6. **Note:** If the `project_photos` table already exists without the `is_cover` column, run:
   ```sql
   ALTER TABLE project_photos ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT FALSE;
   ```

### 2. Backend Configuration
1. Navigate to the `backend` folder.
2. Open the `.env` file.
3. Update the `DATABASE_URL` to match your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://your_username:***@localhost:5432/project_indexer_db"
   PORT=3000
   UPLOAD_PATH=./uploads
   CORS_ORIGIN="http://localhost:5173"
   ```
4. **Important:** The `DATABASE_URL` environment variable is required. The application will not start without it.

### 3. Backend Installation & Running
1. From the root of the `backend` directory, install the dependencies:
   ```bash
   npm install
   ```
2. Start the backend server:
   ```bash
   npm start
   ```
   The server should be running at `http://localhost:3000`.

### 4. Frontend Configuration
1. Navigate to the `frontend` folder.
2. The frontend uses Vite's proxy to forward `/api` and `/uploads` requests to the backend on port 3000. No `.env` file is needed for the default setup.
3. If you need to set a custom API URL, create `.env` in the frontend folder:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

### 5. Frontend Installation & Running
1. Install the dependencies:
   ```bash
   npm install
   ```
2. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend should be accessible at `http://localhost:5173`.

---

## Security Notes

- **HTTPS:** For production deployments, ensure HTTPS is enabled. The current setup assumes HTTP for development.
- **CORS:** The `CORS_ORIGIN` environment variable controls which origins can access the API. Set this to your frontend URL in production (e.g., `https://yourdomain.com`). The default `*` is suitable for development only.
- **Rate Limiting:** The API includes rate limiting (1000 requests per 15 minutes for general endpoints, 30 requests per 15 minutes for upload endpoints). Adjust these limits in `server.js` as needed.
- **File Uploads:** Maximum 20MB per file, 50 files per request, images only.
- **Authentication:** This application does not include authentication. For production use, add authentication/authorization middleware to protect the API endpoints.

---

## API Documentation

### Projects

#### 1. Get All Projects
- **Endpoint:** `GET /api/projects`
- **Description:** Returns all projects with photos, cover photo, and handover/inspection/acceptance summary data.
- **Response:** Array of project objects with `photos`, `cover_photo`, `handover`, `inspections`, `equipment_acceptance`.

#### 2. Create a Project
- **Endpoint:** `POST /api/projects`
- **Content-Type:** `multipart/form-data`
- **Required Fields:** `title`
- **Key Fields:** `budget`, `project_cost`, `cost_to_date` (Must follow: Budget >= Project Cost >= Cost to Date >= 0), `category` (Works, Equipment, or Both), `sub_county`, `ward_area`.

#### 3. Update a Project
- **Endpoint:** `PUT /api/projects/:id`
- **Content-Type:** `multipart/form-data`
- **Description:** Updates project metadata and appends new photos.

#### 4. Delete a Project
- **Endpoint:** `DELETE /api/projects/:id`
- **Description:** Permanently removes the project and all associated photo files.

#### 5. Set Cover Photo
- **Endpoint:** `PUT /api/projects/:id/cover-photo`
- **Body:** `{ "photo_url": "/uploads/filename.jpg" }`

#### 6. Delete a Photo
- **Endpoint:** `DELETE /api/projects/:id/photos/:photoId`

### Handovers (Works/Both projects only)

#### 7. Get Handover
- **Endpoint:** `GET /api/projects/:id/handover`
- **Description:** Returns the site handover with photos.

#### 8. Create/Update Handover
- **Endpoint:** `POST /api/projects/:id/handover`
- **Content-Type:** `multipart/form-data`
- **Fields:** `handover_date`, `notes`, `metadata` (JSON), `photos` (files)
- **Description:** Creates or updates the site handover. Records initial site condition.

#### 9. Delete Handover
- **Endpoint:** `DELETE /api/projects/:id/handover`

### Inspections (Works/Both projects only)

#### 10. List Inspections
- **Endpoint:** `GET /api/projects/:id/inspections`
- **Description:** Returns all inspections (up to 4) with photos.

#### 11. Create/Update Inspection
- **Endpoint:** `POST /api/projects/:id/inspections`
- **Content-Type:** `multipart/form-data`
- **Fields:** `inspection_number` (1-4), `inspection_date`, `notes`, `metadata` (JSON), `photos` (files)
- **Description:** Creates or updates a specific inspection. Records progress photos.

#### 12. Delete Inspection
- **Endpoint:** `DELETE /api/projects/:id/inspections/:inspectionNumber`

### Equipment Acceptance (Equipment/Both projects only)

#### 13. Get Equipment Acceptance
- **Endpoint:** `GET /api/projects/:id/equipment-acceptance`
- **Description:** Returns the equipment acceptance with photos and decision.

#### 14. Create/Update Equipment Acceptance
- **Endpoint:** `POST /api/projects/:id/equipment-acceptance`
- **Content-Type:** `multipart/form-data`
- **Fields:** `acceptance_date`, `decision` (accepted/rejected/pending), `notes`, `metadata` (JSON), `photos` (files)

#### 15. Delete Equipment Acceptance
- **Endpoint:** `DELETE /api/projects/:id/equipment-acceptance`

### Event Photos

#### 16. Delete Event Photo
- **Endpoint:** `DELETE /api/event-photos/:photoId`
- **Description:** Deletes a single event photo (works for handover, inspection, or acceptance photos).

---

## Testing the API

### Example: Create Project with curl
```bash
curl -X POST http://localhost:3000/api/projects \
  -F "title=New Bridge Project" \
  -F "category=Works" \
  -F "sub_county=Bobasi" \
  -F "ward_area=Bassi Bogetaorio" \
  -F "budget=1000000" \
  -F "project_cost=800000" \
  -F "cost_to_date=400000" \
  -F "photos=@/path/to/image1.jpg"
```

### Example: Create Handover with curl
```bash
curl -X POST http://localhost:3000/api/projects/1/handover \
  -F "handover_date=2025-01-15" \
  -F "notes=Site handed over to contractor" \
  -F "photos=@/path/to/handover1.jpg" \
  -F "photos=@/path/to/handover2.jpg"
```

### Example: Create Inspection with curl
```bash
curl -X POST http://localhost:3000/api/projects/1/inspections \
  -F "inspection_number=1" \
  -F "inspection_date=2025-02-01" \
  -F "notes=Foundation work progressing well" \
  -F "photos=@/path/to/insp1.jpg"
```

### Example: Create Equipment Acceptance with curl
```bash
curl -X POST http://localhost:3000/api/projects/2/equipment-acceptance \
  -F "acceptance_date=2025-03-01" \
  -F "decision=accepted" \
  -F "notes=Equipment meets specifications" \
  -F "photos=@/path/to/equip1.jpg"
```

### Example: Set Cover Photo with curl
```bash
curl -X PUT http://localhost:3000/api/projects/1/cover-photo \
  -H "Content-Type: application/json" \
  -d '{"photo_url":"/uploads/photos-1234567890.jpg"}'
```

## Sub-Counties and Wards

The application ships with real Kisii County data (45 wards across 9 sub-counties) sourced from `WARDS.md`. The data is defined in `frontend/src/data/wards.js`.

**Sub-Counties:** Bobasi, Bomachoge Borabu, Bomachoge Chache, Bonchari, Kitutu Chache North, Kitutu Chache South, Nyaribari Chache, Nyaribari Masaba, South Mugirango.

**Ward selection:** In the Add/Edit Project modal, the Ward Area dropdown is populated dynamically based on the selected Sub-County. The Filter Bar's Ward Area dropdown also filters by the selected Sub-County.

## Folder Structure
- `backend/uploads/`: Local storage for all uploaded project and event images.
- `backend/routes/`: API route definitions (projectRoutes.js, handoverInspectionRoutes.js).
- `backend/middleware/`: Request processing logic (file upload handling).
- `backend/migrations/`: Database migration scripts.
- `backend/db.js`: Database connection pool configuration.
- `frontend/`: React + Vite frontend application.
- `frontend/src/data/`: Static data (wards and sub-counties).
- `frontend/src/styles/`: Shared style constants and utilities.
- `frontend/src/components/`: React components (including Icons.jsx for inline SVGs).
- `WARDS.md`: Source data for Kisii County wards and sub-counties.
