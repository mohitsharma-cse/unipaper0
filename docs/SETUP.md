# Unipaper Setup And Operations

## First-Time Setup

Install dependencies:

```bash
npm install
```

Create environment files:

```powershell
Copy-Item backend\.env.example backend\.env
```

Fill `backend/.env`:

```env
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=long_random_secret_min_32_chars
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
CLIENT_URL=http://localhost:5173
```

UploadThing storage:

```env
STORAGE_PROVIDER=uploadthing
UPLOADTHING_TOKEN=your_uploadthing_token
UPLOADTHING_APP_ID=your_uploadthing_app_id
UPLOADTHING_STORAGE_KEY=uploadthing-1
UPLOADTHING_STORAGE_LABEL=UploadThing 1
UPLOADTHING_2_KEY=uploadthing-2
UPLOADTHING_2_LABEL=UploadThing 2
UPLOADTHING_2_TOKEN=your_second_uploadthing_token
UPLOADTHING_2_APP_ID=your_second_uploadthing_app_id
```

Legacy Cloudinary fallback:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_STORAGE_LABEL=Cloudinary
```

Admins can choose any configured UploadThing destination in the Upload PDF form. Cloudinary stays available only for old file records and is not shown as a new upload destination. If UploadThing is not configured, development uploads go to `backend/uploads/pdfs`.

## Check Configuration

```bash
npm run doctor
```

## Seed Admin And Starter Folders

```bash
npm run seed:admin
npm run seed:folders
```

## Run Locally

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run serve:site
```

Open:

```text
http://127.0.0.1:8080
```

Admin:

```text
http://127.0.0.1:8080/admin
```

## Production Checklist

- On Azure App Service, use Node 20+ and startup command `npm start`.
- Set `NODE_ENV=production`.
- Set `CLIENT_URL` and `API_PUBLIC_URL` to the Azure HTTPS URL, for example `https://your-app.azurewebsites.net`.
- Set `COOKIE_SAME_SITE=none` and keep cookies secure over Azure HTTPS.
- Add both UploadThing accounts as app settings: `UPLOADTHING_TOKEN` and `UPLOADTHING_2_TOKEN`, plus their labels and app IDs.
- Use UploadThing for production file storage.
- Use a strong JWT secret.
- Keep `.env` out of GitHub and put secrets in Azure App Service Configuration instead.
- Set the Azure health check path to `/api/ready`.
- Run one full flow after deployment: login, create folder, upload PDF, public search, preview, download, delete.
