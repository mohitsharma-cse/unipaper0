# Unipaper Project Report

Full-Stack College Study Material Management System

Prepared for: Project Unipaper  
Prepared by: Codex  
Date: 2026-05-09  
Source reviewed: `C:\Users\mohit\Downloads\Unipaper_Project_Blueprint.pdf`

---

## 1. Project Summary

Unipaper is a full-stack web application for managing and sharing college study materials in an organized file-explorer style interface. The main idea is to replace scattered WhatsApp files, random Google Drive links, and unorganized PDFs with one clean library where students can browse, search, preview, and download notes, assignments, previous year papers, and syllabi.

The system has two sides:

- Public student side: anyone can view, search, preview, and download study material.
- Admin side: only the admin can create folders, upload PDFs, update details, delete files, and manage the full structure.

The project should behave like a real digital library or file manager:

```text
B.Tech
  Semester 3
    DBMS
      Notes
        Unit 1 DBMS Notes.pdf
        Normalization Notes.pdf
      Assignments
        Assignment 1.pdf
      PYQ
        DBMS 2023 Paper.pdf
      Syllabus
        DBMS Syllabus.pdf
```

## 2. Problem Statement

College study materials are usually shared in messy ways:

- PDF files get lost in WhatsApp groups.
- Students receive duplicate or old versions of the same file.
- No single place exists for notes, assignments, PYQs, and syllabi.
- Searching for a specific subject or semester wastes time.
- Teachers or admins cannot easily update, remove, or organize material.

Unipaper solves this by creating one official, searchable, admin-managed library.

## 3. Final Project Concept

Unipaper will be a college study material portal where:

- Admin creates folder structures such as course, semester, subject, and category.
- Admin uploads PDF files into the correct folder.
- Metadata is saved in MongoDB Atlas.
- Actual PDF files are stored in a cloud file storage service such as Cloudinary or AWS S3.
- Students can browse folders like a file explorer.
- Students can search by title, subject, semester, category, tags, or keywords.
- Students can preview PDFs in the browser and download them.
- Admin can update, delete, and maintain all materials yearly.

Important storage decision:

MongoDB Atlas should not store raw PDF binary files for this project. MongoDB should store metadata only, such as title, subject, semester, tags, folder path, Cloudinary URL, upload date, and download count. The real PDF file should be uploaded to Cloudinary, AWS S3, or another file storage bucket.

## 4. Main Users

| User | Login Required | Main Permissions |
| --- | --- | --- |
| Student / Viewer | No | Browse folders, search files, preview PDFs, download PDFs |
| Admin | Yes | Create folders, upload files, edit metadata, delete folders/files, view dashboard stats |

Future roles can include:

- Super admin
- Department admin
- Faculty uploader
- Student contributor with approval system

## 5. Technology Stack

Recommended stack for the first production-ready version:

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React.js | Public file explorer and admin dashboard |
| Styling | Tailwind CSS | Fast responsive UI design |
| Backend | Node.js + Express.js | REST API, auth, upload handling |
| Database | MongoDB Atlas | Store users, folders, file metadata |
| ODM | Mongoose | Schema modeling and database queries |
| File Upload | Multer | Receive PDF files from admin form |
| File Storage | Cloudinary or AWS S3 | Store actual PDF files |
| Authentication | JWT + bcrypt | Secure admin login |
| Cookies | httpOnly cookies | Safer JWT storage than localStorage |
| Security | helmet, cors, express-rate-limit | Basic production security |
| Validation | express-validator or zod | Validate admin input |
| Deployment | Vercel + Render/Railway | Frontend and backend hosting |

## 6. Architecture Overview

```text
Student Browser / Admin Browser
        |
        v
React Frontend
        |
        v
Express Backend API
        |
        +--> MongoDB Atlas
        |       Stores users, folders, metadata, tags, URLs
        |
        +--> Cloudinary / AWS S3
                Stores actual PDF files
```

### Public Student Flow

1. Student opens the website.
2. Frontend requests folder tree from backend.
3. Student browses course, semester, subject, and category folders.
4. Frontend requests files for the selected folder.
5. Student previews or downloads a PDF.

### Admin Upload Flow

1. Admin logs in using email and password.
2. Backend verifies password using bcrypt.
3. Backend sends JWT in an httpOnly cookie.
4. Admin selects folder, metadata, and PDF file.
5. Frontend sends multipart form data to backend.
6. Multer receives PDF in backend memory.
7. Backend uploads PDF to Cloudinary or S3.
8. Cloud storage returns a secure URL and public ID.
9. Backend saves file metadata and URL in MongoDB.
10. File becomes visible to students.

## 7. Core Features

### Public Student Features

- View all folders in explorer style.
- Browse by course, semester, subject, and category.
- Search files by keyword.
- Filter by course, semester, subject, and category.
- Preview PDF in browser.
- Download PDF.
- See file details such as title, upload date, category, and tags.
- Mobile responsive interface.

### Admin Features

- Secure admin login.
- Admin dashboard.
- Create folders at any level.
- Rename folders.
- Delete folders.
- Upload PDF files.
- Edit file metadata.
- Delete files from MongoDB and cloud storage.
- Search and filter files in admin panel.
- View dashboard stats such as total files, total folders, recent uploads, and downloads.

### Future AI Features With Gemini

Gemini can be added after the main system works:

- Auto-generate PDF summary.
- Auto-detect subject and category from file name/content.
- Auto-generate tags.
- Ask questions from uploaded notes.
- Recommend related files.
- Detect duplicate materials.

These AI features should be Phase 2 or Phase 3, not the first backend task.

## 8. Database Design

### User Model

Used for admin accounts.

