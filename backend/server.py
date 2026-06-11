from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, Header, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import bcrypt
import asyncio
import resend
import requests
import secrets
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/workflow_erp')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME') or os.environ.get('DATABASE_NAME') or 'workflow_erp']

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# JWT Configuration
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]

# Resend Configuration
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
resend.api_key = RESEND_API_KEY

# Object Storage Configuration
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "workflow-erp"
storage_key = None

# Geofencing & Network Verification Config for Attendance
import math

OFFICE_LAT = float(os.environ.get("OFFICE_LAT", "19.0760")) # HQ Mumbai
OFFICE_LON = float(os.environ.get("OFFICE_LON", "72.8777")) # HQ Mumbai
MAX_RADIUS_METERS = float(os.environ.get("MAX_RADIUS_METERS", "100.0")) # 100 meters
OFFICE_IPS = set(os.environ.get("OFFICE_IPS", "127.0.0.1,::1,localhost").replace(" ", "").split(","))
STRICT_ATTENDANCE_CHECK = os.environ.get("STRICT_ATTENDANCE_CHECK", "false").lower() == "true"

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Haversine distance formula in meters
    r = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

# Password Hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Management
def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# Get Current User
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = payload["sub"]
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# RBAC Helper
def require_role(*allowed_roles):
    async def dependency(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency

# Audit Logging
async def log_audit(user_id: str, action: str, entity_type: str, entity_id: str, details: dict = None):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": ""
    })

