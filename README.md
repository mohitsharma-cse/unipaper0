# Unipaper

Unipaper is a full-stack academic resource platform for browsing, searching, uploading, previewing, and downloading university study materials. The frontend is plain HTML/CSS/JavaScript, and the backend is Express with MongoDB, JWT admin authentication, review moderation, and PDF storage support.

## Stack

- Frontend: HTML, CSS, JavaScript, GSAP, Font Awesome
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT in httpOnly cookies
- Storage: UploadThing for production, local PDF storage for development
- Deployment target: Azure App Service

## Local Setup

Install dependencies:

```bash
npm install
```

Create a backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Fill `backend/.env`, then verify it:

```bash
npm run doctor
```

Seed the first admin and starter folders:

```bash
npm run seed:admin
npm run seed:folders
```

Run the app:

```bash
npm run start
```

Open:

```text
http://localhost:5000
http://localhost:5000/admin
```

For static-only frontend proxy development, run the backend and site server separately:

```bash
npm run dev:backend
npm run serve:site
```

## Azure

Use Azure App Service for this repository because the Express server and frontend are deployed together. Keep secrets in Azure App Service Configuration, not in `.env` or GitHub. See `docs/AZURE_DEPLOYMENT_CHECKLIST.md` for the full deployment checklist and app settings.

Before deployment, run:

```bash
npm run build
```

## Important Paths

- Public site: `index.html`, `style.css`, `script.js`
- Admin panel: `admin.html`, `admin.js`
- API entry: `backend/src/server.js`
- Express app: `backend/src/app.js`
- Azure workflow: `.github/workflows/main_justudynotes.yml`
