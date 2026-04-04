# Project Management Tool — System Documentation

> **Version:** 1.0  
> **Last Updated:** April 2026  
> **Stack:** Node.js · Express · PostgreSQL · Prisma ORM · React (Vite) · Ant Design

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Backend](#2-backend)
3. [Database](#3-database)
4. [Frontend](#4-frontend)

---

## 1. Architecture

### 1.1 Overview

The Project Management Tool is a **full-stack web application** built on a classic client-server model. It allows teams to track tasks across multiple technology tracks, manage assignees, audit activity history, and generate PDF reports.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                          │
│          React 19 (Vite) + Ant Design + Axios               │
│                  http://localhost:5173                      │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST API (HTTP/JSON + Bearer JWT)
┌──────────────────────────▼──────────────────────────────────┐
│                        SERVER TIER                          │
│            Express 5 · Node.js · Prisma Client              │
│                  http://localhost:5000                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐    │
│  │  /auth   │  │  /tasks  │  │  /users  │  │ /reports  │    │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │  Prisma ORM (SQL)
┌──────────────────────────▼──────────────────────────────────┐
│                       DATA TIER                             │
│                  PostgreSQL Database                        │
│         Tables: User · Task · ActivityLog                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.2 |
| Frontend Build Tool | Vite | 7.x |
| UI Component Library | Ant Design | 6.x |
| HTTP Client | Axios | 1.x |
| Routing (FE) | React Router DOM | 7.x |
| Date Utility | Day.js | 1.x |
| Backend Runtime | Node.js | LTS |
| Backend Framework | Express | 5.x |
| ORM | Prisma | 5.21 |
| Database | PostgreSQL | Any recent |
| Auth | JWT (jsonwebtoken) | 9.x |
| Password Hashing | bcryptjs | 3.x |
| PDF Generation | Puppeteer | 24.x |
| HTML Templating | EJS | 4.x |
| Dev Tooling | Nodemon, Concurrently | latest |

### 1.3 Monorepo Layout

```
Project Management Tool/
├── package.json            ← Root: concurrently scripts
├── backend/
│   ├── server.js           ← Express entry point
│   ├── package.json
│   ├── .env
│   ├── prisma/
│   │   └── schema.prisma   ← Database schema
│   ├── controllers/        ← Business logic
│   ├── routes/             ← Route definitions
│   ├── middleware/         ← Auth & role guards
│   ├── models/             ← (Legacy stubs)
│   ├── views/
│   │   └── reportTemplate.ejs
│   └── seed.js
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── context/
        ├── services/
        ├── pages/
        └── components/
```

### 1.4 Developer Scripts

| Command | Description |
|---|---|
| `npm run dev` (root) | Starts both backend and frontend concurrently |
| `npm run dev:backend` | Starts only the backend with nodemon |
| `npm run dev:frontend` | Starts only the frontend with Vite |
| `npm run dev` (backend) | Alias for nodemon server.js |
| `npm run start` (backend) | Production start with node |

### 1.5 Role-Based Access Control (RBAC)

The application has two roles: **ADMIN** and **MEMBER**.

| Feature | MEMBER | ADMIN |
|---|---|---|
| View all tasks | ✅ | ✅ |
| Update own assigned tasks | ✅ | ✅ |
| Update any task | ❌ | ✅ |
| Create tasks | ❌ | ✅ |
| Delete tasks | ❌ | ✅ |
| Bulk import tasks | ❌ | ✅ |
| Create users | ❌ | ✅ |
| Generate PDF reports | ❌ | ✅ |
| View activity logs | ✅ | ✅ |

### 1.6 Request Data Flow

```
Browser
  │
  ├─► Login → POST /api/auth/login → JWT issued → stored in localStorage
  │
  ├─► Authenticated Request
  │     └─ Axios attaches "Authorization: Bearer <token>" header
  │           └─ authMiddleware.js validates token
  │                 └─ roleMiddleware.js checks role (if admin route)
  │                       └─ Controller executes Prisma query
  │                             └─ JSON response returned
  │
  └─► PDF Report
        └─ GET /api/reports → Controller queries DB → EJS renders HTML
              └─ Puppeteer converts HTML → A4 PDF → blob download
```

### 1.7 Environment Configuration

**Backend `.env`**

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
```

**Frontend `.env`**

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 2. Backend

### 2.1 Entry Point — `server.js`

The Express application is bootstrapped in `server.js`. It:

- Loads environment variables via `dotenv`
- Enables CORS restricted to the frontend origin
- Parses JSON and URL-encoded request bodies
- Mounts four route groups under the `/api` prefix
- Starts listening on `PORT` (default `5000`)

```
/api/auth    → authRoutes.js
/api/users   → userRoutes.js
/api/tasks   → taskRoutes.js
/api/reports → reportRoutes.js
```

---

### 2.2 Routes

#### 2.2.1 Auth Routes — `/api/auth`

| Method | Path | Middleware | Controller | Description |
|---|---|---|---|---|
| `POST` | `/register` | `protect`, `admin` | `registerUser` | Admin creates a new user account |
| `POST` | `/login` | — | `loginUser` | Public login; returns JWT token |

> [!NOTE]
> User self-registration is intentionally disabled. Only an authenticated Admin can create new user accounts, enforcing controlled team membership.

#### 2.2.2 Task Routes — `/api/tasks`

| Method | Path | Middleware | Controller | Description |
|---|---|---|---|---|
| `GET` | `/` | `protect` | `getTasks` | Fetch all tasks (sorted by date) |
| `POST` | `/` | `protect`, `admin` | `createTask` | Create a new task |
| `POST` | `/bulk-import` | `protect`, `admin` | `bulkImportTasks` | Import multiple tasks in one call |
| `PUT` | `/:id` | `protect` | `updateTask` | Update a task (members: own tasks only) |
| `DELETE` | `/:id` | `protect`, `admin` | `deleteTask` | Permanently delete a task |
| `GET` | `/:id/activity` | `protect` | `getTaskActivityLog` | Fetch audit log for a specific task |

#### 2.2.3 User Routes — `/api/users`

| Method | Path | Middleware | Controller | Description |
|---|---|---|---|---|
| `GET` | `/` | `protect` | `getUsers` | List all active users (used for assignee dropdowns) |

#### 2.2.4 Report Routes — `/api/reports`

| Method | Path | Middleware | Controller | Description |
|---|---|---|---|---|
| `GET` | `/` | `protect`, `admin` | `generateReport` | Generate and stream a PDF report |

**Report Query Parameters:**

| Parameter | Values | Description |
|---|---|---|
| `type` | `monthly`, `range`, `all` | Report time scope |
| `month` | `1–12` | Required if type = `monthly` |
| `year` | e.g. `2026` | Required if type = `monthly` |
| `startDate` | ISO date string | Required if type = `range` |
| `endDate` | ISO date string | Required if type = `range` |
| `track` | Track name or `All` | Optional filter |
| `status` | Status value or `All` | Optional filter |

---

### 2.3 Controllers

#### 2.3.1 `authController.js`

**`registerUser`**
1. Validates required fields: `name`, `email`, `password`
2. Normalizes email (lowercase + trim)
3. Checks password length ≥ 6 characters
4. Verifies email uniqueness via Prisma
5. Hashes password with `bcrypt` (salt rounds: 10)
6. Creates user with role `MEMBER` (hardcoded default)
7. Returns user object + JWT token

**`loginUser`**
1. Normalizes email
2. Finds user by email
3. Compares password hash with `bcrypt.compare`
4. Checks `isActive` flag — blocks inactive accounts
5. Returns user object + JWT token (7-day expiry)

---

#### 2.3.2 `taskController.js`

**`getTasks`** — Fetches all tasks ordered by `startDate` asc, `tentativeEndDate` asc. Includes nested `assignee` and `createdBy` user objects (only `id`, `name`, `email` selected).

**`createTask`** — Required fields: `title`, `track`, `startDate`, `tentativeEndDate`, `assignee`. Sets `status` to `'Not Started'` by default. After creation, writes an `ActivityLog` entry with action `'Created'`.

**`updateTask`** — Enforces that a MEMBER can only update tasks where they are the assignee. Automatically sets `actualEndDate` to now when `status` transitions to `'Completed'`. Writes an `ActivityLog` entry; if the status changed, the log details reflect the old → new status transition.

**`deleteTask`** — Admin-only hard delete. ActivityLog entries cascade-delete automatically via Prisma's `onDelete: Cascade`.

**`getTaskActivityLog`** — Returns all `ActivityLog` records for a given task ID, sorted newest-first, with the acting user's `name` and `email` included.

**`bulkImportTasks`** — Accepts an array of task objects. Normalizes date strings, strips nested relations, sets `createdById` from the authenticated user, and calls `prisma.task.createMany`.

---

#### 2.3.3 `reportController.js`

1. Extracts filter parameters from query string
2. Builds a Prisma `where` filter with optional `track`, `status`, and date range conditions
3. Queries tasks with assignee and createdBy relations
4. Computes aggregates: `totalTasks`, `completedTasks`, `inProgress`, `onHold`, `delayedTasks`, `completionPercentage`
5. Groups tasks by `track` for a breakdown table
6. Ranks top 5 contributors by completed task count
7. Renders all data into an EJS HTML template (`views/reportTemplate.ejs`)
8. Launches Puppeteer (headless Chromium), prints the page to A4 PDF
9. Streams the PDF buffer to the client with `Content-Type: application/pdf`

---

#### 2.3.4 `userController.js`

**`getUsers`** — Returns all users (used to populate assignee dropdowns in the frontend).

---

### 2.4 Middleware

#### 2.4.1 `authMiddleware.js` — `protect`

Validates every protected route request:

1. Checks for `Authorization: Bearer <token>` header
2. Verifies JWT with `JWT_SECRET`
3. Looks up the user by `decoded.id` in the database, selecting all fields except `password`
4. Rejects if the user doesn't exist or `isActive` is `false`
5. Attaches the full user object to `req.user` for downstream use

#### 2.4.2 `roleMiddleware.js` — `admin`

Simple role guard applied after `protect`:

- Checks `req.user.role === 'ADMIN'`
- Returns `403 Forbidden` if not met

---

## 3. Database

### 3.1 ORM & Connection

The project uses **Prisma ORM 5.21** with a **PostgreSQL** datasource. The Prisma client is auto-generated from the schema and imported directly in controllers and middleware via `@prisma/client`.

```
backend/prisma/schema.prisma  ← Single source of truth
```

Connection is configured via the `DATABASE_URL` environment variable (standard PostgreSQL connection string).

---

### 3.2 Schema Overview

The database contains **three models** with the following relationships:

```
User ──< Task (as assignee)    [one-to-many]
User ──< Task (as creator)     [one-to-many]
Task ──< ActivityLog           [one-to-many, cascade delete]
User ──< ActivityLog           [one-to-many, set null on delete]
```

---

### 3.3 Model: `User`

Stores all team members and admins.

| Field | Type | Constraint | Default | Description |
|---|---|---|---|---|
| `id` | `String` | Primary Key | `uuid()` | Unique UUID identifier |
| `name` | `String` | Required | — | Display name |
| `email` | `String` | Unique, Required | — | Login email (normalized lowercase) |
| `password` | `String` | Required | — | bcrypt hash |
| `role` | `String` | Required | `"MEMBER"` | `ADMIN` or `MEMBER` |
| `isActive` | `Boolean` | Required | `true` | Soft-disable without deleting |
| `createdAt` | `DateTime` | Required | `now()` | Record creation timestamp |
| `updatedAt` | `DateTime` | Required | auto | Auto-updated on every write |

**Relations:**
- `assignedTasks` → Tasks where this user is the assignee
- `createdTasks` → Tasks this user created
- `activities` → ActivityLog entries authored by this user

---

### 3.4 Model: `Task`

The core entity representing a unit of work.

| Field | Type | Constraint | Default | Description |
|---|---|---|---|---|
| `id` | `String` | Primary Key | `uuid()` | Unique UUID identifier |
| `title` | `String` | Required | — | Task title / name |
| `track` | `String` | Required | — | Technology track (e.g. `Java MVC`, `React`, `QA`) |
| `description` | `String?` | Optional | — | Detailed description |
| `comments` | `String?` | Optional | — | Free-text comments or notes |
| `startDate` | `DateTime` | Required | — | When the task begins |
| `tentativeEndDate` | `DateTime` | Required | — | Expected completion date |
| `actualEndDate` | `DateTime?` | Optional | — | Auto-set when status → `Completed` |
| `priority` | `String` | Required | `"Medium"` | `Low`, `Medium`, or `High` |
| `status` | `String` | Required | `"Not Started"` | `Not Started`, `In Progress`, `On Hold`, `Completed` |
| `assigneeId` | `String` | FK to User | — | The user responsible for this task |
| `createdById` | `String` | FK to User | — | The admin who created the task |
| `createdAt` | `DateTime` | Required | `now()` | Record creation timestamp |
| `updatedAt` | `DateTime` | Required | auto | Auto-updated on every write |

**Relations:**
- `assignee` → `User` via `assigneeId` (named `AssigneeTasks`)
- `createdBy` → `User` via `createdById` (named `CreatedTasks`)
- `activities` → `ActivityLog[]` (cascade delete)

**Available Track Values** (defined in frontend filter):

`Java MVC` · `Java MS` · `Mobile Citizen` · `Mobile Official` · `React` · `Angular` · `AIML` · `QA` · `DB` · `Infra` · `BA` · `Analytics`

**Available Status Values:**

`Not Started` · `In Progress` · `On Hold` · `Completed`

---

### 3.5 Model: `ActivityLog`

Immutable audit trail for every task mutation.

| Field | Type | Constraint | Default | Description |
|---|---|---|---|---|
| `id` | `String` | Primary Key | `uuid()` | Unique UUID identifier |
| `action` | `String` | Required | — | Action type: `Created` or `Updated` |
| `details` | `String?` | Optional | — | Human-readable description of the change |
| `taskId` | `String` | FK to Task | — | The task this log belongs to |
| `userId` | `String` | FK to User | — | The user who performed the action |
| `createdAt` | `DateTime` | Required | `now()` | When the action occurred |

**Referential Actions:**
- `task` → `onDelete: Cascade` (logs deleted when task is deleted)
- `user` → `onDelete: SetNull` (logs preserved even if user is deleted)

---

### 3.6 Entity Relationship Diagram

```
┌──────────────────────────┐
│           User           │
├──────────────────────────┤
│ id (PK)                  │
│ name                     │
│ email (UNIQUE)           │
│ password                 │
│ role                     │
│ isActive                 │
│ createdAt                │
│ updatedAt                │
└────────┬─────────────────┘
         │ 1:N (assignee)    1:N (creator)
         │                        │
         ▼                        ▼
┌──────────────────────────────────────┐
│                 Task                 │
├──────────────────────────────────────┤
│ id (PK)                              │
│ title                                │
│ track                                │
│ description                          │
│ comments                             │
│ startDate                            │
│ tentativeEndDate                     │
│ actualEndDate                        │
│ priority                             │
│ status                               │
│ assigneeId (FK → User)               │
│ createdById (FK → User)              │
│ createdAt                            │
│ updatedAt                            │
└───────────┬──────────────────────────┘
            │ 1:N (cascade delete)
            ▼
┌──────────────────────────┐
│       ActivityLog        │
├──────────────────────────┤
│ id (PK)                  │
│ action                   │
│ details                  │
│ taskId (FK → Task)       │
│ userId (FK → User)       │
│ createdAt                │
└──────────────────────────┘
```

### 3.7 Seeding

A `seed.js` file in the backend root provisions initial data:
- Creates an admin user and several member users
- Creates a diverse set of tasks across multiple tracks with varying statuses, priorities, and date ranges
- Populates `ActivityLog` entries to demonstrate the audit trail

Run the seed:

```bash
cd backend
node seed.js
```

> [!IMPORTANT]
> Ensure Prisma migrations have been applied (`npx prisma migrate dev`) and the `@prisma/client` has been generated (`npx prisma generate`) before seeding.

---

## 4. Frontend

### 4.1 Setup & Build

The frontend is a **React 19** application built with **Vite 7**. It uses **Ant Design 6** as its UI component library and **Axios** for all HTTP requests.

```
frontend/
├── index.html          ← HTML entry point
├── vite.config.js      ← Vite config (@vitejs/plugin-react)
└── src/
    ├── main.jsx        ← React DOM root render
    ├── App.jsx         ← Router + AuthProvider setup
    ├── context/
    │   └── AuthContext.jsx
    ├── services/
    │   └── api.js
    ├── pages/
    │   ├── Login.jsx
    │   └── Dashboard.jsx
    └── components/
        ├── StatsCards.jsx
        ├── TaskTable.jsx
        ├── AddTaskModal.jsx
        ├── AddUserModal.jsx
        ├── ReportModal.jsx
        └── ActivityDrawer.jsx
```

---

### 4.2 Routing — `App.jsx`

React Router DOM v7 manages two routes:

| Path | Component | Guard |
|---|---|---|
| `/login` | `Login` | Public |
| `/` | `Dashboard` | `PrivateRoute` (requires auth) |

**`PrivateRoute`** reads the `user` state from `AuthContext`. If `user` is `null` (not logged in), it redirects to `/login`. While the auth state is loading from localStorage, it renders a loading placeholder.

---

### 4.3 State Management — `AuthContext.jsx`

The application uses **React Context API** for global auth state. The `AuthProvider` wraps the entire app.

**State:**

| State | Type | Description |
|---|---|---|
| `user` | `Object / null` | Logged-in user data including JWT token |
| `loading` | `Boolean` | True during initial localStorage hydration |

**Methods exposed via context:**

| Method | Description |
|---|---|
| `login(email, password)` | Calls `POST /api/auth/login`, stores response in `localStorage`, updates state |
| `logout()` | Clears `localStorage` and resets user state to `null` |

On mount, `AuthProvider` reads `user` from `localStorage` to restore sessions across page refreshes.

---

### 4.4 API Service — `services/api.js`

A pre-configured **Axios instance** pointing to the backend API:

- **Base URL:** `VITE_API_URL` env variable, defaulting to `http://localhost:5000/api`
- **Request Interceptor:** Automatically reads the user token from `localStorage` and appends the `Authorization: Bearer <token>` header to every outgoing request

All components import this instance (`import api from '../services/api'`) rather than using raw Axios.

---

### 4.5 Pages

#### 4.5.1 `Login.jsx`

The public entry page. Renders a centered login form (Ant Design `Form`) with:

- Email input
- Password input
- Submit button

On submit, calls `AuthContext.login()`. On success, React Router navigates to `/` automatically via the `PrivateRoute` guard reacting to updated auth state. Errors are displayed as form-level messages.

---

#### 4.5.2 `Dashboard.jsx`

The main application view. Manages the top-level state for the entire workspace.

**State managed:**

| State | Description |
|---|---|
| `tasks` | All task records from the API |
| `users` | All user records for assignee dropdown |
| `loading` | Loading state for the task table |
| `selectedTrack` | Active track filter (default: `'All'`) |
| `modalVisible` | Controls AddTaskModal open/close |
| `editingTask` | Task being edited (null for create mode) |
| `reportModalVisible` | Controls ReportModal open/close |
| `generatingReport` | Loading state during PDF generation |
| `addUserModalVisible` | Controls AddUserModal open/close |
| `activityDrawerVisible` | Controls ActivityDrawer open/close |
| `activeTaskId` | Task ID whose activity is being viewed |

**Key event handlers:**

| Handler | Description |
|---|---|
| `fetchTasks()` | Calls `GET /api/tasks`, updates task list |
| `fetchUsers()` | Calls `GET /api/users`, updates user list |
| `handleSaveTask(values)` | Create (`POST /tasks`) or Update (`PUT /tasks/:id`) based on `editingTask` |
| `handleDeleteTask(id)` | Calls `DELETE /api/tasks/:id` |
| `handleViewActivity(taskId)` | Opens the `ActivityDrawer` for a specific task |
| `handleGenerateReport(payload)` | Calls `GET /api/reports` with query params, triggers blob download |
| `handleSaveUser(values)` | Calls `POST /api/auth/register` to create a new user |

**Layout structure:**

```
<Layout>
  <Header>
    [Title: Task Tracker]  [Admin: Generate Report | Add User]  [Welcome + Logout]
  </Header>
  <Content>
    <StatsCards />
    [Track filter Select] + [Admin: Add Task button]
    <TaskTable />
  </Content>
  <AddTaskModal />
  <ReportModal />
  <AddUserModal />
  <ActivityDrawer />
</Layout>
```

---

### 4.6 Components

#### 4.6.1 `StatsCards.jsx`

Displays summary statistics computed from the `tasks` array prop. Shows a row of metric cards:

| Metric | Computation |
|---|---|
| Total Tasks | `tasks.length` |
| Completed | `tasks.filter(t => t.status === 'Completed').length` |
| In Progress | `tasks.filter(t => t.status === 'In Progress').length` |
| On Hold | `tasks.filter(t => t.status === 'On Hold').length` |
| Delayed | Incomplete tasks where `tentativeEndDate < today` |

---

#### 4.6.2 `TaskTable.jsx`

An Ant Design `<Table>` rendering the full task list.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `tasks` | `Array` | Task records to display (already filtered by track in Dashboard) |
| `loading` | `Boolean` | Shows table skeleton while fetching |
| `onEdit` | `Function` | Called with the task object when Edit is clicked |
| `onDelete` | `Function` | Called with the task `id` when Delete is confirmed |
| `onViewHistory` | `Function` | Called with the task `id` to open the ActivityDrawer |

**Columns displayed:**

`Title` · `Track` · `Assignee` · `Priority` · `Status` · `Start Date` · `Tentative End Date` · `Actual End Date` · `Actions (Edit / Delete / History)`

- Status column renders colored `<Tag>` components
- Priority column renders colored `<Tag>` components
- Delete uses Ant Design `Popconfirm` for safety

---

#### 4.6.3 `AddTaskModal.jsx`

An Ant Design `<Modal>` containing a `<Form>` for creating or editing tasks.

**Behavior:**
- When `editingTask` is provided, the form pre-populates with existing values (dates parsed via `dayjs`)
- When `editingTask` is null, the form renders blank (create mode)
- On submit, calls the parent's `onSave(values)` handler

**Form fields:**

| Field | Input Type | Required |
|---|---|---|
| Title | Text Input | Yes |
| Track | Select | Yes |
| Assignee | Select (from users list) | Yes |
| Priority | Select (Low / Medium / High) | Yes |
| Status | Select | Yes |
| Start Date | DatePicker | Yes |
| Tentative End Date | DatePicker | Yes |
| Actual End Date | DatePicker | No |
| Description | TextArea | No |
| Comments | TextArea | No |

---

#### 4.6.4 `AddUserModal.jsx`

An Ant Design `<Modal>` with a form for creating a new user account (Admin only).

**Form fields:**

| Field | Input Type | Required | Notes |
|---|---|---|---|
| Name | Text Input | Yes | |
| Email | Email Input | Yes | |
| Password | Password Input | Yes | Min 6 characters |

On submit, calls the parent's `onSave(values)` which posts to `POST /api/auth/register`.

---

#### 4.6.5 `ReportModal.jsx`

An Ant Design `<Modal>` that collects report configuration from the Admin before triggering PDF generation.

**Report type options:**

| Type | Additional Fields Required |
|---|---|
| Monthly | Month picker + Year |
| Date Range | Start date + End date |
| All Time | None |

Also includes optional filters:
- **Track** filter (All or specific track)
- **Status** filter (All or specific status)

On confirm, calls the parent's `onGenerate(payload)`. Shows loading state via the `loading` prop while the PDF is being generated.

---

#### 4.6.6 `ActivityDrawer.jsx`

An Ant Design `<Drawer>` that slides in from the right to display the full audit trail of a task.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `visible` | `Boolean` | Controls drawer open/close |
| `taskId` | `String / null` | Task ID to fetch logs for |
| `onCancel` | `Function` | Called when drawer is closed |

**Behavior:**
- When `visible` becomes true and `taskId` is set, calls `GET /api/tasks/:id/activity`
- Displays logs as a chronological list (newest first) with the action type, details, acting user's name, and timestamp
- Clears logs when closed

---

### 4.7 Frontend Data Flow

```
Dashboard mounts
  ├─► fetchTasks() → GET /api/tasks → setTasks([...])
  └─► fetchUsers() → GET /api/users → setUsers([...])

                    ┌────────────┐
                    │ StatsCards │ ← computed from tasks[]
                    └────────────┘

                    ┌────────────┐
selectedTrack ──►   │ TaskTable  │ ← filtered tasks[]
                    └──────┬─────┘
                           │ onEdit / onDelete / onViewHistory
                           ▼
                 ┌────────────────────────┐
                 │ AddTaskModal (edit)    │ → PUT /api/tasks/:id
                 │ Dashboard (delete)     │ → DELETE /api/tasks/:id
                 │ ActivityDrawer (view)  │ → GET /api/tasks/:id/activity
                 └────────────────────────┘

Admin actions:
  Add Task button → AddTaskModal (create mode) → POST /api/tasks
  Add User button → AddUserModal               → POST /api/auth/register
  Generate Report → ReportModal               → GET /api/reports → blob download
```

---

*End of Documentation*
