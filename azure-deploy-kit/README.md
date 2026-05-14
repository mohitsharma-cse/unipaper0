# Azure Deploy Kit

This folder is the one-stop place for the important Azure deployment code and settings for Unipaper.

Use Azure App Service for this project because the Express backend and the static frontend run together from `npm start`.

## What Azure Needs

- Node.js 22 runtime.
- Startup command: `npm start`.
- Root `package.json` and `package-lock.json`.
- Backend files under `backend/src`.
- Frontend files: `index.html`, `admin.html`, `style.css`, `script.js`, `admin.js`, `bg.png`, `mobile-bg.png`.
- Azure App Settings from `required-app-settings.env.example`.
- MongoDB Atlas connection string.
- UploadThing token for production PDF uploads.

## Automatic Install Flow

GitHub Actions already runs the same production flow:

```bash
npm ci
npm run build
npm run test --if-present
npm prune --omit=dev
```

For local verification on Windows, run:

```powershell
powershell -ExecutionPolicy Bypass -File azure-deploy-kit\install-and-verify.ps1
```

## Azure Portal Values

- Runtime stack: `Node 22 LTS`
- Startup command: `npm start`
- Health check path: `/api/ready`
- App Settings: copy names from `required-app-settings.env.example`

Do not upload `backend/.env` to Azure. Azure App Settings replace it in production.

## After Deploy

Open these URLs:

```text
https://your-app.azurewebsites.net/api/health
https://your-app.azurewebsites.net/api/ready
https://your-app.azurewebsites.net/admin
```

Then test login, folder creation, PDF upload, public search, preview, download, review submit, and review approval.
