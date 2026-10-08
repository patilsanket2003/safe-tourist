# 🛡️ DAMINI 2 - Smart Tourist Safety System
### Complete Setup & Execution Guide for Any Operating System (Windows / macOS / Linux)

This project consists of 3 integrated services:
1. **Backend Server** (Node.js + Express + MongoDB Atlas + WebSockets + Hazard Risk Engine)
2. **Authority Command Center Dashboard** (Vite + React + Tailwind + Live Maps)
3. **Tourist Mobile & Web App** (React Native + Expo Web + SOS + Damini AI)

---

## 📋 System Prerequisites
Before running on another computer, install:
1. **Node.js** (v18, v20, or v22 recommended): [https://nodejs.org](https://nodejs.org)
2. **Git**: [https://git-scm.com](https://git-scm.com)
3. *(Optional)* **Expo Go** on Android/iPhone if you want to test the mobile app on a physical device.

---

## 🚀 Quick Start (Running Locally on Any System)

### Step 1: Extract the Project
Unzip `DAMINI 2.zip` to any folder on your computer.

---

### Step 2: Start the Backend Server

Open your terminal (PowerShell or Command Prompt on Windows, Terminal on Mac/Linux):

```bash
cd "path/to/DAMINI 2"
npm install
npm run dev
```

> **Backend will start on:** `http://localhost:5001`  
> ✅ Connects directly to **MongoDB Atlas Cloud Database**.  
> ✅ Automatically syncs the demonstration safety zones and accounts.

---

### Step 3: Start the Authority Dashboard (Command Center)

Open a **new terminal tab/window**:

```bash
cd "path/to/DAMINI 2/authority-dashboard"
npm install
npm run dev
```

> **Open in browser:** `http://localhost:5173` (or `http://localhost:5174`)  
> 
> **Admin Login Credentials:**
> - **Email:** `admin@safetrail.com` *(or `admin@system.gov`)*
> - **Password:** `admin123`

---

### Step 4: Start the Tourist App (Mobile & Web)

Open a **third terminal tab/window**:

```bash
cd "path/to/DAMINI 2/smart-safety"
npm install
npm run web
```
*(Or run `npx expo start` and press `w` to open web, or scan the QR code in Expo Go on your mobile phone).*

> **Open in browser:** `http://localhost:8081`  
> 
> **Tourist Login Credentials:**
> - **Email:** `2003sanketpatil@gmail.com` *(or `tourist@safetrail.com`)*
> - **Password:** `tourist123`
> *(You can also click "Create an account" to register a new tourist anytime).*

---

## 🌐 24/7 Live Deployed Cloud URLs
This project is already deployed live 24/7 on the cloud:

| Component | Platform | Live URL |
| :--- | :--- | :--- |
| **Tourist Mobile App** | **Vercel** | **https://smart-tourist-app-ashy.vercel.app** |
| **Authority Dashboard** | **Vercel** | **https://safe-tourist-liart.vercel.app** |
| **Backend API** | **Render** | **https://safe-tourist-backend-ix0g.onrender.com** |
| **Database** | **MongoDB Atlas** | `cluster0.vhuk0mi.mongodb.net/tourist-safety` |

---

## ⚙️ Environment Variables Summary

All environment files (`.env`) are already included and pre-configured in this zip:

### 1. Root `.env` (Backend):
- `PORT=5001`
- `NODE_ENV=development`
- `MONGO_URI=mongodb+srv://daminipatil264_db_user:nka9KNuulyQsRXWE@cluster0.vhuk0mi.mongodb.net/tourist-safety?retryWrites=true&w=majority&appName=Cluster0`
- `JWT_SECRET=safetrail_super_secret_jwt_key_2026`

### 2. `authority-dashboard/.env`:
- `VITE_API_BASE_URL=http://localhost:5001`

### 3. `smart-safety/.env`:
- `SERVER_URL=https://safe-tourist-backend-ix0g.onrender.com`

---

## 🛠️ Troubleshooting on Other Systems

1. **Port already in use?**
   - If port 5001 is busy on Windows/Mac, change `PORT=5002` in `.env`.
2. **Network / DNS issues connecting to MongoDB Atlas?**
   - The backend includes automatic Google (`8.8.8.8`) and Cloudflare (`1.1.1.1`) DNS resolvers to prevent SRV lookup issues on restricted college/hotspot Wi-Fi.
3. **Running Tourist App on Physical Phone:**
   - Connect your phone and computer to the **same Wi-Fi**.
   - In `smart-safety/.env`, set `SERVER_URL=http://<YOUR_COMPUTER_LOCAL_IP>:5001`.
   - Run `npx expo start` and scan the QR code using the **Expo Go** app on your phone.
