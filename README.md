# Smart Healthcare Project Management System

[![Tests](https://img.shields.io/badge/Tests-78%20Passing-brightgreen.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232a)](https://react.dev/)
[![License](https://img.shields.io/badge/License-Academic-blue.svg)]()
[![Course](https://img.shields.io/badge/Course-CSE--494%20SPM-purple.svg)]()

> A full-stack Software Project Management (SPM) web application for planning, monitoring, and controlling a smart healthcare software project. Built for the **CSE-494 Mid-Term Lab** using PMBOK-aligned workflows and live database calculations.

The application provides one connected workspace for project governance, scope and change control, scheduling, earned value management, quality gates, risks, stakeholders, and project closure.

## Contents

- [Project overview](#case-study-overview)
- [Features](#key-features-by-spm-module)
- [Technology](#architecture--tech-stack)
- [Getting started](#quick-start-instructions)
- [Testing](#testing)
- [Case-study baseline](#case-study-baseline)

---

## 🏥 Case Study Overview

A software engineering company is contracted to build an integrated **Smart Healthcare Management System** for a network of **5 hospitals** (patient appointments, laboratory reports, doctor schedules, online consultations, and hospital billing).

- **Project Timeline:** 16 Weeks (112 Calendar Days: `2026-09-07` to `2026-12-27`)
- **Approved Budget (BAC):** `PKR 5,000,000`
- **Project Team (7 members):**
  - 1 Project Manager (`Ahmad Khan`, PKR 5,000/day)
  - 1 Senior Backend Developer (`Sarah Ali`, PKR 4,500/day)
  - 1 Backend Developer (`Hassan Raza`, PKR 3,500/day)
  - 1 Senior Frontend Developer (`Fatima Noor`, PKR 4,000/day)
  - 1 Frontend Developer (`Omar Malik`, PKR 3,500/day)
  - 1 Database Developer (`Ayesha Siddiqui`, PKR 4,000/day)
  - 1 QA Engineer (`Bilal Ahmed`, PKR 3,500/day)
  - *Total Daily Labor Burn:* `PKR 28,000/day`
- **Evaluation Status Date:** `2026-11-01` (Week 8)
  - **CPI (Cost Performance Index):** `0.8500` (Cost Overrun: PKR 4.20M spent for PKR 3.57M earned value)
  - **SPI (Schedule Performance Index):** `0.8806` (Schedule Delay: completing 88% of scheduled work)

---

## 🚀 Key Features by SPM Module

### 1. Project Initiation & Governance
- **Project Charter:** Baseline authorization, PM authority, scope boundaries (In-Scope green tags vs Out-of-Scope boundaries), budget, and SMART objectives.
- **Project Management Plan:** Subsidiary plans across Scope, Schedule, Cost, and Quality with live integration statistics.
- **Team Directory & Burn Rate:** Contact details, roles, and labor cost burn rate calculation.
- **Stakeholder Register & Power/Interest Matrix:** Mendelow’s 2x2 grid (`Manage Closely`, `Keep Satisfied`, `Keep Informed`, `Monitor`) with full CRUD dialogs.

### 2. Scope Management & Change Control
- **Requirements Traceability Matrix (RTM):** 17 requirements prioritized via MoSCoW (`Must`, `Should`, `Could`) and classified (`Functional`, `Non-Functional`, `Technical`).
- **Scope Baseline Gating:** Unapproved requirements (`Proposed`) **cannot** be linked to WBS work packages or scheduled activities (enforced via HTTP 409).
- **Change Control Board (CCB) Workflow:** Approving change requests (`CR-001` for AI Diagnosis +₨500K/+2w, `CR-002` for Mobile App +₨300K/+1w) automatically adds up to +PKR 800,000 to the budget, extends the deadline by 3 weeks, and transitions requirements into approved scope.
- **Hierarchical Work Breakdown Structure (WBS):** Multi-level tree with expandable deliverable nodes down to work packages.

### 3. Schedule, CPM & Delay Analysis
- **Critical Path Method (CPM) Engine:** Forward pass (ES, EF) and backward pass (LS, LF) using inclusive calendar days (`EF = ES + duration - 1`). Total slack calculation and cycle detection via DFS 3-color graph traversal.
- **Interactive Gantt Chart:** Visual calendar day timeline with monthly headers, today status date marker, and progress fill bars.
- **Delay Analysis Engine:** Detects delayed activities, computes overdue days, and cascades delay impacts through Finish-to-Start dependencies to project end date.
- **Milestone Tracker:** Contractual checkpoints with planned vs actual achievement dates.

### 4. Cost Management & Earned Value (EVM)
- **100% Dynamic EVM Calculations:** All values computed from live database entries:
  - `BAC = PKR 5,000,000`
  - `PV = PKR 4,056,667` (Linear proration for in-flight activities spanning status date)
  - `EV = PKR 3,572,400` ($\sum \%complete \times estimated\_cost$)
  - `AC = PKR 4,203,000` ($\sum expenses$ on or before status date)
  - `CV = -PKR 630,600` | `SV = -PKR 484,267`
  - `CPI = 0.8500` | `SPI = 0.8806`
  - `EAC = PKR 5,882,353` | `ETC = PKR 1,679,353` | `VAC = -PKR 882,353` | `TCPI = 1.206`
- **Recharts Data Visualizations:** S-Curve EVM trajectory area chart and grouped Budget vs Actual vs Earned Value bar charts.

### 5. Quality Management & Defect Gating
- **Quality Inspection Checklists:** Deliverable checklists with pass rates and real-time pass/fail recording.
- **Defect Tracking System:** Severity levels (`Critical`, `High`, `Medium`, `Low`) and lifecycle progression (`Open` → `In Progress` → `Fixed` → `Verified` → `Closed`).
- **Closure Gatekeeper:** Formal project sign-off is blocked until zero critical/high defects remain and all approved requirements are implemented.

### 6. Risk Management & Decision Trees
- **5x5 Risk Matrix:** Heat map plotting 10 hospital project risks across Likelihood (1–5) and Impact (1–5) with calculated risk scores ($L \times I$).
- **Process Decision Program Chart (PDPC):** Tree decomposing `Objective → Activity → Potential Problem → Preventive/Corrective Countermeasure`.

---

## 🛠️ Architecture & Tech Stack

```
/
├── client/                     # Frontend (React 19, Vite, Recharts, Lucide, CSS Design System)
│   ├── src/
│   │   ├── pages/              # 18 dedicated module pages
│   │   ├── services/api.js     # Axios API client
│   │   ├── App.jsx             # Router, TopBar with Status Date, Sidebar
│   │   └── index.css           # Modern dark-mode glassmorphic design system
│   └── vite.config.js          # API proxy /api -> http://localhost:3001
├── server/                     # Backend (Node.js, Express, better-sqlite3)
│   ├── index.js                # REST API endpoints & route handlers
│   ├── db/                     # Database connection & schema initialization
│   └── services/               # CPM, EVM, Delay Analysis, Change Request services
├── database/                   # Database files
│   ├── schema.sql              # 25 tables with foreign keys and constraints
│   ├── seed.sql                # Complete realistic case study seed data
│   └── er-diagram.md           # Mermaid ER diagram
├── tests/                      # Automated Vitest test suite (78 passing tests)
│   ├── cpm.test.js
│   ├── evm.test.js
│   ├── delay.test.js
│   ├── scope.test.js
│   ├── validation.test.js
│   └── closure.test.js
```

---

## ⚡ Quick Start Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Run Automated Test Suite
To verify all 78 mathematical and database constraints:
```bash
npm test
```

### 2. Start Application Locally
Run the development server (runs both backend API and frontend Vite proxy simultaneously):
```bash
npm run dev
```
- Frontend UI: **`http://localhost:5173`**
- Backend API: **`http://localhost:3001`**

### 3. Reset Database to Default Seed
To restore all tables, activities, expenses, and defect data back to initial case study state:
```bash
npm run reset
```

---

## Case-study Baseline

| Metric | Baseline |
| --- | --- |
| Project duration | 16 weeks (`2026-09-07` to `2026-12-27`) |
| Approved budget (BAC) | PKR 5,000,000 |
| Status date | `2026-11-01` |
| CPI | 0.8500 |
| SPI | 0.8806 |
| Team size | 7 members |

## Repository Notes

The frontend API client (`client/src/services/api.js`) is tracked because it is application source code. Environment files, dependencies, build output, logs, and local SQLite runtime files are excluded through [`.gitignore`](.gitignore).

This repository is an academic Software Project Management implementation for the CSE-494 Mid-Term Lab. It demonstrates how project-management concepts can be implemented as working software rather than static documentation.
