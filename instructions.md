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
4. **Note:** If the `projects` table already exists without the `updated_at` column, run:
   ```sql
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
   ```
5. **Note:** If the `project_photos` table already exists without the `is_cover` column, run:
   ```sql
   ALTER TABLE project_photos ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT FALSE;
   ```

### 2. Backend Configuration
1. Navigate to the `backend` folder.
2. Open the `.env` file.
3. Update the `DATABASE_URL` to match your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://your_username:***@localhost:5432/project_indexer_db"
   PORT=5000
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
   cd /f/PROJECT/backend && node server.js 2>&1
   ```
   The server should be running at `http://localhost:5000`.

### 4. Frontend Configuration
1. Navigate to the `frontend` folder.
2. The frontend uses Vite's proxy to forward `/api` requests to the backend on port 5173. No `.env` file is needed for the default setup.
3. If you need to set a custom API URL, create `.env` in the frontend folder:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

### 5. Frontend Installation & Running
1. Install the dependencies:
   ```bash
   npm install
   ```
2. Start the frontend development server:
   ```bash
   npm run dev
   cd /f/PROJECT/frontend && npx vite --host 0.0.0.0 --port 5173 2>&1
   ```
   The frontend should be accessible at the URL provided in the console (typically `http://localhost:5173`).

---

## Security Notes

- **HTTPS:** For production deployments, ensure HTTPS is enabled. The current setup assumes HTTP for development.
- **CORS:** The `CORS_ORIGIN` environment variable controls which origins can access the API. Set this to your frontend URL in production (e.g., `https://yourdomain.com`). The default `*` is suitable for development only.
- **Rate Limiting:** The API includes rate limiting (1000 requests per 15 minutes for general endpoints, 30 requests per 15 minutes for upload endpoints). Adjust these limits in `server.js` as needed.
- **File Uploads:** Maximum 20MB per file, 50 files per request, images only.
- **Authentication:** This application does not include authentication. For production use, add authentication/authorization middleware to protect the API endpoints.

---

## API Documentation

### 1. Get All Projects
- **Endpoint:** `GET /api/projects`
- **Description:** Returns a list of all projects with their photos and cover photo.
- **Response:** Array of project objects, each containing:
  - `photos` — ordered array of photo URLs
  - `cover_photo` — URL of the cover photo (or `null` if not set)

### 2. Create a Project
- **Endpoint:** `POST /api/projects`
- **Content-Type:** `multipart/form-data`
- **Required Fields:** `title`
- **Key Fields:** `budget`, `project_cost`, `cost_to_date` (Must follow: Budget ≥ Project Cost ≥ Cost to Date ≥ 0), `category` (Works, Equipment, or Both), `sub_county`, `ward_area`.
- **Response:** Created project object with photos array.

### 3. Update a Project
- **Endpoint:** `PUT /api/projects/:id`
- **Content-Type:** `multipart/form-data`
- **Description:** Updates project metadata and allows adding new photos to the existing set.
- **Validation:** Same financial constraints as creation.
- **Response:** Updated project object with photos array.

### 5. Delete a Project
- **Endpoint:** `DELETE /api/projects/:id`
- **Description:** Permanently removes the project and deletes all associated photo files from the server storage.
- **Response:** Success message.

### 6. Set Cover Photo
- **Endpoint:** `PUT /api/projects/:id/cover-photo`
- **Content-Type:** `application/json`
- **Body:** `{ "photo_url": "/uploads/filename.jpg" }`
- **Description:** Sets the specified photo as the project's cover photo. All other photos for the project are automatically unset as cover. The cover photo is displayed on the project card.
- **Response:** Success message.

### 7. Delete a Photo
- **Endpoint:** `DELETE /api/projects/:id/photos/:photoId`
- **Description:** Deletes a single photo from a project. Removes both the database record and the file from the filesystem. If the deleted photo was the cover, the cover is cleared.
- **Response:** Success message with `deleted_url` and `was_cover` flag.

---

## Testing the API

### Example: Create Project with curl
```bash
curl -X POST http://localhost:5000/api/projects \
  -F "title=New Bridge Project" \
  -F "category=Works" \
  -F "sub_county=Bobasi" \
  -F "ward_area=Bassi Central" \
  -F "budget=1000000" \
  -F "project_cost=800000" \
  -F "cost_to_date=400000" \
  -F "photos=@/path/to/image1.jpg"
```

### Example: Set Cover Photo with curl
```bash
curl -X PUT http://localhost:5000/api/projects/1/cover-photo \
  -H "Content-Type: application/json" \
  -d '{"photo_url":"/uploads/photos-1234567890.jpg"}'
```

### Example: Delete Project with curl
```bash
curl -X DELETE http://localhost:5000/api/projects/1
```

### Example: Delete a Photo with curl
```bash
curl -X DELETE http://localhost:5000/api/projects/1/photos/5
```

## Sub-Counties and Wards

The application ships with real Kisii County data (45 wards across 9 sub-counties) sourced from `WARDS.md`. The data is defined in `frontend/src/data/wards.js`.

**Sub-Counties:** Bobasi, Bomachoge Borabu, Bomachoge Chache, Bonchari, Kitutu Chache North, Kitutu Chache South, Nyaribari Chache, Nyaribari Masaba, South Mugirango.

**Ward selection:** In the Add/Edit Project modal, the Ward Area dropdown is populated dynamically based on the selected Sub-County. The Filter Bar's Ward Area dropdown also filters by the selected Sub-County.

## Folder Structure
- `backend/uploads/`: Local storage for all uploaded project images.
- `backend/routes/`: API route definitions.
- `backend/middleware/`: Request processing logic (e.g., file upload handling).
- `backend/db.js`: Database connection pool configuration.
- `frontend/`: React + Vite frontend application.
- `frontend/src/data/`: Static data (wards and sub-counties).
- `frontend/src/styles/`: Shared style constants and utilities.
- `frontend/src/components/`: React components.
- `WARDS.md`: Source data for Kisii County wards and sub-counties.
