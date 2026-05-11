# Unipaper Setup And Operations

## First-Time Setup

Install dependencies:

```bash
npm install
```

Create environment files:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
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
UPLOADTHING_STORAGE_LABEL=UploadThing
```

Legacy Cloudinary fallback:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_STORAGE_LABEL=Cloudinary
```

Admins can choose any configured storage destination in the Upload PDF form. If both UploadThing and Cloudinary are configured, both appear as options. If UploadThing and Cloudinary are not configured, development uploads go to `backend/uploads/pdfs`.

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
npm run dev:frontend
```

Open:

```text
http://127.0.0.1:5173
```

Admin:

```text
http://127.0.0.1:5173/admin/login
```

## Production Checklist

- Set all backend environment variables on Render/Railway.
- Set `VITE_API_URL` on Vercel.
- Use UploadThing for production file storage.
- Set `CLIENT_URL` to the deployed frontend URL.
- Use a strong JWT secret.
- Keep `.env` out of GitHub.
- Run one full flow after deployment: login, create folder, upload PDF, public search, preview, download, delete.