```js
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'super_admin'], default: 'admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

Rules:

- Password must always be hashed with bcrypt.
- Plain text passwords must never be stored.
- Admin creation should happen through a seed script first.

### Folder Model

Used to create the file explorer tree.

```js
const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['course', 'semester', 'subject', 'category'],
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  path: { type: String, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

Example folder documents:

```text
B.Tech                  type: course, parent: null
Semester 3              type: semester, parent: B.Tech
DBMS                    type: subject, parent: Semester 3
Notes                   type: category, parent: DBMS
```

### File Model

Used to store PDF metadata and the cloud file URL.

```js
const fileSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: String, default: 'B.Tech' },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  category: {
    type: String,
    enum: ['Notes', 'Assignments', 'PYQ', 'Syllabus'],
    required: true
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: true
  },
  pdfUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  originalFileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String, default: 'application/pdf' },
  tags: [String],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  downloads: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  uploadDate: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

fileSchema.index({
  title: 'text',
  subject: 'text',
  category: 'text',
  tags: 'text'
});
```

Important fields:

- `pdfUrl`: URL students use to view/download the PDF.
- `publicId`: cloud storage ID used to delete the file from Cloudinary/S3.
- `folderId`: connects the file to the folder tree.
- `tags`: improves search.
- `downloads`: helps admin see useful files.

### Optional Audit Log Model

Useful for a real-life admin system.

```js
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['CREATE_FOLDER', 'DELETE_FOLDER', 'UPLOAD_FILE', 'UPDATE_FILE', 'DELETE_FILE']
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetType: { type: String, enum: ['Folder', 'File'] },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  message: { type: String },
  createdAt: { type: Date, default: Date.now }
});
```

## 9. API Endpoint Plan

### Public Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check backend status |
| GET | `/api/folders` | Get full folder tree |
| GET | `/api/folders/:id/files` | Get files inside one folder |
| GET | `/api/files` | List files with filters |
| GET | `/api/files/search?q=` | Search files |
| GET | `/api/files/:id` | Get one file metadata |
| POST | `/api/files/:id/download` | Increase download count and return URL |

### Auth Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/logout` | Admin logout |
| GET | `/api/auth/me` | Check logged-in admin |

### Protected Admin Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/admin/stats` | Dashboard stats |
| POST | `/api/admin/folders` | Create folder |
| PUT | `/api/admin/folders/:id` | Rename/update folder |
| DELETE | `/api/admin/folders/:id` | Delete folder |
| POST | `/api/admin/files` | Upload PDF file |
| PUT | `/api/admin/files/:id` | Update file metadata |
| DELETE | `/api/admin/files/:id` | Delete file from DB and cloud |
| GET | `/api/admin/audit-logs` | View admin actions |

## 10. File Upload Pipeline

The file upload pipeline is the core engine of Unipaper.

```text
Admin Form
  -> React multipart/form-data request
  -> Express route
  -> JWT auth middleware
  -> Multer PDF validation
  -> Cloudinary/S3 upload
  -> MongoDB metadata save
  -> Response to frontend
```

Upload rules:

- Only PDF files should be accepted.
- Maximum file size should be limited, for example 25 MB.
- File title, subject, semester, category, and folder ID are required.
- Backend must validate all fields.
- If MongoDB save fails after cloud upload, backend should delete the uploaded cloud file to avoid unused files.
- If admin deletes a file, backend must delete both MongoDB metadata and the cloud file using `publicId`.

## 11. Frontend UI Plan

The frontend should feel like a clean file explorer for students.

### Public Pages

| Page | Purpose |
| --- | --- |
| Home / Explorer | Main student interface |
| Search Results | Shows matching files |
| Folder View | Shows selected folder and files |
| PDF Preview Modal | Opens selected PDF |
| Not Found | Handles invalid route |

### Admin Pages

| Page | Purpose |
| --- | --- |
| Admin Login | Secure login form |
| Admin Dashboard | Overview stats |
| Folder Manager | Create, rename, delete folders |
| Upload File | Upload PDF with metadata |
| File Manager | Edit/delete existing files |
| Audit Logs | View admin activity |

### React Component Plan

```text
src/
  components/
    Navbar.jsx
    Sidebar.jsx
    FolderTree.jsx
    FileGrid.jsx
    FileCard.jsx
    SearchBar.jsx
    PDFModal.jsx
    LoadingSkeleton.jsx
  pages/
    Home.jsx
    AdminLogin.jsx
    AdminDashboard.jsx
  admin/
    FolderManager.jsx
    UploadForm.jsx
    FileManager.jsx
    DashboardStats.jsx
  utils/
    api.js
    ProtectedRoute.jsx
  context/
    AuthContext.jsx
```

### UI Direction

- Dark theme foundation.
- File explorer layout.
- Sidebar for folder navigation.
- Main grid for files and folders.
- Search bar at the top.
- Category badges for Notes, Assignments, PYQ, and Syllabus.
- Mobile sidebar should collapse into a menu.
- Use clean icons for folders, PDFs, search, upload, delete, edit, and download.

Recommended colors:

```text
Background: #0d1117
Panel:      #161b22
Border:     #30363d
Primary:    #00d4ff
Accent:     #8b5cf6
Text:       #f0f6fc
Muted:      #8b949e
Danger:     #ef4444
Success:    #22c55e
```

## 12. Security Plan

Security is very important because admin can upload and delete study material.

Must-have security:

- Store all secrets in `.env`.
- Never commit `.env` to GitHub.
- Add `.env` and `node_modules` to `.gitignore`.
- Hash admin password using bcrypt.
- Use JWT in httpOnly cookie.
- Protect all `/api/admin/*` routes.
- Use `helmet()` in Express.
- Configure CORS with only frontend domain allowed.
- Add rate limiting on login route.
- Validate every admin input.
- Accept only `application/pdf`.
- Limit PDF file size.
- Save Cloudinary/S3 `publicId` for secure deletion.
- Do not expose MongoDB URI or Cloudinary secret in frontend.

Recommended admin auth cookie settings:

```js
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000
});
```

## 13. Suggested Backend Folder Structure

```text
unipaper-backend/
  src/
    config/
      db.js
      cloudinary.js
    models/
      User.js
      Folder.js
      File.js
      AuditLog.js
    middleware/
      auth.js
      upload.js
      validate.js
      errorHandler.js
    routes/
      auth.routes.js
      public.routes.js
      folder.routes.js
      admin.routes.js
    controllers/
      auth.controller.js
      file.controller.js
      folder.controller.js
      admin.controller.js
    services/
      cloudStorage.service.js
      folderTree.service.js
    utils/
      seedAdmin.js
      asyncHandler.js
    app.js
    server.js
  .env
  .env.example
  .gitignore
  package.json
```

## 14. Suggested Frontend Folder Structure

```text
unipaper-frontend/
  src/
    components/
      Navbar.jsx
      Sidebar.jsx
      FolderTree.jsx
      FileGrid.jsx
      FileCard.jsx
      SearchBar.jsx
      PDFModal.jsx
    pages/
      Home.jsx
      AdminLogin.jsx
      AdminDashboard.jsx
    admin/
      FolderManager.jsx
      UploadForm.jsx
      FileManager.jsx
    context/
      AuthContext.jsx
    utils/
      api.js
      ProtectedRoute.jsx
    App.jsx
    main.jsx
  public/
  .env
  package.json
```

## 15. Environment Variables

### Backend `.env`

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/unipaper
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
```

## 16. Development Roadmap

### Phase 0: Documentation and Planning

Status: Completed in this document.

- Read and understand provided project blueprint.
- Confirm final concept: public study material explorer plus admin management system.
- Decide recommended storage architecture.
- Create this `unipaper.md` project report.

### Phase 1: Backend Foundation

Goal: Start the API project.

Steps:

1. Create `unipaper-backend`.
2. Run `npm init -y`.
3. Install core packages:

```bash
npm install express mongoose dotenv cors cookie-parser helmet
npm install bcryptjs jsonwebtoken multer cloudinary streamifier
npm install express-rate-limit express-validator
npm install -D nodemon
```

4. Create Express server.
5. Connect MongoDB Atlas.
6. Add `/api/health`.
7. Create User, Folder, File, and AuditLog models.

### Phase 2: Authentication

Goal: Secure admin routes.

Steps:

1. Create admin seed script.
2. Hash password using bcrypt.
3. Create login route.
4. Sign JWT.
5. Store JWT in httpOnly cookie.
6. Create `verifyToken` middleware.
7. Protect `/api/admin/*`.

### Phase 3: Folder System

Goal: Admin can create the file explorer structure.

Steps:

1. Create folder route.
2. Get folder tree route.
3. Rename folder route.
4. Delete folder route.
5. Handle recursive delete carefully.
6. Test with course, semester, subject, and category.

### Phase 4: File Upload System

Goal: Admin can upload PDFs.

Steps:

1. Configure Multer memory storage.
2. Validate PDF type and size.
3. Configure Cloudinary/S3.
4. Upload PDF to cloud storage.
5. Save metadata in MongoDB.
6. Save `publicId`.
7. Build delete route that removes file from DB and cloud.

### Phase 5: Public File APIs

Goal: Students can browse and search.

Steps:

1. Build list files API.
2. Add filters for course, semester, subject, category, and folderId.
3. Build search API using MongoDB text index.
4. Add pagination.
5. Add download counter.

### Phase 6: React Public Frontend

Goal: Build student-facing file explorer.

Steps:

1. Create Vite React app.
2. Install Tailwind CSS.
3. Build layout with sidebar and file grid.
4. Fetch folders from API.
5. Fetch files by selected folder.
6. Build search bar.
7. Build PDF preview modal.
8. Add responsive mobile layout.

### Phase 7: React Admin Panel

Goal: Admin can manage everything visually.

Steps:

1. Build admin login page.
2. Build protected admin route.
3. Build dashboard stats.
4. Build folder manager.
5. Build upload form.
6. Build file manager table.
7. Add edit and delete actions.
8. Add success/error toasts.

### Phase 8: Testing and Deployment

Goal: Make it usable as a real project.

Steps:

1. Test backend routes with Postman or Thunder Client.
2. Test upload and delete cycle.
3. Test admin cookie auth.
4. Test public browse/search/download.
5. Create `.env.example`.
6. Deploy backend to Render or Railway.
7. Deploy frontend to Vercel.
8. Test deployed production flow.

## 17. Testing Checklist

Backend tests to perform:

- `/api/health` returns OK.
- MongoDB connects successfully.
- Admin login works with correct password.
- Admin login fails with wrong password.
- Protected route fails without token.
- Protected route works with valid token.
- Folder creation works.
- Folder tree returns correctly nested data.
- PDF upload rejects non-PDF files.
- PDF upload rejects large files.
- PDF upload saves URL in MongoDB.
- File delete removes both MongoDB document and cloud file.
- Search returns correct files.

Frontend tests to perform:

- Home page loads without login.
- Folder sidebar loads.
- File grid updates when folder is clicked.
- Search returns matching PDFs.
- PDF preview opens.
- Download button works.
- Admin login works.
- Admin dashboard blocks unauthenticated users.
- Upload form works.
- Delete confirmation works.
- Mobile layout is usable.

## 18. Deployment Plan

Recommended beginner-friendly deployment:

| Part | Service | Notes |
| --- | --- | --- |
| Frontend | Vercel | Best for React/Vite |
| Backend | Render or Railway | Good for Node/Express |
| Database | MongoDB Atlas | Already planned |
| File Storage | Cloudinary | Simple for PDF upload and URL delivery |

Production requirements:

- Set backend env variables in Render/Railway.
- Set frontend `VITE_API_URL` in Vercel.
- Set `CLIENT_URL` in backend to the deployed frontend URL.
- Use secure cookies in production.
- Use proper CORS origin, not `*`.
- Keep MongoDB Atlas network rules secure.

## 19. Suggested MVP Scope

The first working version should include only the must-have features:

- Public file explorer.
- Public search.
- PDF preview/download.
- Admin login.
- Admin folder creation.
- Admin PDF upload.
- Admin file delete.
- MongoDB metadata storage.
- Cloudinary PDF storage.

Do not start with AI, comments, likes, student accounts, or complex analytics. Build the core library first.

## 20. Future Enhancements

After MVP:

- Gemini AI summaries.
- Gemini AI tag generation.
- Duplicate file detection.
- Department-wise admins.
- Student login and bookmarks.
- Recently viewed files.
- Most downloaded files.
- Approval workflow for faculty uploads.
- Bulk upload.
- Excel/CSV import for metadata.
- Version history for files.
- Archive old semesters yearly instead of deleting everything.

## 21. Handoff Brief For Other Tools Or Developers

Use this brief when giving the project to another AI tool or developer:

```text
Build Unipaper, a full-stack college study material management system.

Frontend:
- React.js with Tailwind CSS.
- Public file explorer UI for students.
- Admin dashboard for managing folders and PDFs.

Backend:
- Node.js with Express.js.
- MongoDB Atlas with Mongoose.
- JWT admin authentication using httpOnly cookies.
- bcrypt password hashing.
- Multer for PDF upload.
- Cloudinary or AWS S3 for actual PDF storage.

Important:
- Do not store raw PDFs directly in MongoDB.
- Store only metadata and the cloud PDF URL in MongoDB.
- Admin can create course/semester/subject/category folders.
- Admin can upload/delete PDFs.
- Students can browse, search, preview, and download.
- Protect all admin routes.
- Validate file type, file size, and input fields.
```

## 22. Current Work Completed

Completed in the documentation step:

- [x] Read and decoded the provided Unipaper PDF blueprint.
- [x] Understood the project concept from the user's explanation.
- [x] Converted the concept into a professional project report.
- [x] Defined user side and admin side requirements.
- [x] Defined recommended full-stack architecture.
- [x] Clarified MongoDB metadata storage vs cloud PDF storage.
- [x] Added database schema plan.
- [x] Added API endpoint plan.
- [x] Added frontend/admin UI plan.
- [x] Added security plan.
- [x] Added development phases.
- [x] Added testing and deployment checklist.
- [x] Created `unipaper.md`.

Completed in the full-stack build step:

- [x] Created root npm workspace project.
- [x] Created `backend/` Express API project.
- [x] Created MongoDB connection setup.
- [x] Created Mongoose models: User, Folder, MaterialFile, AuditLog.
- [x] Created JWT admin authentication with httpOnly cookies.
- [x] Created admin seed script.
- [x] Created default B.Tech folder-tree seed script.
- [x] Created protected admin routes.
- [x] Created public file/folder/search routes.
- [x] Created folder CRUD implementation.
- [x] Created PDF upload pipeline with Multer 2.
- [x] Created Cloudinary storage support.
- [x] Created local PDF storage fallback for development.
- [x] Created delete cleanup for database records and stored PDF files.
- [x] Created React/Vite frontend project.
- [x] Created public student library explorer.
- [x] Created searchable file grid.
- [x] Created folder sidebar.
- [x] Created PDF preview modal.
- [x] Created protected admin login page.
- [x] Created admin dashboard with stats, folders, upload, file manager, and logs.
- [x] Added `.env.example` files for backend and frontend.
- [x] Added `README.md`.
- [x] Installed dependencies.
- [x] Ran frontend production build successfully.
- [x] Ran backend syntax checks successfully.
- [x] Started frontend dev server at `http://127.0.0.1:5173`.
- [x] Added public API docs endpoint at `/api/docs`.
- [x] Added backend readiness endpoint at `/api/ready`.
- [x] Added `npm run doctor` environment checker.
- [x] Added safer admin search by escaping regular expression input.
- [x] Added public search fallback if MongoDB text search is unavailable.
- [x] Added better Multer upload error handling for invalid/oversized files.
- [x] Hardened local file deletion path safety.
- [x] Added public category filters for Notes, Assignments, PYQ, and Syllabus.
- [x] Added upload form auto-fill from selected folder path.
- [x] Added `docs/API.md`.
- [x] Added `docs/SETUP.md`.

Not completed yet:

- [ ] Add real values to `backend/.env`.
- [ ] Seed the first admin against your MongoDB Atlas database.
- [ ] Seed or manually create the real college folder structure.
- [ ] Upload first real PDF through the admin panel.
- [ ] Deploy backend and frontend.

## 23. Next Recommended Step

The next best step is to connect the project to your real MongoDB Atlas database:

1. Copy `backend/.env.example` to `backend/.env`.
2. Put your MongoDB Atlas URI in `MONGODB_URI`.
3. Set a strong `JWT_SECRET`.
4. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
5. Run `npm run seed:admin`.
6. Run `npm run seed:folders`.
7. Start the backend with `npm run dev:backend`.
8. Open the frontend at `http://127.0.0.1:5173`.

After that, log in at `/admin/login`, upload a test PDF, and confirm it appears on the public library page.

## 24. Second-Pass Review Notes

This review was done after the first full-stack implementation to make the project more practical for real use.

### What Was Rechecked

- Backend route structure.
- Backend controller logic.
- Upload and delete flow.
- Public file search behavior.
- Admin file search behavior.
- Frontend student library flow.
- Frontend admin upload flow.
- Setup and developer handoff documentation.
- Build and syntax verification.

### Improvements Added

1. API self-documentation:

   `/api/docs` now returns the available public, auth, and admin routes as JSON.

2. Deployment readiness check:

   `/api/ready` now reports database connection status and whether storage is using Cloudinary or local fallback.

3. Environment doctor:

   `npm run doctor` checks whether `backend/.env` has required values such as `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `CLIENT_URL`.

4. Safer search:

   Admin file search now escapes special regex characters, so searches like `dbms[` do not crash the route.

5. Better public search resilience:

   Public search tries MongoDB text search first and falls back to safe regex search if the text index is not ready yet.

6. Upload reliability:

   Multer errors now return better HTTP status codes, including `413` for oversized PDF uploads.

7. Local storage safety:

   Local file delete now uses safer relative-path checking before removing a PDF.

8. Better student UX:

   The public library now has category filter buttons for Notes, Assignments, PYQ, and Syllabus.

9. Better admin UX:

   Upload metadata now auto-fills from folder path when admin selects a folder such as `B.Tech/Semester 3/DBMS/Notes`.

10. Developer docs:

   Added `docs/API.md` and `docs/SETUP.md`.

### Verification Results

- Frontend production build: passed.
- Backend JavaScript syntax check: passed.
- Backend app import check: passed.
- Frontend dev server HTTP check: passed at `http://127.0.0.1:5173`.
- `npm run doctor`: expected failure until `backend/.env` is filled with real values.

### Current Blocker

The only real blocker is configuration, not code. The backend needs your actual MongoDB Atlas connection string and admin credentials in `backend/.env`.

Required next action:

```bash
Copy-Item backend\.env.example backend\.env
```

Then edit `backend/.env` and run:

```bash
npm run doctor
npm run seed:admin
npm run seed:folders
npm run dev:backend
```

## 25. Secret And Environment File Instructions

Created local environment files:

- `backend/.env`
- `frontend/.env`

These files are intentionally ignored by Git through `.gitignore`, so secrets should be pasted there, not into chat prompts.

Paste your real values into `backend/.env`:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
CLOUDINARY_CLOUD_NAME=optional_cloudinary_cloud_name
CLOUDINARY_API_KEY=optional_cloudinary_api_key
CLOUDINARY_API_SECRET=optional_cloudinary_api_secret
```

Already filled:

```env
PORT=5000
NODE_ENV=development
API_PUBLIC_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=generated_local_secret
JWT_EXPIRES_IN=24h
```

After editing `backend/.env`, run:

```bash
npm run doctor
npm run seed:admin
npm run seed:folders
npm run dev:backend
```

## 27. Cloudinary Credentials Progress

Cloudinary API key and API secret were added to `backend/.env` from the pasted Cloudinary data.

Cloudinary status:

- `CLOUDINARY_CLOUD_NAME=dlxkjxjdc` added.
- `CLOUDINARY_API_KEY` added.
- `CLOUDINARY_API_SECRET` added.
- Cloudinary is now fully configured in `backend/.env`.

Why it is required:

Cloudinary needs three values:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The pasted data originally included API key and API secret. The later Cloudinary screenshot showed the Cloud Name.

How to get Cloud Name:

1. Open Cloudinary dashboard.
2. Look near the top of the dashboard for `Cloud name`.
3. Copy only that value.
4. Replace this line in `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=PASTE_CLOUDINARY_CLOUD_NAME_HERE
```

Do not paste the API key or API secret again unless the current values are wrong.

## 28. Final Local Project Audit

Local development status:

- Backend API: complete and running.
- Frontend app: complete and running.
- MongoDB Atlas main write user: working.
- MongoDB Atlas read-only user: working.
- Cloudinary PDF storage: working.
- Admin login: working.
- Public folders API: working.
- Protected admin stats route: working.
- Upload/delete pipeline: working with Cloudinary.

Verification completed:

```text
npm run doctor                         PASSED
npm run build                          PASSED
npm audit --omit=dev                   PASSED, 0 vulnerabilities
Backend JS syntax check                PASSED
GET /api/ready                         PASSED
GET /api/docs                          PASSED, storageMode=cloudinary
GET /api/folders                       PASSED
POST /api/auth/login                   PASSED
GET /api/admin/stats                   PASSED
Cloudinary upload smoke test           PASSED
Cloudinary delete smoke test           PASSED
MongoDB read-only read test            PASSED
MongoDB read-only write block test     PASSED
```

Current database state:

```text
Database name: unipaper
Seeded folders: 169
Current real files: 0
Smoke test file: uploaded and deleted successfully
```

## 29. Credential Inventory

Important security note:

The real passwords, database URI, and API secrets are stored in `backend/.env`. They are intentionally not written in full inside this markdown file because markdown files are easy to share or commit by mistake. This section records what exists and where it is stored, with sensitive values masked.

### MongoDB Atlas Main Backend User

Used by backend for admin features, upload metadata, folder creation, delete actions, and seed scripts.

```env
MONGODB_USERNAME=adminfirst9876
MONGODB_PASSWORD=LYf...hhd
MONGODB_URI=mongodb+srv://adminfirst9876:***@cluster0.9yv5jfo.mongodb.net/unipaper?retryWrites=true&w=majority&appName=Cluster0
```

Status:

```text
Connection: working
Role: atlasAdmin@admin
Purpose: backend read/write access
Stored in: backend/.env
```

### MongoDB Atlas Read-Only User

Used only for verification/read-only access. Not used as the main backend URI.

```env
MONGODB_READONLY_USERNAME=userviwer82
MONGODB_READONLY_PASSWORD=f9G...pIA
MONGODB_READONLY_URI=mongodb+srv://userviwer82:***@cluster0.9yv5jfo.mongodb.net/unipaper?retryWrites=true&w=majority
```

Status:

```text
Read access: working
Write access: blocked correctly
Role: readAnyDatabase@admin
Stored in: backend/.env
```

### Website Admin Login

Used to log in at `/admin/login`.

```env
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@unipaper.local
ADMIN_PASSWORD=uni...026
```

Status:

```text
Login: working
Protected admin API: working
Stored in: backend/.env
```

Production note:

Change this website admin password before public deployment.

### JWT Secret

Used by backend to sign admin login tokens.

```env
JWT_SECRET=uni...d1e
JWT_EXPIRES_IN=24h
```

Status:

```text
Length check: passed
Stored in: backend/.env
```

Production note:

Generate a new strong JWT secret before production deployment.

### Cloudinary

Used for actual PDF file storage.

```env
CLOUDINARY_CLOUD_NAME=dlxkjxjdc
CLOUDINARY_API_KEY=574...349
CLOUDINARY_API_SECRET=ze6...66w
```

Status:

```text
Configured: yes
Upload test: passed
Delete test: passed
Stored in: backend/.env
```

### Local URLs

```env
API_PUBLIC_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000
```

Status:

```text
Backend local URL: working
Frontend local URL: working
```

## 30. What Is Still Left

The project is complete for local development. The remaining items are real content, polish, and deployment.

### Required Before Public Deployment

- Change the default website admin password.
- Generate a new production `JWT_SECRET`.
- Deploy backend to Render, Railway, or similar.
- Deploy frontend to Vercel or similar.
- Set production `CLIENT_URL` on backend.
- Set production `API_PUBLIC_URL` on backend.
- Set production `VITE_API_URL` on frontend.
- In MongoDB Atlas Network Access, replace `0.0.0.0/0` with backend server IP if your host provides static outbound IP.
- Confirm cookies work on deployed frontend/backend domains.

### Required For Real Use

- Upload real PDFs through admin dashboard.
- Build the final college folder tree if the seeded B.Tech tree is not enough.
- Rename default subjects/folders according to your actual college/course.
- Delete unused seeded subjects if they do not match your syllabus.
- Test search with real notes, assignments, PYQs, and syllabi.

### Optional Improvements

- Add Gemini AI summary/tag generation.
- Add bulk upload.
- Add file version history.
- Add department-wise admin roles.
- Add analytics for most downloaded materials.
- Add custom college logo/name.
- Add backup/export tools.

## 31. Immediate Next Step

Open the app:

```text
Frontend: http://127.0.0.1:5173
Admin:    http://127.0.0.1:5173/admin/login
```

Login:

```text
Email: admin@unipaper.local
Password: stored in backend/.env
```

Then upload one real PDF and confirm it appears on the public home page.

## 26. MongoDB Atlas Credentials Progress

Values added from the Atlas screenshot:

- MongoDB database username added to `backend/.env`.
- MongoDB database password added to `backend/.env`.
- MongoDB read-only username/password added to `backend/.env`.
- Temporary local Unipaper admin login added:
  - `ADMIN_EMAIL=admin@unipaper.local`
  - `ADMIN_PASSWORD` is stored in `backend/.env` and intentionally not repeated in this report.

Cluster host added:

- `cluster0.9yv5jfo.mongodb.net`

MongoDB URI status:

- Main backend `MONGODB_URI` completed in `backend/.env`.
- Optional read-only `MONGODB_READONLY_URI` completed in `backend/.env`.

Still missing:

- A working read/write MongoDB user for the main backend.

Previous note:

The earlier screenshot showed the database username and password, but not the full cluster host. The new connection screenshot provided the missing host.

Next action:

1. In MongoDB Atlas, click `Choose a connection method`.
2. Choose `Drivers`.
3. Copy the full connection string. It will look like:

```env
mongodb+srv://vikramroys2001_db_user:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

4. Replace the current `MONGODB_URI` in `backend/.env`.
5. Make sure the database name is included as `/unipaper`.

Final format should look like:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/unipaper?retryWrites=true&w=majority
```

Read-only user note:

The read-only Atlas user from the second screenshot was saved as:

```env
MONGODB_READONLY_USERNAME=userviwer82
MONGODB_READONLY_PASSWORD=provided_in_env_file
MONGODB_READONLY_URI=mongodb+srv://userviwer82:provided_password@PASTE_CLUSTER_HOST_HERE/unipaper?retryWrites=true&w=majority
```

This read-only user should not be used as the main `MONGODB_URI` for Unipaper because the admin panel needs database write permissions to create folders, save uploaded PDF metadata, edit files, delete files, and seed the first admin.

Connection test results:

- `npm run doctor`: passed.
- Read-only MongoDB user connection: passed.
- Main read/write MongoDB user connection: failed with `bad auth : authentication failed`.
- Database users screenshot confirms `vikramroys2001_db_user` exists with `atlasAdmin@admin`.
- Retried likely password correction from screenshot, but Atlas still returned `bad auth`.

Meaning:

The cluster host and network access are working. The read-only user is valid. The main write user credentials in `MONGODB_URI` are not accepted by Atlas, or that user was not created/saved.

Required fix:

Create or update a MongoDB Atlas database user for the main backend with write permission. For development, use either:

- `Atlas Admin`, or
- `Read and write to any database`

Then replace the username/password in `MONGODB_URI` inside `backend/.env`.

Best next step:

Reset the password for `vikramroys2001_db_user` in Atlas to a known simple password, then update `backend/.env`.

Update:

A new Atlas admin database user was created:

```env
MONGODB_USERNAME=adminfirst9876
MONGODB_URI=mongodb+srv://adminfirst9876:provided_password@cluster0.9yv5jfo.mongodb.net/unipaper?retryWrites=true&w=majority&appName=Cluster0
```

This user has `atlasAdmin@admin`, so it is now used as the main backend database user.

Database setup completed:

- `npm run doctor`: passed.
- `npm run seed:admin`: passed.
- `npm run seed:folders`: passed.
- Backend server started successfully.
- `/api/health`: passed.
- `/api/ready`: passed.
- `/api/folders`: returned the seeded B.Tech folder tree.

Current local login:

```env
ADMIN_EMAIL=admin@unipaper.local
ADMIN_PASSWORD=stored_in_backend_env
```

Open the admin panel:

```text
http://127.0.0.1:5173/admin/login
```

Read-only user verification:

- Read-only MongoDB user can read data from the `unipaper` database.
- Test read result: `folders=169`.
- Test write was blocked by Atlas with: `user is not allowed to do action [insert] on [unipaper.readonly_test]`.

Conclusion:

The read-only user is working correctly. It can view database data but cannot insert/write data.

---

## Existing Web Page Integration - May 09, 2026

Target design folder:

```text
C:\Users\mohit\Downloads\djwebbb (1)\djwebbb
```

Integration rule:

- The existing retro Unipaper design is the source of truth.
- The CRT hero, search box, browse-subject cards, review carousel, reactions panel, and footer are preserved.
- Backend/API files are copied into the same folder so the project can run as one full-stack workspace.

Files prepared for that folder:

- `index.html` updated with a live "Browse All Files" results section.
- `script.js` wired to the Express backend.
- `style.css` extended with matching retro styles for file result cards and admin UI.
- `admin.html` added for `/admin`.
- `admin.js` added for admin login, folder management, PDF upload/delete, file viewing, and review moderation.
- `site-server.js` added so `/` serves the public page and `/admin` serves the admin panel.
- `backend/` copied with MongoDB Atlas, Cloudinary, JWT auth, admin routes, public routes, and review routes.
- `docs/`, `README.md`, `.gitignore`, and this `unipaper.md` copied for handoff documentation.

Public user flow completed:

- Student opens the homepage.
- Student can search from the CRT search box.
- Student can click tags or subject cards.
- Student can click "Browse All" or refresh the live file section.
- Student can filter by `Notes`, `Assignments`, `PYQ`, and `Syllabus`.
- Student can view PDF URLs.
- Student can download files; the backend increments the download counter.
- Student can submit a review; the review goes to the database with `pending` status.
- Approved reviews are loaded from MongoDB and shown in the moving review carousel.

Admin flow completed:

- Admin opens `/admin`.
- Admin logs in using the seeded website admin account from `backend/.env`.
- Admin can view total files, folders, downloads, and this month's uploads.
- Admin can create folders with parent-child structure.
- Admin can delete folders and their files.
- Admin can upload PDFs to Cloudinary through the backend.
- Admin can save file metadata to MongoDB.
- Admin can search and delete files.
- Admin can approve, reject, and delete student reviews.

Review backend additions completed:

- `Review` MongoDB model added.
- Public review routes added:
  - `GET /api/reviews`
  - `POST /api/reviews`
- Admin review routes added:
  - `GET /api/admin/reviews`
  - `PATCH /api/admin/reviews/:id`
  - `DELETE /api/admin/reviews/:id`
- Audit actions added:
  - `UPDATE_REVIEW`
  - `DELETE_REVIEW`

How to run after copying into the design folder:

```powershell
npm install
npm run doctor
npm run seed:admin
npm run seed:folders
npm run start:backend
```

Open a second terminal in the same folder:

```powershell
npm run serve:site
```

Open:

```text
Public site: http://127.0.0.1:8080
Admin panel: http://127.0.0.1:8080/admin
Backend API: http://localhost:5000/api/health
```

Secret handling:

- Real MongoDB, Cloudinary, JWT, and admin password values are stored in `backend/.env`.
- This report lists the variable names and workflow, but does not repeat full secrets.
- For deployment, copy the same environment variable names into Render/Railway/Vercel/Fly/etc. and rotate any key that was exposed in screenshots.

Current completion checklist:

- [x] Read the provided Unipaper blueprint.
- [x] Built Express/MongoDB/Cloudinary backend.
- [x] Added JWT admin authentication.
- [x] Added public file search and browse APIs.
- [x] Added admin folder/file upload/delete APIs.
- [x] Added review submission and moderation APIs.
- [x] Integrated the existing static design with backend search/browse/download.
- [x] Added `/admin` page in the same visual style.
- [x] Prepared safe copy plan with backup before writing to the external design folder.
- [x] Copy staged project into `C:\Users\mohit\Downloads\djwebbb (1)\djwebbb`.
- [x] Run final checks from that copied location.

Final copied-location checks:

- `node --check script.js`: passed.
- `node --check admin.js`: passed.
- `node --check site-server.js`: passed.
- Backend source syntax checks: passed.
- `npm install`: passed with 0 vulnerabilities.
- `npm run doctor`: passed.
- Backend started at `http://localhost:5000`.
- Static site started at `http://127.0.0.1:8080`.
- `/api/docs`: passed and includes review routes.
- `/api/reviews`: passed.
- Admin login API check: passed.
- Admin stats API check: passed.
- Public page startup UX fix: latest files load without forcing the visitor away from the hero.
- Final `node --check script.js` after that UX fix: passed.

Backup created before modifying the design folder:

```text
C:\Users\mohit\Downloads\djwebbb (1)\djwebbb\_backup_before_unipaper_integration_20260509_225642
```

---

## Full Route Smoke Test - May 09, 2026

Checked project folder:

```text
C:\Users\mohit\Downloads\djwebbb (1)\djwebbb
```

Server status:

- Backend running: `http://localhost:5000`
- Public site running: `http://127.0.0.1:8080`
- Admin panel running: `http://127.0.0.1:8080/admin`
- MongoDB Atlas connection: passed.
- Cloudinary storage connection: passed.
- `npm run doctor`: passed.
- `node --check script.js`: passed.
- `node --check admin.js`: passed.
- `node --check site-server.js`: passed.

Static page checks:

- `GET /`: `200 OK`
- `GET /admin`: `200 OK`
- Public page contains live library section.
- Admin page contains login and upload controls.

Public API routes checked:

- `GET /api/health`: passed.
- `GET /api/ready`: passed.
- `GET /api/docs`: passed.
- `GET /api/folders`: passed.
- `GET /api/files`: passed.
- `GET /api/files/search`: passed.
- `GET /api/files/:id`: passed using a temporary uploaded PDF.
- `GET /api/folders/:id/files`: passed using a temporary folder.
- `POST /api/files/:id/download`: passed and incremented the download counter.
- `GET /api/reviews`: passed.
- `POST /api/reviews`: passed and created a pending review.

Auth routes checked:

- `POST /api/auth/login`: passed.
- `GET /api/auth/me`: passed.
- `POST /api/auth/logout`: passed.

Admin API routes checked:

- `GET /api/admin/stats`: passed.
- `GET /api/admin/folders`: passed.
- `POST /api/admin/folders`: passed with a temporary folder.
- `PUT /api/admin/folders/:id`: passed.
- `DELETE /api/admin/folders/:id`: passed and cleaned the temporary folder.
- `GET /api/admin/files`: passed.
- `POST /api/admin/files`: passed with a temporary PDF upload to Cloudinary.
- `PUT /api/admin/files/:id`: passed.
- `DELETE /api/admin/files/:id`: passed and deleted the temporary Cloudinary file.
- `GET /api/admin/audit-logs`: passed.
- `GET /api/admin/reviews`: passed.
- `PATCH /api/admin/reviews/:id`: passed and approved a temporary review.
- `DELETE /api/admin/reviews/:id`: passed and cleaned the temporary review.

Important behavior verified:

- Public students can read/search folders and files without admin login.
- Admin-only routes require login cookie.
- Admin can create and update folder structure.
- Admin can upload a PDF through the backend.
- Uploaded PDF metadata is saved in MongoDB.
- PDF file storage uses Cloudinary.
- Public download route increments the file download counter.
- Public review submission creates a pending review.
- Admin approval makes a review visible in the public approved-review feed.
- Delete routes clean up files, folders, and reviews correctly.

Cleanup result:

- Temporary smoke-test file deleted.
- Temporary smoke-test folder deleted.
- Temporary smoke-test review deleted.
- Final cleanup check: `TotalFiles=0`, `TotalFolders=169`, `SmokeFoldersLeft=0`.

Note:

- While running repeated admin checks quickly, the login rate limiter triggered once with `429 Too Many Requests`. This is expected and confirms login protection is active. The backend was restarted once for a clean final smoke pass.
- No passwords, JWT values, MongoDB passwords, or Cloudinary secrets are written into this report. They remain in `backend/.env`.

---

## Cloudflare R2 Migration Plan - May 10, 2026

Goal:

Replace new PDF uploads from Cloudinary to Cloudflare R2 while keeping the existing Unipaper frontend, MongoDB metadata model, and admin upload flow.

Code changes prepared:

- Added `backend/src/config/r2.js`.
- Updated `backend/src/services/storage.service.js` to support:
  - R2 upload with S3-compatible `PutObjectCommand`.
  - R2 delete with `DeleteObjectCommand`.
  - Public PDF URL generation from `R2_PUBLIC_URL`.
  - Legacy Cloudinary fallback until R2 is configured.
  - Local fallback if neither R2 nor Cloudinary is configured.
- Added `r2` to `MaterialFile.storageProvider`.
- Updated `/api/ready` and `/api/docs` to show the active storage mode.
- Updated `npm run doctor` to check R2 configuration.
- Added `@aws-sdk/client-s3` dependency.
- Updated `.env.example`, `README.md`, and `docs/SETUP.md`.

Environment variables required for R2:

```env
STORAGE_PROVIDER=auto
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=
R2_REGION=auto
R2_PREFIX=unipaper/pdfs
```

How storage selection works:

- If all R2 values are filled, `STORAGE_PROVIDER=auto` uses R2.
- If R2 values are empty but old Cloudinary values are still present, uploads keep using Cloudinary.
- If both cloud providers are empty, development uploads go to local `backend/uploads/pdfs`.
- If you set `STORAGE_PROVIDER=r2`, the backend will require R2 values and fail doctor if any value is missing.

Values needed from Cloudflare:

- Cloudflare Account ID.
- R2 bucket name.
- R2 Access Key ID.
- R2 Secret Access Key.
- R2 S3 endpoint.
- Public bucket URL, either:
  - Cloudflare-managed `r2.dev` URL for development, or
  - custom domain for production.

Cloudflare dashboard steps:

1. Open Cloudflare Dashboard.
2. Go to `Storage & databases > R2`.
3. Create a bucket, for example `unipaper-pdfs`.
4. Open R2 `Overview`.
5. Select `Manage API Tokens`.
6. Create an API token.
7. Choose `Object Read & Write`.
8. Scope it to the specific Unipaper bucket only.
9. Copy `Access Key ID` and `Secret Access Key`.
10. Copy the Account ID.
11. Use endpoint:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Public URL setup:

- For quick development, open the bucket settings and enable the public `r2.dev` development URL.
- For production, connect a custom domain to the bucket and use that domain as `R2_PUBLIC_URL`.

Security note:

- Do not paste Cloudflare account password or global API key into the project.
- Only paste R2 bucket-scoped Access Key ID and Secret Access Key into `backend/.env`.
- Do not write R2 secrets into this report or GitHub.

Implementation status:

- R2 code copied into the Downloads project.
- `backend/.env` now has blank R2 fields ready for your values.
- `npm install` completed and installed `@aws-sdk/client-s3`.
- Syntax checks for R2 config, storage service, public controller, doctor, and file model passed.
- `npm run doctor` passed.
- Current active storage mode is still `cloudinary` because R2 values are blank and Cloudinary fallback is still configured.
- After R2 values are pasted, `STORAGE_PROVIDER=auto` will switch uploads to R2 automatically.

---

## UploadThing Storage Migration - May 10, 2026

Goal:

Use UploadThing as the active PDF storage provider because it is fast to set up, does not require a credit card on the starter plan, handles PDF MIME types cleanly, and gives public CDN URLs.

Code changes completed:

- Added `backend/src/config/uploadthing.js`.
- Added UploadThing support to `backend/src/services/storage.service.js`.
- Added `uploadthing` to `MaterialFile.storageProvider`.
- Updated `npm run doctor` to validate `UPLOADTHING_TOKEN`.
- Added the `uploadthing` dependency.
- Added UploadThing variables to `backend/.env` and `backend/.env.example`.
- Set `STORAGE_PROVIDER=uploadthing`.

Environment variables:

```env
STORAGE_PROVIDER=uploadthing
UPLOADTHING_TOKEN=stored_in_backend_env
UPLOADTHING_APP_ID=stored_in_backend_env
```

Security note:

- UploadThing keys must stay in `backend/.env`.
- Do not put UploadThing keys in GitHub, frontend JavaScript, or this report.
- Since keys were pasted during setup, rotate the UploadThing secret key before public deployment.

Smoke test result:

- Backend restarted with UploadThing active.
- `/api/ready` reported `storage.provider=uploadthing`.
- Temporary PDF upload through `POST /api/admin/files`: passed.
- MongoDB metadata save: passed.
- Public API read through `GET /api/files/:id`: passed.
- Public file host: `vi3y7e6npv.ufs.sh`.
- Temporary file delete through `DELETE /api/admin/files/:id`: passed.
- Temporary folder cleanup: passed.

Current storage decision:

- New uploads use UploadThing.
- Existing Cloudinary files, if any, can still be deleted because legacy Cloudinary support remains in the backend.
- R2 support was removed from the active backend after choosing UploadThing, so the storage stack is simpler.
- Active storage stack is now UploadThing for new uploads, Cloudinary legacy fallback/delete, and local development fallback.

Final UploadThing cleanup:

- Removed active R2 storage code.
- Removed `@aws-sdk/client-s3` from backend dependencies.
- Removed `backend/src/config/r2.js`.
- Removed R2 environment fields from the active `.env` template.
- Kept Cloudinary support only as legacy fallback/delete support.
- Reinstalled dependencies after cleanup; AWS SDK packages were pruned.
- Final syntax checks passed for storage service, doctor, file model, and UploadThing config.
- Final `npm run doctor` passed with active storage mode `uploadthing`.
- Final UploadThing smoke test passed:
  - temporary PDF uploaded to `vi3y7e6npv.ufs.sh`,
  - MongoDB metadata read through public API,
  - UploadThing file deleted,
  - temporary folder deleted.

---

## Final Fix Pass - May 10, 2026

Goal:

Close the remaining Antigravity review items without changing the public design direction.

Completed fixes:

- Public API calls stay same-origin through `site-server.js`, so the frontend can run on `http://127.0.0.1:8080` without browser CORS failures.
- The top navigation `Join Club` button now routes to `/admin`, because real uploads are admin-only.
- Removed the stale public upload JavaScript that used `preventDefault()` and did not call the backend.
- Reworked the old public upload modal into an admin redirect note, so the public site no longer pretends to upload files.
- Fixed admin logout wiring to use the real `admin-logout-btn` element.
- Changed admin upload status text from Cloudinary to UploadThing.
- Added debounce to admin file search so typing does not hammer the backend.
- Added dashboard error handling so failed admin sub-requests show a visible status message.
- Kept review carousel pause/resume on tab visibility changes.
- Kept review terminal reset after successful review submission.
- Replaced tiny base `vw` CRT font sizes with `clamp()` values for mobile readability.
- Confirmed review status validation exists at controller level.
- Updated `seedAdmin.js` so the mongoose connection closes on both success and error paths.

Verification completed:

```bash
node --check script.js
node --check admin.js
node --check site-server.js
node --check backend/src/utils/seedAdmin.js
node --check backend/src/controllers/review.controller.js
```

All checks passed.

Additional check:

- `npm.cmd run doctor` passed in the real Downloads backend and confirmed active storage mode is `uploadthing`.
- `npm.cmd audit --omit=dev` could not complete because the npm audit endpoint returned an error, so dependency audit results are not confirmed yet.

Security note:

- UploadThing, MongoDB, Cloudinary, JWT, and admin secrets are stored in `backend/.env`.
- Do not paste those secrets into frontend files, GitHub, or public documentation.
- Rotate any keys that were shared in chat before deployment.

---

## Admin Team, Powers, And Real-World Control Panel - May 10, 2026

Goal:

Turn the admin panel from a single-admin upload screen into a real-world control room where the owner can create admins, delete admins, suspend admins, and control each admin's powers.

Implemented now:

- Added account permissions to the `User` model.
- Added admin account status: `active` or `suspended`.
- Added admin roles:
  - `read_only`: can view dashboard, folders, files, and reviews.
  - `writer`: can upload files and create folders, but cannot delete critical data.
  - `manager`: can manage folders, files, reviews, and audit logs.
  - `admin`: legacy admin role with manager-level powers.
  - `super_admin`: full power, including admin/team control.
- Added permission values:
  - `dashboard:read`
  - `folders:read`
  - `folders:write`
  - `folders:delete`
  - `files:read`
  - `files:write`
  - `files:delete`
  - `reviews:read`
  - `reviews:moderate`
  - `admins:read`
  - `admins:write`
  - `audit:read`
- Added backend permission middleware so routes are protected server-side.
- Added admin management APIs:
  - `GET /api/admin/admins`
  - `POST /api/admin/admins`
  - `PUT /api/admin/admins/:id`
  - `DELETE /api/admin/admins/:id`
- Added protection against deleting your own account.
- Added protection against removing the last active super admin.
- Added protection so only super admins can grant full-power access.
- Added audit log actions for admin create, update, and delete.
- Updated admin login/session response to return current permissions.
- Added an Admin Team & Powers section to the admin dashboard.
- Added a create-admin form with username, email, temporary password, role preset, and custom permission checkboxes.
- Added admin account cards with quick actions:
  - Read Only
  - Writer
  - Manager
  - Full
  - Suspend / Activate
  - Delete
- Added frontend permission visibility so lower-power admins do not see admin-only sections.
- Updated `seedAdmin.js` so the first seeded admin is a full-power super admin.

Verification completed:

```bash
node --check backend/src/models/User.js
node --check backend/src/middleware/auth.js
node --check backend/src/controllers/auth.controller.js
node --check backend/src/controllers/adminUsers.controller.js
node --check backend/src/routes/admin.routes.js
node --check backend/src/models/AuditLog.js
node --check backend/src/utils/seedAdmin.js
node --check admin.js
npm.cmd run doctor
node -e "import('./backend/src/app.js').then(() => console.log('app-import-ok'))"
```

All checks passed in the real Downloads project.

Must-have admin panel modules for a real project:

- Admin team and permissions.
- Folder/course/semester/subject/category management.
- PDF upload pipeline and storage status.
- File search, rename, move, deactivate, delete.
- Review moderation.
- Audit logs.
- Dashboard analytics.
- Storage usage monitor.
- Failed upload monitor.
- User download analytics.
- Public content quality checklist.
- Bulk import/export tools.
- Backup and restore workflow.
- Security settings.
- Maintenance mode.
- System health and environment doctor.

500-Idea Roadmap For Unipaper

The list below is grouped as 50 clusters of 10 concrete ideas each, giving 500 possible real-world improvements without making the project messy.

1-10 Admin accounts: invite admins; create admins; suspend admins; delete admins; force password reset; show last login; show creator; admin profile page; admin activity timeline; admin notes.
11-20 Permissions: read-only role; writer role; manager role; super admin role; custom permissions; permission templates; route-level enforcement; UI hiding by permission; permission audit; permission change history.
21-30 Security: strong password rules; login rate limit; session expiry; logout all devices; suspicious login alerts; IP allowlist option; account lockout; password rotation reminder; secure cookies; production secret checklist.
31-40 Dashboard: total files; total folders; total downloads; uploads this month; top subjects; latest uploads; failed uploads; storage provider status; review queue count; admin activity feed.
41-50 Folder system: create course; create semester; create subject; create category; rename folder; delete folder tree; move folder; duplicate structure; archive semester; folder path preview.
51-60 Files: upload PDF; rename file; delete file; move file; deactivate file; restore file; file versioning; file tags; file owner; file size display.
61-70 Search: title search; subject search; tag search; semester filter; category filter; fuzzy search; recent search chips; no-result suggestions; search analytics; typo correction.
71-80 Public library: file explorer view; grid view; list view; breadcrumbs; folder badges; download button; view button; file metadata; popular files; newly added files.
81-90 PDF UX: inline preview; open new tab; download tracking; mobile viewer; page count; preview thumbnail; safe MIME handling; broken PDF warning; file source label; view history.
91-100 Upload quality: PDF-only validation; file size validation; duplicate file warning; required folder path; upload progress; retry failed upload; upload success receipt; metadata review; title cleanup; tag suggestions.
101-110 Reviews: submit review; pending queue; approve review; reject review; delete review; filter by status; review spam guard; reviewer role field; approved carousel; review audit log.
111-120 Reactions: useful reaction; easy reaction; confusing reaction; helpful count; per-file reactions; per-review reactions; backend reaction storage; duplicate reaction guard; reaction analytics; reaction reset tool.
121-130 Analytics: downloads by file; downloads by subject; downloads by semester; search terms; failed searches; active days; top categories; admin actions; storage growth; monthly report.
131-140 Audit logs: login log; upload log; delete log; folder log; review log; admin change log; filter by admin; filter by action; export CSV; retention policy.
141-150 Notifications: admin upload success; admin delete warning; review pending badge; storage warning; failed upload alert; new semester reminder; email digest; browser toast; system banner; maintenance notice.
151-160 Bulk tools: bulk PDF upload; bulk tag edit; bulk category move; bulk deactivate; bulk delete; bulk folder import; CSV metadata import; CSV export; zip import plan; duplicate scan.
161-170 Data quality: missing subject check; missing semester check; duplicate title check; invalid category check; broken URL checker; empty folder checker; old material flag; spelling cleanup; tag normalization; title format rules.
171-180 Storage: UploadThing status; Cloudinary legacy delete; local fallback; storage provider badge; storage usage estimate; orphan file cleanup; failed deletion queue; CDN URL checker; file host migration; storage cost notes.
181-190 MongoDB: connection doctor; indexes; text index; schema validation; backup plan; readonly user; admin user separation; IP access checklist; production URI; migration notes.
191-200 Deployment: local mode; production mode; environment guide; Vercel plan; Render plan; Railway plan; domain setup; HTTPS checklist; CORS checklist; deployment rollback.
201-210 UI polish: CRT hero; file explorer; admin command room; retro buttons; status badges; loading skeletons; empty states; mobile layout; keyboard focus; accessible labels.
211-220 Icons: folder icons; PDF icons; lock icons; upload icons; download icons; search icons; admin icons; review icons; warning icons; analytics icons.
221-230 Mobile: responsive nav; readable hero text; touch-friendly buttons; mobile folder browser; sticky search; mobile admin forms; mobile file cards; reduced animation; safe modals; keyboard handling.
231-240 Performance: API pagination; debounce search; lazy load folders; compressed assets; cache headers; small thumbnails; avoid huge DOM; batch stats; indexed queries; CDN delivery.
241-250 Reliability: API health check; readiness check; storage smoke test; Mongo smoke test; upload rollback; graceful error handler; duplicate key messages; not-found pages; fallback samples; logs directory.
251-260 Admin UX: save confirmations; danger confirmations; disabled buttons while loading; inline errors; status box; quick filters; clear search; refresh buttons; copy file URL; copy folder path.
261-270 Student UX: find notes fast; browse by course; browse by semester; browse by subject; download PYQs; see syllabus; see assignments; save favorites; recently viewed; report broken file.
271-280 Content moderation: report file; hide file; approve upload; reject upload; admin notes; content source; copyright flag; duplicate report; unsafe title filter; moderation queue.
281-290 Future user accounts: student login; bookmarks; download history; request material; follow subject; notification preferences; profile; branch/year; saved searches; contribution score.
291-300 Request system: request notes; request PYQ; request syllabus; vote on request; mark fulfilled; assign admin; request deadline; request comments; request status; request analytics.
301-310 Contribution workflow: student upload request; admin approval; contributor name; contributor badge; contribution history; duplicate check; virus scan plan; metadata review; rejection reason; contributor leaderboard.
311-320 AI features: auto tags; title cleanup; syllabus summarizer; notes summary; related files; search suggestions; duplicate detection; OCR text extraction; topic extraction; chatbot search.
321-330 Gemini/OpenAI optional: admin content helper; tag generator; description generator; folder suggestion; FAQ assistant; broken query helper; review sentiment; audit summary; analytics summary; safe prompt policy.
331-340 Reports: weekly uploads; monthly downloads; top subjects; inactive folders; storage report; admin activity report; review report; request report; security report; deployment report.
341-350 Exports: file CSV; folder CSV; audit CSV; review CSV; admin CSV; analytics CSV; Mongo backup; metadata JSON; public sitemap; storage manifest.
351-360 Imports: folder CSV import; file metadata import; semester template import; subject template import; tag import; admin import; review import; backup restore; dry-run import; import error report.
361-370 Compliance: privacy note; terms page; copyright request; takedown workflow; admin accountability; data retention; secret handling; API key rotation; access logs; legal contact.
371-380 Testing: route tests; auth tests; permission tests; upload tests; search tests; review tests; admin UI tests; smoke tests; mobile screenshot tests; deployment tests.
381-390 Developer tools: npm doctor; seed admin; seed folders; sample PDFs; env example; API docs; setup docs; changelog; debug logs; reset local data.
391-400 Error states: offline backend; expired login; no permission; upload failed; file too large; invalid PDF; duplicate folder; invalid folder path; storage down; Mongo down.
401-410 Admin safety: soft delete; restore bin; delete cooldown; second confirmation; owner-only full delete; cannot delete self; cannot remove last super admin; dangerous action audit; rollback notes; export before delete.
411-420 Collaboration: assign folders to admins; ownership labels; comments on files; internal notes; review handoff; admin mentions; task queue; upload checklist; reviewer assignment; status board.
421-430 Personalization: admin theme; compact mode; dense list; saved filters; default course; default semester; recent folders; favorite actions; keyboard shortcuts; pinned dashboard cards.
431-440 Accessibility: focus outlines; semantic buttons; label inputs; color contrast; reduced motion; text scaling; screen-reader states; keyboard modals; skip links; accessible tables.
441-450 Internationalization: Hindi labels; English labels; mixed language helper text; locale dates; semester naming variants; branch naming variants; search aliases; category aliases; admin language setting; translation file.
451-460 SEO/public: metadata; OpenGraph; sitemap; robots; clean URLs; subject pages; semester pages; file titles; canonical paths; performance score.
461-470 Observability: request logs; error logs; storage logs; slow query logs; frontend console logs; uptime ping; health dashboard; alert email; log search; log export.
471-480 Monetization/future: donation button; sponsor notes; premium storage plan; college license; department dashboard; print service; ad-free mode; analytics package; custom domain; campus onboarding.
481-490 Integrations: Google Drive import; OneDrive import; Telegram share; WhatsApp share; email digest; Google Analytics; Cloudflare CDN; GitHub backup; Notion roadmap; Slack/Discord alerts.
491-500 Final polish: onboarding checklist; launch checklist; demo data; sample admin accounts; production warning banner; version number; changelog page; credits page; help page; feedback form.

---

## Icon Monitor And Admin Roadmap UI Pass - May 10, 2026

Goal:

Continue the frontend/admin polish pass from the user's request: make the page feel icon-rich, keep the monitor design, and make the admin panel show the real-world systems that must exist in a mature project.

Completed:

- Added a new public `1000+ Icon Study Map` section in `index.html`.
- Used the existing Font Awesome library so the project has access to a large icon catalog without adding hundreds of image files.
- Added a dense icon mosaic for:
  - courses,
  - folders,
  - PDFs,
  - search,
  - uploads/downloads,
  - coding,
  - database,
  - security,
  - admin powers,
  - analytics,
  - science,
  - engineering,
  - moderation,
  - actions.
- Added responsive CSS for the icon atlas in `style.css`.
- Added a `Control Panel Must-Haves` section to `admin.html`.
- Added admin command cards for:
  - Team Powers,
  - Folder System,
  - PDF Pipeline,
  - Review Queue,
  - Audit Logs,
  - Analytics,
  - Backups,
  - Security,
  - Reports,
  - Storage Health.
- Added responsive styling for the admin command grid.

Design decision:

- I did not render literal 1000 separate visible icons because that would slow the page and make the interface noisy.
- Instead, the page uses a real icon library and shows a dense curated atlas, while keeping the UI usable.
