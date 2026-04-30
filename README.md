# TaskFlow — Team Task Manager

A full-stack collaborative task management web app built with **Node.js + Express** (backend) and **React** (frontend), using NeDB (embedded JSON database — no setup required).

---

## Features

- **JWT Authentication** — Signup / Login / Protected routes
- **Project Management** — Create projects; creator becomes Admin
- **Role-Based Access** — Admin manages everything; Members update only their tasks
- **Task Management** — Title, Description, Due Date, Priority, Status, Assignee
- **Kanban Board** — Drag-free column view (To Do / In Progress / Done)
- **List View** — Filterable table view
- **Dashboard** — Stats, progress bar, tasks-per-user breakdown
- **Overdue Indicators** — Visual alerts for past-due tasks
- **Member Management** — Add/remove members by email, change roles

---

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | React 18, React Router v6, Axios |
| Backend    | Node.js, Express.js           |
| Database   | NeDB (embedded, file-based)   |
| Auth       | JWT (jsonwebtoken + bcryptjs) |
| Deployment | Railway                       |

---

## Local Setup

### Prerequisites
- Node.js v16+
- npm

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/task-manager.git
cd task-manager
```

### 2. Setup Backend
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env and set your JWT_SECRET

node server.js
# Backend runs on http://localhost:5000
```

### 3. Setup Frontend
```bash
cd frontend
npm install

# Create .env file
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:5000

npm start
# Frontend runs on http://localhost:3000
```

---

## Project Structure

```
task-manager/
├── backend/
│   ├── server.js          # Express app + all API routes
│   ├── data/              # NeDB auto-created database files
│   │   ├── users.db
│   │   ├── projects.db
│   │   ├── members.db
│   │   └── tasks.db
│   ├── package.json
│   ├── .env.example
│   └── railway.toml
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js                    # Router + route guards
    │   ├── index.js
    │   ├── styles.css                # Global styles
    │   ├── context/
    │   │   └── AuthContext.js        # Auth state + login/signup/logout
    │   ├── utils/
    │   │   └── api.js                # Axios instance with JWT interceptor
    │   ├── components/
    │   │   └── Layout.js             # Sidebar + top bar shell
    │   └── pages/
    │       ├── Login.js
    │       ├── Signup.js
    │       ├── Dashboard.js          # Stats + charts
    │       ├── Projects.js           # Project list + create
    │       └── ProjectDetail.js      # Kanban, List, Members, Tasks CRUD
    ├── package.json
    ├── .env.example
    └── railway.toml
```

---

## API Reference

### Auth
| Method | Endpoint           | Description        |
|--------|--------------------|--------------------|
| POST   | /api/auth/signup   | Register user      |
| POST   | /api/auth/login    | Login user         |
| GET    | /api/auth/me       | Get current user   |

### Projects
| Method | Endpoint              | Access       | Description            |
|--------|-----------------------|--------------|------------------------|
| GET    | /api/projects         | All members  | List your projects     |
| POST   | /api/projects         | Any user     | Create project         |
| GET    | /api/projects/:id     | Members      | Get project details    |
| PUT    | /api/projects/:id     | Admin        | Update project         |
| DELETE | /api/projects/:id     | Admin        | Delete project         |

### Members
| Method | Endpoint                                  | Access | Description      |
|--------|-------------------------------------------|--------|------------------|
| POST   | /api/projects/:id/members                 | Admin  | Add member       |
| DELETE | /api/projects/:id/members/:userId         | Admin  | Remove member    |
| PUT    | /api/projects/:id/members/:userId/role    | Admin  | Change role      |

### Tasks
| Method | Endpoint                                     | Access         | Description     |
|--------|----------------------------------------------|----------------|-----------------|
| GET    | /api/projects/:id/tasks                      | Members        | List tasks      |
| POST   | /api/projects/:id/tasks                      | Admin          | Create task     |
| PUT    | /api/projects/:projectId/tasks/:taskId       | Admin/Assignee | Update task     |
| DELETE | /api/projects/:projectId/tasks/:taskId       | Admin          | Delete task     |

### Dashboard
| Method | Endpoint        | Description         |
|--------|-----------------|---------------------|
| GET    | /api/dashboard  | Aggregated stats    |

---

## Deployment on Railway

### Backend

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo → choose the `backend` folder (or use root if mono-repo)
3. Add environment variables:
   ```
   PORT=5000
   JWT_SECRET=your_production_secret_key
   ```
4. Railway will auto-detect Node.js and run `node server.js`
5. Copy the generated public URL (e.g. `https://taskflow-backend.up.railway.app`)

### Frontend

1. New Railway service → Deploy from same repo → choose `frontend` folder
2. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.up.railway.app
   ```
3. Railway runs `npm run build` then serves with `serve`
4. Your app is live!

> **Note:** The `data/` folder with NeDB files persists on Railway's ephemeral filesystem between deploys but will reset on redeploy. For production persistence, swap NeDB for MongoDB Atlas (free tier) or Railway's PostgreSQL plugin.

---

## Role Permissions Summary

| Action                     | Admin | Member |
|----------------------------|-------|--------|
| Create/delete tasks        | ✅    | ❌     |
| Edit all task fields       | ✅    | ❌     |
| Update own task status     | ✅    | ✅     |
| Add/remove members         | ✅    | ❌     |
| Change member roles        | ✅    | ❌     |
| View all project tasks     | ✅    | ❌     |
| View own assigned tasks    | ✅    | ✅     |

---

## Screenshots

The app includes:
- Dark-themed dashboard with stat cards and progress breakdown
- Kanban board with To Do / In Progress / Done columns
- List view with priority badges and status dropdowns
- Member management modal with role editing
- Responsive sidebar that collapses on mobile

---

## Author

Built as a full-stack assignment demonstrating: React SPA, RESTful API design, JWT auth, role-based access control, and Railway deployment.
