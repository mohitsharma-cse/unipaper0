# 🎓 unipaper0 - Ultimate Academic Resource Platform

**UniPapers** is a high-performance, full-stack university study material management system designed with a premium retro-gaming aesthetic. It features a robust Express.js/MongoDB backend and a dynamic, GSAP-powered frontend.

![UniPapers Banner](bg.png)

## 🚀 Key Features

### 📂 Sophisticated File Management
- **Windows-Style Hierarchy:** Cascading folder navigation (Courses → Subjects → Categories).
- **Icon Intelligence:** Context-aware iconography for every academic discipline.
- **Dynamic Search:** Real-time search across thousands of academic documents.

### 🛡️ Professional Administration
- **Granular Permissions:** Role-based access control (Super Admin, Manager, Writer, Read-Only).
- **Review Moderation:** Comprehensive system for student feedback and content verification.
- **Audit Logging:** Full tracking of administrative actions for security.

### 💅 Premium Design System
- **Pixel-Perfect Aesthetics:** Modern "Glassmorphism" mixed with nostalgic 8-bit visual cues.
- **Smooth Transitions:** Powered by GSAP (GreenSock Animation Platform) for high-end interaction feel.
- **Responsive Layout:** Optimized for both desktop research and mobile quick-access.

---

## 🛠️ Technical Stack

- **Backend:** Node.js, Express.js, MongoDB (Atlas), JWT Authentication.
- **Frontend:** HTML5, CSS3, JavaScript (ES6+), GSAP Animation Library.
- **Security:** Bcrypt password hashing, Cookie-based JWT sessions, Permission-based middleware.

---

## 🏁 Quick Start Guide

### 1. Installation
Clone the repository and install dependencies in the root directory:
```bash
npm install
```

### 2. Configuration
Create a `.env` file in the `backend/` directory based on the provided examples:
```bash
# Example backend/.env content
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_key
```

### 3. Database Seeding
Initialize the system with a first admin account and the base folder structure:
```bash
# Seed the master admin
npm run seed:admin

# Seed the B.Tech folder tree
npm run seed:folders
```

### 4. Running the Platform
Start both the API and the Static Server:
```bash
# Run the API Backend
npm run dev:backend

# Run the Site Server (Frontend)
npm run serve:site
```
- **Public Site:** `http://localhost:8080`
- **Admin Dashboard:** `http://localhost:8080/admin`

---

## 📝 License
This project is part of the UniPapers academic ecosystem. Built for speed, reliability, and style.
