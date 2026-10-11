
# 📝 Task Manager API (MERN Stack with Roles & Analytics)

This project implements a **Task Manager API** with **user authentication**, **role-based access control**, full **CRUD operations** for tasks, **filtering**, **searching**, **sorting**, **pagination**, and **dashboard analytics**.

- **Live Frontend:** [https://task-manager-o757.vercel.app](https://task-manager-o757.vercel.app)
- **Live Backend (API):** [https://task-manager-b8rc.onrender.com](https://task-manager-b8rc.onrender.com)

---

## 📚 Table of Contents

- [✨ Features](#-features)
- [🧰 Technologies Used](#-technologies-used)
- [🚀 Setup Instructions](#-setup-instructions)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [📡 API Endpoints](#-api-endpoints)
  - [Authentication](#authentication)
  - [Tasks](#tasks)
  - [Dashboard](#dashboard)
- [🔐 User Roles & Permissions](#-user-roles--permissions)
- [📝 Notes & Extra Features](#-notes--extra-features)

---

## ✨ Features

### 🔐 User Authentication
- JWT-based login & registration
- Passwords hashed using `bcryptjs`
- Role-based access: `user` & `manager`

### ✅ Task Management (CRUD)
- Create, Read, Update, Delete tasks
- Fields: `title`, `description`, `status`, `createdAt`, `updatedAt`
- Users manage only their tasks; Managers can access all

### 🔍 Advanced Data Operations
- **Filter:** by task status
- **Sort:** by `createdAt` or `title` (asc/desc)
- **Search:** in `title` or `description`
- **Pagination:** supported via query parameters

### 📊 Dashboard Analytics
- `/dashboard` route with analytics
- Users see their stats
- Managers get global stats (all users)

### 🔐 Protected Routes
- All key routes are JWT-protected with role-based middleware

---

## 🧰 Technologies Used

### Backend
- **Node.js** – JavaScript runtime
- **Express.js** – Web framework
- **MongoDB** – NoSQL DB
- **Mongoose** – ODM
- **bcryptjs** – Password hashing
- **jsonwebtoken** – JWT authentication
- **cors**, **dotenv**, **mongoose-paginate-v2**, **nodemon**

### Frontend
- **React** – UI library
- **Vite** – Fast build tool
- **Inline CSS** – Component-level styling

---

## 🚀 Setup Instructions

### 🔗 Live Links

- **Frontend:** [https://task-manager-o757.vercel.app](https://task-manager-o757.vercel.app)
- **Backend (API):** [https://task-manager-b8rc.onrender.com](https://task-manager-b8rc.onrender.com)

> Update your `API_BASE_URL` in frontend code to:

```js
export const API_BASE_URL = "https://task-manager-b8rc.onrender.com";
```

---

### Backend Setup

1. **Clone the repo**

   ```bash
   git clone <your-repo-link>
   cd task-manager-api
   ```

2. **Project Structure**

   ```
   task-manager-api/
   ├── config/db.js
   ├── controllers/
   ├── middleware/
   ├── models/
   ├── routes/
   └── server.js
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Configure `.env`**

   ```
   MONGO_URI=mongodb://localhost:27017/taskmanagerdb
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5000
   ```

5. **Start MongoDB**
   Ensure MongoDB is running locally or on Atlas.

6. **Start server**

   ```bash
   npm run dev   # dev mode with nodemon
   # or
   npm start     # production mode
   ```

---

### Frontend Setup

1. **Create Vite App**

   ```bash
   npm create vite@latest task-manager-ui
   cd task-manager-ui
   npm install
   ```

2. **Replace `App.jsx`**

   * Replace the content of `src/App.jsx` with your custom UI code.

3. **Update API URL**

   ```js
   export const API_BASE_URL = "https://task-manager-b8rc.onrender.com";
   ```

4. **Start Frontend**

   ```bash
   npm run dev
   ```

---

## 📡 API Endpoints

*All API routes are prefixed with `/api`.*

### 🔐 Authentication

#### `POST /api/auth/register`

Register new user
Body:

```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "user" // or "manager" (optional)
}
```

#### `POST /api/auth/login`

Authenticate user
Body:

```json
{
  "email": "string",
  "password": "string"
}
```

#### `GET /api/auth/me`

Get current user info
Headers:

```
Authorization: Bearer <JWT_TOKEN>
```

---

### 📝 Tasks

#### `GET /api/tasks`

Retrieve all tasks (with filters)
Query params:

* `status`: `pending`, `in-progress`, `completed`
* `sort`: `createdAt:asc|desc`, `title:asc|desc`
* `search`: keyword
* `page`, `limit`: pagination

#### `POST /api/tasks`

Create new task
Body:

```json
{
  "title": "string",
  "description": "string",
  "status": "pending" // optional
}
```

#### `GET /api/tasks/:id`

Fetch single task by ID

#### `PUT /api/tasks/:id`

Update task
Body:

```json
{
  "title": "string",
  "description": "string",
  "status": "completed"
}
```

#### `DELETE /api/tasks/:id`

Delete a task

> All task routes require:
> `Authorization: Bearer <JWT_TOKEN>`

---

### 📊 Dashboard

#### `GET /api/dashboard`

Returns task analytics

* **User:** their task stats
* **Manager:** all users' stats

Response (example):

```json
{
  "totalTasks": 20,
  "tasksByStatus": {
    "pending": 5,
    "in-progress": 10,
    "completed": 5
  },
  "allUsersStats": {
    "alice": {
      "totalTasks": 8,
      "tasksByStatus": { ... }
    }
  }
}
```

---

## 🔐 User Roles & Permissions

### 🧑‍💻 User

* Can register & login
* Manage **only their own** tasks
* See **their own** dashboard

### 👨‍💼 Manager

* Can register & login
* Manage **any user's** tasks
* View **global** dashboard stats

---

## 📝 Notes & Extra Features

* ✅ Basic error handling
* 🔁 Session validation using `/api/auth/me`
* 📱 Responsive UI with inline CSS
* 🔒 Secure password hashing & JWT auth
* 🧪 Easily testable using Postman or frontend

---

## 🧪 Quality Assurance & Testing

A full QA audit (responsive design, UI consistency, functionality, WCAG 2.2 AA accessibility,
cross-viewport rendering, performance and edge cases) was executed in a real browser and is
documented in **[`docs/QA-AUDIT-REPORT.md`](docs/QA-AUDIT-REPORT.md)**, with screenshots in
[`docs/qa-evidence/`](docs/qa-evidence).

**Highlights after the audit's fixes**

- **120 rendered states** checked across 320 → 2560 px (dark *and* light themes): 0 horizontal
  overflow, 0 clipped text, 0 undersized touch targets.
- **0 axe-core violations** (WCAG 2.0/2.1/2.2 A + AA) across 13 page/theme states.
- **41/41 functional assertions** and **22/22 committed regression checks** passing.
- CLS `0.0005`, LCP ≈ 0.5–0.9 s, no long tasks, no memory growth over repeated navigation.

### Running the regression suite

```bash
cd task-manager-ui
npm install
npm run build && npm run preview     # http://localhost:4173 in one shell

npm run test:regression              # in a second shell
```

The suite auto-detects the browser: it attaches to an already-running Chrome when
`PW_CDP_URL` is set, launches `CHROME_PATH` when provided, otherwise it uses Playwright's
bundled Chromium (run `npx playwright install chromium` once). Set
`AXE_PATH=./node_modules/axe-core/axe.min.js` to also run the axe-core accessibility gate.

---

## 📬 Feedback / Contribution

Feel free to explore, open issues, suggest improvements, or submit PRs!

---

```