# Object Storage Functions
def init_storage():
    global storage_key
    if not EMERGENT_KEY:
        logger.info("EMERGENT_LLM_KEY not set. Using local file storage fallback.")
        return "local"
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}. Falling back to local file storage.")
        return "local"

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if key == "local":
        local_path = ROOT_DIR / "local_storage" / path
        local_path.parent.mkdir(parents=True, exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(data)
        return {"path": path, "size": len(data)}
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if key == "local":
        local_path = ROOT_DIR / "local_storage" / path
        if not local_path.exists():
            raise HTTPException(status_code=404, detail="File not found in local storage")
        with open(local_path, "rb") as f:
            data = f.read()
        return data, "application/octet-stream"
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Pydantic Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = "employee"
    department: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class LeaveRequest(BaseModel):
    type: str
    start_date: str
    end_date: str
    reason: str

class WFHRequest(BaseModel):
    start_date: str
    end_date: str
    reason: str

class AttendanceCheckIn(BaseModel):
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ProjectCreate(BaseModel):
    name: str
    description: str
    team_members: List[str] = []
    start_date: str
    end_date: Optional[str] = None

class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: str
    assigned_to: str
    priority: str = "medium"
    due_date: Optional[str] = None

class TeamCreate(BaseModel):
    name: str
    department: str
    members: List[str] = []

class FormTemplateCreate(BaseModel):
    name: str
    description: str
    sections: List[dict]

class FormAssignmentCreate(BaseModel):
    template_id: str
    assigned_to: str
    due_date: Optional[str] = None

class FormSubmission(BaseModel):
    responses: dict

class ApprovalAction(BaseModel):
    comments: Optional[str] = None
    severity: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None

class DocumentCreate(BaseModel):
    title: str
    category: str
    tags: List[str] = []
    folder_path: str = "/"
    file_id: str
    file_name: str
    size: int

class DocumentVersionCreate(BaseModel):
    file_id: str
    file_name: str
    size: int

# ============================================
# AUTH ROUTES
# ============================================

@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = hash_password(req.password)
    user_id = str(uuid.uuid4())
    employee_id = f"EMP{uuid.uuid4().hex[:6].upper()}"
    
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": password_hash,
        "name": req.name,
        "role": req.role,
        "department": req.department,
        "employee_id": employee_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    await log_audit(user_id, "register", "user", user_id)
    
    access_token = create_access_token(user_id, email, req.role)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)
    return user_doc

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response, request: Request):
    email = req.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    # Check brute force
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = attempt.get("lockout_until")
        if lockout_until and datetime.fromisoformat(lockout_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        # Increment failed attempts
        if attempt:
            new_count = attempt.get("count", 0) + 1
            lockout = None
            if new_count >= 5:
                lockout = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"count": new_count, "lockout_until": lockout, "last_attempt": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.login_attempts.insert_one({
                "identifier": identifier,
                "count": 1,
                "last_attempt": datetime.now(timezone.utc).isoformat()
            })
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear failed attempts
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email, user["role"])
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    await log_audit(user_id, "login", "user", user_id)
    
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    user_data["id"] = user_id
    return user_data

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    await log_audit(user["id"], "logout", "user", user["id"])
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"_id": 0, "password_hash": 0, "id": 1, "email": 1, "role": 1})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = payload["sub"]
        access_token = create_access_token(user_id, user["email"], user["role"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If email exists, reset link has been sent"}
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_reset_tokens.insert_one({
        "token": token,
        "email": email,
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    reset_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}"
    logger.info(f"Password reset link: {reset_link}")
    
    # Send email via Resend
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "Password Reset Request",
            "html": f"<p>Click the link to reset your password:</p><p><a href='{reset_link}'>{reset_link}</a></p><p>Link expires in 1 hour.</p>"
        }
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
    
    return {"message": "If email exists, reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    token_doc = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    if datetime.fromisoformat(token_doc["expires_at"].isoformat() if isinstance(token_doc["expires_at"], datetime) else token_doc["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    
    new_hash = hash_password(req.new_password)
    await db.users.update_one({"email": token_doc["email"]}, {"$set": {"password_hash": new_hash}})
    await db.password_reset_tokens.update_one({"token": req.token}, {"$set": {"used": True}})
    
    return {"message": "Password reset successful"}

# ============================================
# USER / EMPLOYEE ROUTES
# ============================================

@api_router.get("/users")
async def list_users(user: dict = Depends(require_role("super_admin", "hr", "project_manager"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["super_admin", "hr"] and user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    return target_user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, user: dict = Depends(get_current_user)):
    if user["role"] not in ["super_admin", "hr"] and user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Prevent role changes by non-admins
    if "role" in updates and user["role"] not in ["super_admin", "hr"]:
        del updates["role"]
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user_id}, {"$set": updates})
    await log_audit(user["id"], "update", "user", user_id, updates)
    return {"message": "User updated successfully"}

@api_router.post("/users")
async def create_user(req: RegisterRequest, user: dict = Depends(require_role("super_admin", "hr"))):
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = hash_password(req.password)
    user_id = str(uuid.uuid4())
    employee_id = f"EMP{uuid.uuid4().hex[:6].upper()}"
    
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": password_hash,
        "name": req.name,
        "role": req.role,
        "department": req.department,
        "employee_id": employee_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    await log_audit(user["id"], "create", "user", user_id)
    
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)
    return user_doc

# ============================================
# LEAVE / WFH REQUEST ROUTES
# ============================================

@api_router.post("/requests/leave")
async def create_leave_request(req: LeaveRequest, user: dict = Depends(get_current_user)):
    request_id = str(uuid.uuid4())
    leave_doc = {
        "id": request_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "type": req.type,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "reason": req.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leave_requests.insert_one(leave_doc)
    await log_audit(user["id"], "create", "leave_request", request_id)
    
    leave_doc.pop("_id", None)
    return leave_doc

@api_router.get("/requests/leave")
async def get_leave_requests(user: dict = Depends(get_current_user)):
    if user["role"] in ["super_admin", "hr", "project_manager", "team_lead"]:
        requests = await db.leave_requests.find({}, {"_id": 0}).to_list(1000)
    else:
        requests = await db.leave_requests.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return requests

@api_router.put("/requests/leave/{request_id}/approve")
async def approve_leave(request_id: str, action: ApprovalAction, user: dict = Depends(require_role("super_admin", "hr", "project_manager", "team_lead"))):
    await db.leave_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved", "approver_id": user["id"], "approver_name": user["name"], "comments": action.comments, "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_audit(user["id"], "approve", "leave_request", request_id)
    return {"message": "Leave approved"}

@api_router.put("/requests/leave/{request_id}/reject")
async def reject_leave(request_id: str, action: ApprovalAction, user: dict = Depends(require_role("super_admin", "hr", "project_manager", "team_lead"))):
    await db.leave_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected", "approver_id": user["id"], "approver_name": user["name"], "comments": action.comments, "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_audit(user["id"], "reject", "leave_request", request_id)
    return {"message": "Leave rejected"}

@api_router.post("/requests/wfh")
async def create_wfh_request(req: WFHRequest, user: dict = Depends(get_current_user)):
    request_id = str(uuid.uuid4())
    wfh_doc = {
        "id": request_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "start_date": req.start_date,
        "end_date": req.end_date,
        "reason": req.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wfh_requests.insert_one(wfh_doc)
    await log_audit(user["id"], "create", "wfh_request", request_id)
    
    wfh_doc.pop("_id", None)
    return wfh_doc

@api_router.get("/requests/wfh")
async def get_wfh_requests(user: dict = Depends(get_current_user)):
    if user["role"] in ["super_admin", "hr", "project_manager", "team_lead"]:
        requests = await db.wfh_requests.find({}, {"_id": 0}).to_list(1000)
    else:
        requests = await db.wfh_requests.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return requests

@api_router.put("/requests/wfh/{request_id}/approve")
async def approve_wfh(request_id: str, action: ApprovalAction, user: dict = Depends(require_role("super_admin", "hr", "project_manager", "team_lead"))):
    await db.wfh_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved", "approver_id": user["id"], "approver_name": user["name"], "comments": action.comments, "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_audit(user["id"], "approve", "wfh_request", request_id)
    return {"message": "WFH approved"}

@api_router.put("/requests/wfh/{request_id}/reject")
async def reject_wfh(request_id: str, action: ApprovalAction, user: dict = Depends(require_role("super_admin", "hr", "project_manager", "team_lead"))):
    await db.wfh_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected", "approver_id": user["id"], "approver_name": user["name"], "comments": action.comments, "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_audit(user["id"], "reject", "wfh_request", request_id)
    return {"message": "WFH rejected"}

# ============================================
# ATTENDANCE ROUTES
# ============================================

@api_router.post("/attendance/check-in")
async def check_in(req: AttendanceCheckIn, request: Request, user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    existing = await db.attendance.find_one({"user_id": user["id"], "date": today})
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    # 1. Resolve client IP
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host

    is_ip_valid = client_ip in OFFICE_IPS
    
    # 2. Resolve GPS distance
    distance = None
    is_distance_valid = False
    if req.latitude is not None and req.longitude is not None:
        distance = calculate_distance(req.latitude, req.longitude, OFFICE_LAT, OFFICE_LON)
        is_distance_valid = distance <= MAX_RADIUS_METERS

    # For WFH we always consider verified = True
    # For Office check-in: either IP is valid OR distance is within radius.
    is_verified = True
    if req.location != "Work From Home":
        is_verified = is_ip_valid or is_distance_valid
        if STRICT_ATTENDANCE_CHECK and not is_verified:
            raise HTTPException(
                status_code=400,
                detail=f"Check-in rejected. You are outside the office perimeter ({f'{round(distance)}m' if distance is not None else 'unknown GPS'}) and not on the office network."
            )

    attendance_id = str(uuid.uuid4())
    attendance_doc = {
        "id": attendance_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "date": today,
        "check_in": datetime.now(timezone.utc).isoformat(),
        "location": req.location,
        "status": "present",
        "verification": {
            "client_ip": client_ip,
            "ip_verified": is_ip_valid,
            "coords": {"latitude": req.latitude, "longitude": req.longitude} if req.latitude is not None else None,
            "distance_meters": distance,
            "location_verified": is_distance_valid,
            "strict_applied": STRICT_ATTENDANCE_CHECK,
            "verified": is_verified
        }
    }
    await db.attendance.insert_one(attendance_doc)
    await log_audit(user["id"], "check_in", "attendance", attendance_id)
    
    attendance_doc.pop("_id", None)
    return attendance_doc

@api_router.post("/attendance/check-out")
async def check_out(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    existing = await db.attendance.find_one({"user_id": user["id"], "date": today})
    if not existing:
        raise HTTPException(status_code=400, detail="No check-in found for today")
    
    await db.attendance.update_one(
        {"user_id": user["id"], "date": today},
        {"$set": {"check_out": datetime.now(timezone.utc).isoformat()}}
    )
    await log_audit(user["id"], "check_out", "attendance", existing["id"])
    return {"message": "Checked out successfully"}

@api_router.get("/attendance")
async def get_attendance(user: dict = Depends(get_current_user)):
    if user["role"] in ["super_admin", "hr", "project_manager"]:
        records = await db.attendance.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    else:
        records = await db.attendance.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(1000)
    return records

# ============================================
# PROJECT ROUTES
# ============================================

@api_router.post("/projects")
async def create_project(req: ProjectCreate, user: dict = Depends(require_role("super_admin", "project_manager"))):
    project_id = str(uuid.uuid4())
    project_doc = {
        "id": project_id,
        "name": req.name,
        "description": req.description,
        "manager_id": user["id"],
        "manager_name": user["name"],
        "team_members": req.team_members,
        "status": "active",
        "start_date": req.start_date,
        "end_date": req.end_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.insert_one(project_doc)
    await log_audit(user["id"], "create", "project", project_id)
    
    project_doc.pop("_id", None)
    return project_doc

@api_router.get("/projects")
async def get_projects(user: dict = Depends(get_current_user)):
    if user["role"] in ["super_admin", "hr", "project_manager"]:
        projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    else:
        projects = await db.projects.find({"team_members": user["id"]}, {"_id": 0}).to_list(1000)
    return projects

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, updates: dict, user: dict = Depends(require_role("super_admin", "project_manager"))):
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.projects.update_one({"id": project_id}, {"$set": updates})
    await log_audit(user["id"], "update", "project", project_id, updates)
    return {"message": "Project updated"}

# ============================================
# TASK ROUTES
# ============================================

@api_router.post("/tasks")
async def create_task(req: TaskCreate, user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    task_doc = {
        "id": task_id,
        "project_id": req.project_id,
        "title": req.title,
        "description": req.description,
        "assigned_to": req.assigned_to,
        "created_by": user["id"],
        "status": "todo",
        "priority": req.priority,
        "due_date": req.due_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    await log_audit(user["id"], "create", "task", task_id)
    
    task_doc.pop("_id", None)
    return task_doc

@api_router.get("/tasks")
async def get_tasks(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if project_id:
        query["project_id"] = project_id
    elif user["role"] not in ["super_admin", "hr", "project_manager"]:
        query["assigned_to"] = user["id"]
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return tasks

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, updates: dict, user: dict = Depends(get_current_user)):
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tasks.update_one({"id": task_id}, {"$set": updates})
    await log_audit(user["id"], "update", "task", task_id, updates)
    return {"message": "Task updated"}

# ============================================
# TEAM ROUTES
# ============================================

@api_router.post("/teams")
async def create_team(req: TeamCreate, user: dict = Depends(require_role("super_admin", "hr", "project_manager"))):
    team_id = str(uuid.uuid4())
    team_doc = {
        "id": team_id,
        "name": req.name,
        "department": req.department,
        "lead_id": user["id"],
        "members": req.members,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.teams.insert_one(team_doc)
    await log_audit(user["id"], "create", "team", team_id)
    
    team_doc.pop("_id", None)
    return team_doc

@api_router.get("/teams")
async def get_teams(user: dict = Depends(get_current_user)):
    teams = await db.teams.find({}, {"_id": 0}).to_list(1000)
    return teams

# ============================================
# NOTIFICATION ROUTES
# ============================================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "Notification marked as read"}

# ============================================
# FORM TEMPLATE ROUTES
# ============================================

@api_router.post("/forms/templates")
async def create_form_template(req: FormTemplateCreate, user: dict = Depends(require_role("super_admin", "auditor"))):
    template_id = str(uuid.uuid4())
    template_doc = {
        "id": template_id,
        "name": req.name,
        "description": req.description,
        "sections": req.sections,
        "created_by": user["id"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.form_templates.insert_one(template_doc)
    await log_audit(user["id"], "create", "form_template", template_id)
    
    template_doc.pop("_id", None)
    return template_doc

@api_router.get("/forms/templates")
async def get_form_templates(user: dict = Depends(get_current_user)):
    templates = await db.form_templates.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return templates

@api_router.get("/forms/templates/{template_id}")
async def get_form_template(template_id: str, user: dict = Depends(get_current_user)):
    template = await db.form_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

# ============================================
# FORM ASSIGNMENT ROUTES
# ============================================

@api_router.post("/forms/assignments")
async def create_form_assignment(req: FormAssignmentCreate, user: dict = Depends(require_role("super_admin", "auditor"))):
    assignment_id = str(uuid.uuid4())
    assignment_doc = {
        "id": assignment_id,
        "template_id": req.template_id,
        "assigned_to": req.assigned_to,
        "assigned_by": user["id"],
        "status": "pending",
        "due_date": req.due_date,
        "locked": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.form_assignments.insert_one(assignment_doc)
    await log_audit(user["id"], "create", "form_assignment", assignment_id)
    
    assignment_doc.pop("_id", None)
    return assignment_doc

@api_router.get("/forms/assignments")
async def get_form_assignments(user: dict = Depends(get_current_user)):
    if user["role"] in ["super_admin", "auditor"]:
        assignments = await db.form_assignments.find({}, {"_id": 0}).to_list(1000)
    else:
        assignments = await db.form_assignments.find({"assigned_to": user["id"]}, {"_id": 0}).to_list(1000)
    return assignments

@api_router.get("/forms/assignments/{assignment_id}")
async def get_form_assignment(assignment_id: str, user: dict = Depends(get_current_user)):
    assignment = await db.form_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Only assigned user or admin/auditor can view
    if assignment["assigned_to"] != user["id"] and user["role"] not in ["super_admin", "auditor"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return assignment

@api_router.put("/forms/assignments/{assignment_id}/submit")
async def submit_form_assignment(assignment_id: str, req: FormSubmission, user: dict = Depends(get_current_user)):
    assignment = await db.form_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if assignment["assigned_to"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only assigned user can submit")
    
    if assignment.get("locked"):
        raise HTTPException(status_code=400, detail="Form already submitted and locked")
    
    response_id = str(uuid.uuid4())
    response_doc = {
        "id": response_id,
        "assignment_id": assignment_id,
        "responses": req.responses,
        "version": 1,
        "submitted_by": user["id"],
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.form_responses.insert_one(response_doc)
    
    await db.form_assignments.update_one(
        {"id": assignment_id},
        {"$set": {"status": "submitted", "locked": True, "submitted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(user["id"], "submit", "form_assignment", assignment_id)
    
    response_doc.pop("_id", None)
    return response_doc

@api_router.get("/forms/assignments/{assignment_id}/responses")
async def get_form_responses(assignment_id: str, user: dict = Depends(get_current_user)):
    assignment = await db.form_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if assignment["assigned_to"] != user["id"] and user["role"] not in ["super_admin", "auditor"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    responses = await db.form_responses.find({"assignment_id": assignment_id}, {"_id": 0}).to_list(1000)
    return responses

@api_router.put("/forms/assignments/{assignment_id}/approve")
async def approve_form(assignment_id: str, action: ApprovalAction, user: dict = Depends(require_role("super_admin", "auditor"))):
    await db.form_assignments.update_one(
        {"id": assignment_id},
        {"$set": {
            "approval_status": "approved",
            "reviewed_by": user["id"],
            "review_comments": action.comments,
            "severity": action.severity,
            "corrective_action": action.corrective_action,
            "preventive_action": action.preventive_action,
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await log_audit(user["id"], "approve", "form_assignment", assignment_id)
    return {"message": "Form approved"}

@api_router.put("/forms/assignments/{assignment_id}/reject")
async def reject_form(assignment_id: str, action: ApprovalAction, user: dict = Depends(require_role("super_admin", "auditor"))):
    await db.form_assignments.update_one(
        {"id": assignment_id},
        {"$set": {
            "approval_status": "rejected",
            "reviewed_by": user["id"],
            "review_comments": action.comments,
            "severity": action.severity,
            "corrective_action": action.corrective_action,
            "preventive_action": action.preventive_action,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "locked": False
        }}
    )
    await log_audit(user["id"], "reject", "form_assignment", assignment_id)
    return {"message": "Form rejected"}

# ============================================
# FILE UPLOAD ROUTES
# ============================================

@api_router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    
    file_id = str(uuid.uuid4())
    file_doc = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "uploaded_by": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)
    await log_audit(user["id"], "upload", "file", file_id)
    
    file_doc.pop("_id", None)
    return file_doc

@api_router.get("/files/{file_id}/download")
async def download_file(file_id: str, authorization: str = Header(None), auth: str = Query(None), user: dict = Depends(get_current_user)):
    file_doc = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    data, content_type = get_object(file_doc["storage_path"])
    return Response(content=data, media_type=file_doc.get("content_type", content_type))

# ============================================
# DOCUMENT REPOSITORY ROUTES
# ============================================

@api_router.post("/documents")
async def create_document(req: DocumentCreate, user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "title": req.title,
        "category": req.category,
        "tags": req.tags,
        "folder_path": req.folder_path,
        "owner_id": user["id"],
        "owner_name": user["name"],
        "current_file_id": req.file_id,
        "current_file_name": req.file_name,
        "size": req.size,
        "versions": [{
            "version": 1,
            "file_id": req.file_id,
            "file_name": req.file_name,
            "size": req.size,
            "created_at": datetime.now(timezone.utc).isoformat()
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documents.insert_one(doc)
    await log_audit(user["id"], "create_doc", "document", doc_id)
    doc.pop("_id", None)
    return doc

@api_router.get("/documents")
async def list_documents(folder: Optional[str] = None, category: Optional[str] = None, tag: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if folder:
        query["folder_path"] = folder
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    
    docs = await db.documents.find(query, {"_id": 0}).to_list(1000)
    return docs

@api_router.post("/documents/{document_id}/version")
async def add_document_version(document_id: str, req: DocumentVersionCreate, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    new_version_num = len(doc.get("versions", [])) + 1
    new_version = {
        "version": new_version_num,
        "file_id": req.file_id,
        "file_name": req.file_name,
        "size": req.size,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.update_one(
        {"id": document_id},
        {
            "$set": {
                "current_file_id": req.file_id,
                "current_file_name": req.file_name,
                "size": req.size,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"versions": new_version}
        }
    )
    await log_audit(user["id"], "add_doc_version", "document", document_id)
    return {"message": "New version uploaded successfully"}

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc["owner_id"] != user["id"] and user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.documents.delete_one({"id": document_id})
    await log_audit(user["id"], "delete_doc", "document", document_id)
    return {"message": "Document deleted successfully"}

# ============================================
# ENTERPRISE SEARCH ROUTE
# ============================================

@api_router.get("/search")
async def enterprise_search(query: str = Query(..., min_length=1), user: dict = Depends(get_current_user)):
    q = {"$regex": query, "$options": "i"}
    
    employees = await db.users.find(
        {"$or": [{"name": q}, {"email": q}, {"department": q}, {"role": q}]},
        {"_id": 0, "password_hash": 0}
    ).to_list(20)
    for emp in employees:
        emp["search_type"] = "employee"
        emp["title"] = emp["name"]
        emp["subtitle"] = f"{emp.get('department') or 'No Dept'} · {(emp.get('role') or 'employee').replace('_', ' ')}"
        emp["link"] = "/employees"
        
    projects_query = {"$or": [{"name": q}, {"description": q}]}
    if user["role"] not in ["super_admin", "hr", "project_manager"]:
        projects_query = {"$and": [projects_query, {"team_members": user["id"]}]}
    projects = await db.projects.find(projects_query, {"_id": 0}).to_list(20)
    for proj in projects:
        proj["search_type"] = "project"
        proj["title"] = proj["name"]
        proj["subtitle"] = proj.get("description")
        proj["link"] = "/projects"

    documents = await db.documents.find(
        {"$or": [{"title": q}, {"category": q}, {"tags": q}, {"current_file_name": q}]},
        {"_id": 0}
    ).to_list(20)
    for doc in documents:
        doc["search_type"] = "document"
        doc["title"] = doc["title"]
        doc["subtitle"] = f"Category: {doc.get('category')} · Owner: {doc.get('owner_name')}"
        doc["link"] = "/documents"

    leaves = await db.leave_requests.find(
        {"$or": [{"reason": q}, {"type": q}, {"user_name": q}]},
        {"_id": 0}
    ).to_list(20)
    for req in leaves:
        req["search_type"] = "request"
        req["title"] = f"{req.get('user_name')}'s Leave"
        req["subtitle"] = f"{req.get('type').capitalize()} leave: {req.get('reason')}"
        req["link"] = "/requests"
        
    wfhs = await db.wfh_requests.find(
        {"$or": [{"reason": q}, {"user_name": q}]},
        {"_id": 0}
    ).to_list(20)
    for req in wfhs:
        req["search_type"] = "request"
        req["title"] = f"{req.get('user_name')}'s WFH"
        req["subtitle"] = f"WFH: {req.get('reason')}"
        req["link"] = "/requests"

    teams = await db.teams.find(
        {"$or": [{"name": q}, {"department": q}]},
        {"_id": 0}
    ).to_list(20)
    for t in teams:
        t["search_type"] = "team"
        t["title"] = t["name"]
        t["subtitle"] = f"Department: {t.get('department')}"
        t["link"] = "/teams"

    templates_dict = {t["id"]: t["name"] for t in await db.form_templates.find({}, {"id": 1, "name": 1}).to_list(1000)}
    assignments_query = {}
    if user["role"] not in ["super_admin", "auditor"]:
        assignments_query = {"assigned_to": user["id"]}
    
    assignments = await db.form_assignments.find(assignments_query, {"_id": 0}).to_list(20)
    matching_assignments = []
    for assign in assignments:
        template_name = templates_dict.get(assign["template_id"], "Audit Form")
        if query.lower() in template_name.lower() or query.lower() in assign.get("status", "").lower():
            assign["search_type"] = "audit"
            assign["title"] = template_name
            assign["subtitle"] = f"Status: {assign.get('status')} · Due: {assign.get('due_date')}"
            assign["link"] = "/forms"
            matching_assignments.append(assign)

    return {
        "results": employees + projects + documents + leaves + wfhs + teams + matching_assignments
    }

# ============================================
# ANALYTICS ROUTES
# ============================================

@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(user: dict = Depends(require_role("super_admin", "hr", "project_manager"))):
    total_users = await db.users.count_documents({})
    total_projects = await db.projects.count_documents({})
    pending_leaves = await db.leave_requests.count_documents({"status": "pending"})
    pending_wfh = await db.wfh_requests.count_documents({"status": "pending"})
    today_attendance = await db.attendance.count_documents({"date": datetime.now(timezone.utc).date().isoformat()})
    
    return {
        "total_users": total_users,
        "total_projects": total_projects,
        "pending_leaves": pending_leaves,
        "pending_wfh": pending_wfh,
        "today_attendance": today_attendance
    }

# ============================================
# AUDIT LOG ROUTES
# ============================================

@api_router.get("/audit-logs")
async def get_audit_logs(user: dict = Depends(require_role("super_admin", "auditor"))):
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(500).to_list(500)
    return logs

# ============================================
# STARTUP EVENTS
# ============================================

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.password_reset_tokens.create_index("expires_at")
    await db.login_attempts.create_index("identifier")
    
    # Seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@company.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        admin_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": admin_id,
            "email": admin_email,
            "password_hash": hashed,
            "name": "Super Admin",
            "role": "super_admin",
            "employee_id": "EMP000001",
            "department": "Administration",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Admin password updated")
    
    # Write test credentials
    memory_dir = ROOT_DIR / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)
    with open(memory_dir / "test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: super_admin\n\n")
        f.write(f"## API Endpoints\n")
        f.write(f"- Login: POST /api/auth/login\n")
        f.write(f"- Register: POST /api/auth/register\n")
        f.write(f"- Get User: GET /api/auth/me\n")
    
    # Initialize storage
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
