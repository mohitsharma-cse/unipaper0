# Unipaper API Reference

Base URL in development:

```text
http://localhost:5000
```

## System

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Basic API liveness check |
| GET | `/api/ready` | Checks database readiness and storage mode |
| GET | `/api/docs` | JSON list of available routes |

## Public Library

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/folders` | Returns nested folder tree |
| GET | `/api/folders/:id/files` | Returns files in a folder |
| GET | `/api/files` | Lists public files with optional filters |
| GET | `/api/files/search?q=dbms` | Searches files by title, subject, course, semester, category, and tags |
| GET | `/api/files/:id` | Returns one file |
| GET | `/api/files/:id/pdf` | Streams the PDF inline from whichever storage holds it |
| GET | `/api/files/:id/download` | Streams the PDF as a download from whichever storage holds it |
| POST | `/api/files/:id/download` | Increments download count and returns API PDF URLs |

Supported file query filters:

```text
course
semester
subject
category
folderId
page
limit
```

## Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Admin login, sets httpOnly cookie |
| POST | `/api/auth/logout` | Clears admin cookie |
| GET | `/api/auth/me` | Returns current admin session |

Login body:

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

## Admin

All admin routes require the JWT cookie from login.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/storage-options` | Lists safe storage destinations admin can choose during upload |
| GET | `/api/admin/folders` | Flat and nested folder data |
| POST | `/api/admin/folders` | Create folder |
| PUT | `/api/admin/folders/:id` | Rename/update folder |
| DELETE | `/api/admin/folders/:id` | Delete folder and all child files |
| GET | `/api/admin/files` | List/manage all files |
| POST | `/api/admin/files` | Upload PDF with metadata |
| PUT | `/api/admin/files/:id` | Update file metadata |
| DELETE | `/api/admin/files/:id` | Delete file from database and storage |
| GET | `/api/admin/audit-logs` | Recent admin activity |

Folder body:

```json
{
  "name": "DBMS",
  "type": "subject",
  "parent": "mongodb-folder-id"
}
```

Upload body uses `multipart/form-data`:

```text
pdf: PDF file
title: DBMS Unit 1 Notes
course: B.Tech
semester: Semester 3
subject: DBMS
category: Notes
folderId: mongodb-folder-id
tags: dbms, normalization, unit 1
storageKey: uploadthing-1
```

`storageKey` must match one option returned by `GET /api/admin/storage-options`, such as `uploadthing-1` or `uploadthing-2`.
