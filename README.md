# 🔬 BB84 Quantum Key Distribution (QKD) Simulator

> An interactive BB84 QKD simulator built for a **B.Tech Fundamentals of Quantum Computing** project.
> Demonstrates how Alice and Bob establish a shared secret key — and how Eve's eavesdropping is detected.

---

## 👥 Project Team

> **B.Tech — Fundamentals of Quantum Computing**
> Department of Computer Science & Engineering

| # | Name | Roll No. | Role |
| :- | :--- | :--- | :--- |
| 1 | Pankaj Paswan | S20240010172 | Team Lead / Backend |
| 2 | Rishita | S20240010142 | Frontend / UI |
| 3 | Katta Thrishank | S20240010112 | Theory & Documentation |

---

## 📖 What is BB84?

**BB84** (Bennett & Brassard, 1984) is the world's first quantum key distribution protocol. Alice and Bob exchange a secret key over a quantum channel. If anyone eavesdrops (Eve), quantum mechanics guarantees they leave a detectable fingerprint — an elevated **Quantum Bit Error Rate (QBER)**.

Key principles used:
- **No-Cloning Theorem** — an unknown quantum state cannot be copied without disturbing it.
- **Quantum Measurement Collapse** — measuring a photon in the wrong basis irreversibly changes its state.

---

## 🧪 The 3 Simulation Scenarios

| Scenario | Setup | Expected Result |
| :--- | :--- | :--- |
| **1. Ideal Channel** | No Eve, 0% noise | QBER ≈ 0% → ✅ Key Accepted |
| **2. Eve Eavesdropping** | Eve intercepts every photon | QBER ≈ 25% → ❌ Key Rejected |
| **3. Channel Noise** | No Eve, noise = 12% | QBER ≈ 12% → ❌ Key Rejected |

> The **11% security threshold** comes from the Shor-Preskill bound. If QBER ≥ 11%, the session is aborted.

---

## 🖥️ App Features

- **Section 1 — Controls:** Choose a scenario, set qubits (N), toggle Eve, adjust noise, and run.
- **Section 2 — Visual Quantum Simulator:** Live animated optical corridor showing photons in flight from Alice → Channel/Eve → Bob, polarization angles, quantum collapse alerts, playback controls, and scrubber tape.
- **Section 3 — Transmission Table:** Inspect every qubit: bit, basis, Eve intercept, Bob result, sifting.
- **Section 4 — Key Analysis:** QBER metrics, sifted key, test bits, final secret key + OTP demo.
- **Section 5 — QBER Chart:** Compare all 3 scenarios with the 11% threshold reference line.

---

## ⚙️ Tech Stack

| Layer | Stack | Description |
| :--- | :--- | :--- |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, NumPy | Protocol logic, state collapse, noise models & API |
| **Frontend** | React 19, Vite 7, Tailwind CSS, Recharts | Interactive UI, quantum animations, and charts |

---

## 🚀 How to Run

### 1️⃣ Prerequisites
Make sure you have installed on your computer:
* **Python 3.11+** ([Download Python](https://www.python.org/downloads/))
* **Node.js 18+** ([Download Node.js](https://nodejs.org/))

---

### 2️⃣ Install Dependencies (One-Time Setup)

Open a terminal in the project root folder and execute:

```bash
# Install backend Python packages
pip install -r backend/requirements.txt

# Install frontend Node dependencies
cd frontend
npm install
cd ..
```

---

### 3️⃣ Launch the Application

#### ⚡ Option A: One-Click Start (Recommended)

Simply run the launch script from the project root:

```bash
python launch.py
```

> **What this does automatically:**
> 1. Boots the FastAPI backend server on `http://localhost:8000`
> 2. Starts the Vite React frontend dev server on `http://localhost:5173`
> 3. Opens your default web browser directly to the simulator

*To stop both servers at any time, press `Ctrl + C` in the terminal.*

---

#### 🛠️ Option B: Manual Start (Two Separate Terminals)

If you prefer starting each service independently in separate terminals:

```bash
# Terminal 1 — Backend (FastAPI)
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
# Terminal 2 — Frontend (React / Vite)
cd frontend
npm run dev
```

Once running, navigate to **[http://localhost:5173](http://localhost:5173)** in your browser.

---

### 🌐 Service Endpoints

| Service | Address | Description |
| :--- | :--- | :--- |
| **Frontend UI** | `http://localhost:5173` | Interactive BB84 simulator interface |
| **Backend API** | `http://localhost:8000` | REST API service |
| **API Docs (Swagger)** | `http://localhost:8000/docs` | Interactive OpenAPI documentation |

---

## 📌 Quick Demo Steps

1. Open **http://localhost:5173**
2. Click **Scenario 1 → Run** — observe QBER = 0%, key accepted ✅
3. Click **Scenario 2 → Run** — observe QBER ≈ 25%, key rejected ❌ (Eve detected!)
4. Click **Scenario 3 → Run** — observe QBER ≈ 12%, key rejected ❌ (noisy channel)
5. With Scenario 1 accepted, try the **OTP Encryption Demo** in Section 4.
6. Switch to the **Guide & Theory** tab for theory review.
