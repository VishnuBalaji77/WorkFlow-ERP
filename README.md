# WorkFlow ERP

A modern Enterprise Resource Planning (ERP) system designed to streamline organizational workflows, employee management, attendance tracking, project management, requests, audit forms, and reporting.

This project is being developed as part of an internship with SCSC in collaboration with the Cyber Crime Records Bureau (CCRB) to improve administrative efficiency and centralized data management.

---

## Features

- User Authentication & Authorization
- Dashboard
- Employee Management
- Attendance Management
- Project Management
- Request Management
- Team Management
- Audit Forms
- Audit Logs
- Notifications
- Role-Based Access Control
- Centralized Database
- Responsive UI

---

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React
- Sonner

### Backend
- Python
- FastAPI

### Database
- MongoDB Atlas

### Deployment
- GitHub
- Render

---

## Project Structure

```
workflow-erp/
│
├── frontend/          # React + Vite frontend
├── backend/           # FastAPI backend
├── docs/              # Documentation
└── README.md
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ThunderBoltGod/WorkFlow-ERP.git
cd WorkFlow-ERP
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:3000
```

(or another available port)

---

## Backend Setup

Navigate to the backend folder.

```bash
cd backend
```

Create a Python virtual environment.

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the required dependencies.

```bash
pip install -r requirements.txt
```

Run the backend.

```bash
uvicorn server:app --reload
```

Backend runs on

```
http://localhost:8000
```

---

## Environment Variables

Create a `.env` file inside the `backend` directory.

Example:

```env
MONGO_URL=your_mongodb_connection_string
DB_NAME=workflow_erp
JWT_SECRET=your_secret_key
STRICT_ATTENDANCE_CHECK=false
```

---

## Deployment

### Backend

Deploy using **Render**

Runtime:

```
Python
```

Build Command

```bash
pip install -r requirements.txt
```

Start Command

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

---

### Frontend

Deploy using **Render Static Site**

Root Directory

```
frontend
```

Build Command

```bash
npm run build
```

Publish Directory

```
dist
```

---

## Modules

- Dashboard
- Employees
- Attendance
- Projects
- Requests
- Teams
- Audit Forms
- Audit Logs
- Notifications

---

## Future Enhancements

- AI-powered report analysis
- OCR document processing
- Advanced analytics dashboard
- Automated workflow approvals
- Mobile application
- Email & SMS notifications
- Real-time collaboration
- Searchable central repository
- Police station report management
- Role-based audit tracking

---

## Contributors

- Vishnu Balaji VVSS

---

## License

This project is developed for academic and internship purposes.
