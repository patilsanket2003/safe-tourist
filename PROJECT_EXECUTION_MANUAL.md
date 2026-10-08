# 🛡️ DAMINI 2 - Comprehensive Project Execution & Setup Manual

> **Project Name:** Smart Tourist Safety & Authority Response System (DAMINI 2)  
> **Target OS:** Windows 10/11, macOS (Intel & Apple Silicon), Linux (Ubuntu/Debian/Fedora)  
> **Architecture:** Full-Stack Monorepo (Express API + Vite React Dashboard + Expo React Native App + MongoDB Atlas)

---

## 📌 Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Prerequisites & Environment Setup](#2-prerequisites--environment-setup)
3. [Repository & Directory Breakdown](#3-repository--directory-breakdown)
4. [Environment Configuration (.env Files)](#4-environment-configuration-env-files)
5. [Step-by-Step Running Instructions (Local System)](#5-step-by-step-running-instructions-local-system)
   - [Terminal 1: Backend Server](#step-1-backend-server)
   - [Terminal 2: Authority Command Dashboard](#step-2-authority-command-center-dashboard)
   - [Terminal 3: Tourist Mobile & Web App](#step-3-tourist-mobile--web-app)
6. [Pre-configured Test Accounts & Credentials](#6-pre-configured-test-accounts--credentials)
7. [Running on Physical Mobile Devices (Expo Go)](#7-running-on-physical-mobile-devices-expo-go)
8. [24/7 Live Cloud Deployments](#8-247-live-cloud-deployments)
9. [Key Features & How to Demonstrate Them](#9-key-features--how-to-demonstrate-them)
10. [Troubleshooting & Common Issues](#10-troubleshooting--common-issues)

---

## 1. System Architecture Overview

The **DAMINI 2** system is built from three synchronized layers:

```
                    ┌───────────────────────────────────────────┐
                    │       MongoDB Atlas Cloud Database        │
                    │   (cluster0.vhuk0mi.mongodb.net)         │
                    └─────────────────────┬─────────────────────┘
                                          │
                     Mongoose / WebSocket │ Real-time Events
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER (Node.js / Express)                        │
│                           Port: 5001 (Local)                                  │
│   • Auth & JWT Services                 • NASA EONET Hazard Ingestion         │
│   • Tourist Safety Zones & GeoJSON     • Socket.IO Live Alert Pipeline       │
│   • AI Safety Copilot                   • E-FIR & Emergency Dispatch Service  │
└───────────────────────┬───────────────────────────────┬───────────────────────┘
                        │                               │
         REST API / WSS │                REST API / WSS │
                        ▼                               ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────────────┐
│   AUTHORITY COMMAND DASHBOARD   │   │         TOURIST USER APP                │
│    (React + Vite + Tailwind)    │   │      (React Native + Expo Web)          │
│       Port: 5173 / 5174         │   │            Port: 8081                   │
│  • Real-time Incident Heatmaps  │   │  • Onboarding & Tourist Registration    │
│  • SOS Dispatch & Tracking      │   │  • One-Tap SOS & Real-time Location    │
│  • Geofence Zone Management     │   │  • Safe Route Deviation Detection       │
│  • Tourist Manifest Registry    │   │  • Damini AI Safety Companion           │
└─────────────────────────────────┘   └─────────────────────────────────────────┘
```

---

## 2. Prerequisites & Environment Setup

Before starting on a fresh computer, ensure the following software is installed:

### A. Node.js & npm (Required)
- **Recommended Versions:** Node.js `v18.x`, `v20.x`, or `v22.x` (LTS)
- **Check if already installed:**
  ```bash
  node -v
  npm -v
  ```
- **If not installed:**
  - **Windows / macOS:** Download and install from [https://nodejs.org](https://nodejs.org) (Choose the LTS version).
  - **Linux (Ubuntu/Debian):**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

### B. Git (Optional but Recommended)
- Check installation:
  ```bash
  git --version
  ```
- Download from [https://git-scm.com](https://git-scm.com) if needed.

### C. Web Browser
- Chrome, Edge, Safari, or Firefox (Chrome or Edge recommended for location permissions).

---

## 3. Repository & Directory Breakdown

When you unzip `DAMINI 2.zip`, you will see this layout:

```text
DAMINI 2/
├── app.js                         # Backend entry point (Express app & routing)
├── server.js                      # HTTP server & WebSocket initialization
├── package.json                   # Backend dependencies & npm scripts
├── .env                           # Backend environment variables
├── config/                        # DB connection & Atlas configuration
├── controllers/                   # Controllers (auth, tourist, sos, geofence, hazards)
├── models/                        # Mongoose schemas (Tourist, SOSAlert, Hazard, Vehicle)
├── routes/                        # Express API routes
├── services/                      # Background services (NASA EONET, Deviation, Risk)
│
├── authority-dashboard/           # Authority Command Center (Frontend)
│   ├── package.json               # Dashboard dependencies
│   ├── vite.config.ts             # Vite build & proxy configuration
│   ├── .env                       # Dashboard environment configuration
│   └── src/                       # React components, pages, maps, hooks
│
└── smart-safety/                  # Tourist Mobile & Web App (Expo Frontend)
    ├── package.json               # Expo & React Native dependencies
    ├── app.json / app.config.js   # Expo application configuration
    ├── .env                       # Mobile app environment configuration
    └── src/                       # Screens, Navigation, Map components, SOS logic
```

---

## 4. Environment Configuration (.env Files)

All `.env` files are **already included and pre-configured** inside the zip archive.

### 1. Backend Server `.env` (Project Root)
Located at: `DAMINI 2/.env`
```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://daminipatil264_db_user:nka9KNuulyQsRXWE@cluster0.vhuk0mi.mongodb.net/tourist-safety?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=safetrail_super_secret_jwt_key_2026
JWT_EXPIRE=30d
SOCKET_CORS_ORIGIN=*
NASA_EONET_AUTO_IMPORT=true
```
*Note: The MongoDB Atlas URI connects to the live database containing demo tourists, emergency vehicles, and authority profiles.*

### 2. Authority Dashboard `.env`
Located at: `DAMINI 2/authority-dashboard/.env`
```env
VITE_API_BASE_URL=http://localhost:5001
```

### 3. Tourist Mobile & Web App `.env`
Located at: `DAMINI 2/smart-safety/.env`
```env
# For local offline backend testing:
SERVER_URL=http://localhost:5001

# For live 24/7 cloud backend:
# SERVER_URL=https://safe-tourist-backend-ix0g.onrender.com
```

---

## 5. Step-by-Step Running Instructions (Local System)

You will need **3 separate terminal windows** (or 3 tabs) to run all services simultaneously.

### Step 1: Backend Server

1. Open your terminal:
   - **Windows:** Open `Command Prompt` or `PowerShell`
   - **macOS:** Open `Terminal`
   - **Linux:** Open `Bash` / terminal emulator
2. Navigate to the extracted folder:
   ```bash
   cd "DAMINI 2"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the backend in development mode:
   ```bash
   npm run dev
   ```
5. **Expected Output in Terminal 1:**
   ```text
   [Server] Running on port 5001
   [MongoDB] Connected successfully to cluster0.vhuk0mi.mongodb.net
   [Socket.io] Realtime WebSocket gateway initialized
   ```
6. **Quick Verification:**
   Open `http://localhost:5001/api/health` in your browser. You should see `{"status":"ok"}`.

---

### Step 2: Authority Command Center Dashboard

1. Open a **second terminal window/tab**.
2. Navigate to the dashboard directory:
   ```bash
   cd "DAMINI 2/authority-dashboard"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. **Expected Output in Terminal 2:**
   ```text
     VITE v5.x.x  ready in 400 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
   ```
6. Open your browser and go to:
   **`http://localhost:5173`** *(or `http://localhost:5174` if 5173 was taken)*.

---

### Step 3: Tourist Mobile & Web App

1. Open a **third terminal window/tab**.
2. Navigate to the tourist app directory:
   ```bash
   cd "DAMINI 2/smart-safety"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Expo Web interface:
   ```bash
   npm run web
   ```
   *(Or run `npx expo start` and press the `w` key on your keyboard to launch in browser).*
5. **Expected Output in Terminal 3:**
   ```text
   Starting Metro Bundler
   Opening web app on http://localhost:8081
   ```
6. Open your browser and go to:
   **`http://localhost:8081`**

---

## 6. Pre-configured Test Accounts & Credentials

### A. Authority Dashboard (Police / Tourism Board / Disaster Response)
| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@safetrail.com` | `admin123` |
| **State Authority** | `admin@system.gov` | `admin123` |

### B. Tourist Mobile & Web App (Travelers)
| User | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Sanket Patil** | `2003sanketpatil@gmail.com` | `tourist123` | Solo Traveler |
| **Demo Tourist** | `tourist@safetrail.com` | `tourist123` | Traveler |

> 💡 **Self-Registration:** You can also click **"Create an account"** on `http://localhost:8081` to register any new tourist profile with your own name, phone number, and emergency contact details.

---

## 7. Running on Physical Mobile Devices (Expo Go)

If you want to run the Tourist App directly on your physical Android phone or iPhone:

1. **Install Expo Go:**
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)
2. **Connect to Same Network:**
   - Connect your computer and your phone to the **same Wi-Fi router / hotspot**.
3. **Find your Computer's Local IP Address:**
   - **Windows:** Run `ipconfig` in Command Prompt (look for `IPv4 Address`, e.g., `192.168.1.15`).
   - **macOS / Linux:** Run `ifconfig` or `ip a` (e.g., `192.168.1.15`).
4. **Update `smart-safety/.env`:**
   ```env
   SERVER_URL=http://192.168.1.15:5001
   ```
5. **Start Expo:**
   ```bash
   cd "DAMINI 2/smart-safety"
   npx expo start
   ```
6. **Scan the QR Code:**
   - **Android:** Open the Expo Go app and tap "Scan QR Code".
   - **iOS:** Open the default Camera app and scan the QR code.

---

## 8. 24/7 Live Cloud Deployments

The entire system is deployed and active in the cloud:

| Service | Hosting | URL |
| :--- | :--- | :--- |
| **Tourist Mobile & Web App** | **Vercel** | **https://smart-tourist-app-ashy.vercel.app** |
| **Authority Command Center** | **Vercel** | **https://safe-tourist-liart.vercel.app** |
| **Backend REST & WebSocket API** | **Render** | **https://safe-tourist-backend-ix0g.onrender.com** |
| **Database** | **MongoDB Atlas** | `cluster0.vhuk0mi.mongodb.net/tourist-safety` |

---

## 9. Key Features & How to Demonstrate Them

### 1. Tourist Emergency SOS (Real-time Alerting)
1. In the Tourist App (`http://localhost:8081` or live Vercel URL), log in.
2. Press the red **SOS Button** on the dashboard.
3. Switch to the Authority Dashboard (`http://localhost:5173` or live Vercel URL).
4. Notice the **live audio alarm**, **red flashing beacon**, and real-time GPS location pin appearing instantly on the incident command map without refreshing.

### 2. Live Geofencing & Hazard Alerts (NASA EONET)
1. View the Map page on the Authority Dashboard.
2. Toggle on "Hazard Layers" to see real-time active wildfires, storms, and floods synced directly from NASA EONET.
3. Red/Orange danger buffers dynamically alert any tourist approaching high-risk zones.

### 3. AI Safety Copilot (Damini AI)
1. In the Tourist App, navigate to the Chatbot / Damini AI tab.
2. Ask questions such as:
   - *"Is it safe to hike here after 6 PM?"*
   - *"What are the emergency numbers in Goa / Mumbai?"*
   - *"How do I report a missing group member?"*

### 4. Digital E-FIR & Dispatch
1. In the Authority Dashboard, click on any active incident.
2. Click **"Dispatch Nearest Vehicle"** to simulate assigning the nearest police or medical unit.
3. Click **"Generate E-FIR"** to generate an automated incident report.

---

## 10. Troubleshooting & Common Issues

### Issue 1: "Port 5001 (or 5173) is already in use"
- **Reason:** Another node process is already running.
- **Fix on Windows:**
  ```cmd
  netstat -ano | findstr :5001
  taskkill /PID <PID_NUMBER> /F
  ```
- **Fix on macOS / Linux:**
  ```bash
  lsof -ti:5001 | xargs kill -9
  ```
- Or simply change `PORT=5002` in `.env` and `VITE_API_BASE_URL=http://localhost:5002` in `authority-dashboard/.env`.

### Issue 2: "querySrv EBADRESP" or MongoDB connection timeout
- **Reason:** Some public Wi-Fi networks block DNS SRV lookups for MongoDB Atlas.
- **Fix:** We already integrated Google (`8.8.8.8`) and Cloudflare (`1.1.1.1`) DNS resolvers into `config/dbConnection.js` and `app.js`. If you encounter any strict college proxy, connect your computer to a mobile hotspot.

### Issue 3: "Failed to fetch" in Tourist App
- **Fix:** Ensure the Backend Server is running in Terminal 1. If testing on the web version, confirm `smart-safety/.env` has `SERVER_URL=http://localhost:5001` or `https://safe-tourist-backend-ix0g.onrender.com`.

### Issue 4: Metro bundler caching issues in Expo
- **Fix:** Clear cache by running:
  ```bash
  cd "DAMINI 2/smart-safety"
  npx expo start -c
  ```
