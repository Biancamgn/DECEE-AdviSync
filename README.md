# DECEE AdviSync

DECEE AdviSync is a web-based academic advising management system designed for the Department of Electronics, Computer, and Electrical Engineering (DECEE). It streamlines the advising process between students, faculty advisers, and department administrators — covering everything from scheduling appointments and submitting advising forms to curriculum management and clearance tracking.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [User Roles](#user-roles)
- [Pages Reference](#pages-reference)
- [Assets](#assets)
- [Authors](#authors)

---

## Overview

AdviSync serves two main user portals — an **Adviser Portal** for faculty members and an **Admin Portal** for department administrators. The system supports the full advising lifecycle: setting deadlines, managing advisee rosters, reviewing submitted forms, scheduling appointments, and generating reports.

The platform is built for the BS Computer Engineering (BSCpE) and BS Electronics and Communications Engineering (BSECE) programs, with curriculum checklists for ID batches 122 through 125.

---

## Features

### Adviser Portal
- **My Advisees** — View all assigned students with program, academic standing, and advising form status at a glance.
- **Academic Advising Management** — Set and update advising deadlines per term, and track student submission progress in real time.
- **Advising Forms** — Review submitted student advising booklets, update form status (Submitted / Reviewed / For Revision), and leave comments.
- **Advising Schedule** — Create single or bulk time slots for student appointments and manage existing bookings.
- **Student Concerns** — View and respond to concerns or queries raised by advisees.
- **Email System** — Send bulk announcements to all advisees or individual emails to specific students.
- **Profile & Settings** — Manage personal profile and account preferences, including dark mode toggle.

### Admin Portal
- **Dashboard** — Department-wide statistics including total students, clearance rates, at-risk counts, and a visual distribution chart by program.
- **User Management** — List, search, create, and manage student and professor accounts.
- **Curriculum Manager** — View and edit BSCpE and BSECE course listings, including units and prerequisites.
- **Advising Overview** — Monitor advising activity and progress across all advisers.
- **Reports** — Generate and view department-level academic reports.
- **Bulk Operations** — CSV upload for student accounts, bulk clearance status updates, and mass email sending.
- **Profile & Settings** — Manage admin account details and application preferences.

### General
- Dark mode support across all pages
- Responsive layout with collapsible sidebar navigation
- Real-time clock in the top bar
- Notification system
- Supabase-backed authentication and data

---

## Project Structure

```
DECEE-AdviSync-main/
│
├── index.html                  # Login / entry point
│
├── adviser/                    # Adviser Portal pages
│   ├── academic-advising.html
│   ├── adviser-profile.html
│   ├── adviser-settings.html
│   ├── adviser-student-concerns.html
│   ├── advising-forms.html
│   ├── advising-schedule.html
│   ├── email-system.html
│   └── my-advisees.html
│
├── admin/                      # Admin Portal pages
│   ├── admin-advising.html
│   ├── admin-bulk.html
│   ├── admin-curriculum.html
│   ├── admin-dashboard.html
│   ├── admin-profile.html
│   ├── admin-reports.html
│   ├── admin-settings.html
│   └── admin-users.html
│
├── components/                 # Shared UI components
│   ├── sidebar.html
│   └── topbar.html
│
├── css/                        # Page-specific stylesheets
│   ├── academic-advising.css
│   ├── adviser-profile.css
│   ├── adviser-settings.css
│   ├── adviser-student-concerns.css
│   ├── advising-forms.css
│   ├── advising-schedule.css
│   ├── dashboard.css
│   ├── email-system.css
│   ├── login.css
│   └── my-advisees.css
│
├── js/                         # JavaScript modules (referenced in HTML)
│   ├── supabase-config.js
│   ├── auth.js
│   ├── shared.js
│   ├── notifications.js
│   └── [page-specific scripts]
│
└── assets/
    ├── images/
    │   ├── login-page-background.jpg
    │   └── website-logo.png
    └── checklists/             # Curriculum PDF checklists
        ├── CPE ID 122 CHECKLIST.pdf
        ├── CPE ID 123 CHECKLIST.pdf
        ├── CPE ID 124 CHECKLIST.pdf
        ├── CPE ID 125 CHECKLIST-1.pdf
        ├── ECE ID 122 CHECKLIST.pdf
        ├── ECE ID 123 CHECKLIST.pdf
        ├── ECE ID 124 CHECKLIST.pdf
        └── ECE ID 125 CHECKLIST.pdf
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3, Bootstrap 5.3.3 |
| Icons | Bootstrap Icons 1.11.3 |
| Typography | Plus Jakarta Sans (Google Fonts) |
| Charts | Chart.js |
| Backend / Auth | Supabase |
| JavaScript | Vanilla JS (ES6+) |

---

## Getting Started

AdviSync is a static frontend project backed by Supabase. No build tools or package manager is required.

**1. Clone the repository**
```bash
git clone https://github.com/your-org/DECEE-AdviSync.git
cd DECEE-AdviSync
```

**2. Configure Supabase**

Open `js/supabase-config.js` and fill in your Supabase project URL and public anon key:
```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";
```

**3. Serve the project**

Use any static file server. For example, with the VS Code Live Server extension, right-click `index.html` and select **Open with Live Server**. Alternatively, using Python:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**4. Log in**

Navigate to `index.html` to reach the login page. Use credentials managed through your Supabase project's authentication system.

---

## User Roles

| Role | Portal | Access |
|---|---|---|
| **Adviser** | `/adviser/` | Manage advisees, forms, schedule, email, and concerns |
| **Admin** | `/admin/` | Full department oversight, user management, reports, and bulk tools |

Role-based routing is handled by `js/auth.js` upon login.

---

## Pages Reference

### Adviser Portal

| Page | File | Description |
|---|---|---|
| My Advisees | `adviser/my-advisees.html` | Full table of assigned students with status summaries |
| Academic Advising | `adviser/academic-advising.html` | Set term deadlines and monitor submission progress |
| Advising Forms | `adviser/advising-forms.html` | Review and comment on student-submitted advising booklets |
| Advising Schedule | `adviser/advising-schedule.html` | Create and manage appointment time slots |
| Student Concerns | `adviser/adviser-student-concerns.html` | View and respond to student-raised concerns |
| Email System | `adviser/email-system.html` | Send bulk or individual emails to advisees |
| Profile | `adviser/adviser-profile.html` | View and update adviser profile |
| Settings | `adviser/adviser-settings.html` | Account and display settings |

### Admin Portal

| Page | File | Description |
|---|---|---|
| Dashboard | `admin/admin-dashboard.html` | Department statistics, charts, and adviser monitoring |
| User Management | `admin/admin-users.html` | Create and manage student and faculty accounts |
| Curriculum | `admin/admin-curriculum.html` | Edit BSCpE and BSECE course listings and prerequisites |
| Advising | `admin/admin-advising.html` | Monitor advising activity across the department |
| Reports | `admin/admin-reports.html` | Generate academic and advising reports |
| Bulk Operations | `admin/admin-bulk.html` | CSV uploads, bulk clearance updates, and mass email |
| Profile | `admin/admin-profile.html` | View and update admin profile |
| Settings | `admin/admin-settings.html` | Account and display settings |

---

## Assets

- **`assets/images/`** — Contains the website logo and login page background image.
- **`assets/checklists/`** — PDF curriculum checklists for BSCpE and BSECE students across ID batches 122–125. These are referenced in the curriculum manager and can be distributed to students as academic planning guides.

---

## Authors

| Name | Role |
|---|---|
| **Erin M. Quiazon** | Adviser Portal & Login Page (frontend) |
| **Renjovil Joseph V. Lascano** | Admin Portal (frontend) |
| **Bianca Louise V. Manganaan** | Student Portal (frontend) |

*Last updated: April 7, 2026*
