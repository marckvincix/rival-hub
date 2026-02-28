from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from passlib.context import CryptContext
from jose import jwt, JWTError
import re
import unicodedata

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'goalmanager')]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'goalmanager-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI(title="GoalManager API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

# User Models
class UserBase(BaseModel):
    email: str
    name: str
    
class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    plan: str = "free"  # free, pro, club
    plan_expiry: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    created_at: datetime

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    plan: str = "free"
    plan_expiry: Optional[datetime] = None

# Tournament Models
class TournamentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "Open"  # U10, U12, U14, U16, U18, Open
    format: str = "league"  # league, knockout, groups_knockout, mixed
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    logo: Optional[str] = None  # base64
    is_public: bool = True

class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    format: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    logo: Optional[str] = None
    is_public: Optional[bool] = None
    status: Optional[str] = None

class Tournament(BaseModel):
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    organizer_id: str
    category: str = "Open"
    format: str = "league"
    status: str = "draft"  # draft, active, completed
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    logo: Optional[str] = None
    is_public: bool = True
    created_at: datetime

# Team Models
class TeamCreate(BaseModel):
    name: str
    logo: Optional[str] = None  # base64

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None

class Team(BaseModel):
    id: str
    name: str
    logo: Optional[str] = None
    tournament_id: str
    created_at: datetime

# Player Models
class PlayerCreate(BaseModel):
    full_name: str
    number: Optional[int] = None
    role: str = "midfielder"  # goalkeeper, defender, midfielder, forward
    photo: Optional[str] = None  # base64

class PlayerUpdate(BaseModel):
    full_name: Optional[str] = None
    number: Optional[int] = None
    role: Optional[str] = None
    photo: Optional[str] = None
    is_active: Optional[bool] = None

class Player(BaseModel):
    id: str
    full_name: str
    number: Optional[int] = None
    role: str = "midfielder"
    team_id: str
    photo: Optional[str] = None
    is_active: bool = True
    created_at: datetime

# Match Models
class MatchCreate(BaseModel):
    home_team_id: str
    away_team_id: str
    match_date: Optional[str] = None
    match_time: Optional[str] = None
    venue: Optional[str] = None
    round: str = "Giornata 1"

class MatchUpdate(BaseModel):
    home_team_id: Optional[str] = None
    away_team_id: Optional[str] = None
    home_goals: Optional[int] = None
    away_goals: Optional[int] = None
    match_date: Optional[str] = None
    match_time: Optional[str] = None
    venue: Optional[str] = None
    round: Optional[str] = None
    status: Optional[str] = None

class Match(BaseModel):
    id: str
    tournament_id: str
    home_team_id: str
    away_team_id: str
    home_goals: Optional[int] = None
    away_goals: Optional[int] = None
    match_date: Optional[str] = None
    match_time: Optional[str] = None
    venue: Optional[str] = None
    round: str = "Giornata 1"
    status: str = "scheduled"  # scheduled, live, completed
    created_at: datetime

# Match Event Models
class MatchEventCreate(BaseModel):
    player_id: str
    team_id: str
    event_type: str  # goal, assist, penalty_goal, own_goal, yellow_card, red_card, substitution_in, substitution_out, mvp
    minute: Optional[int] = None
    note: Optional[str] = None

class MatchEvent(BaseModel):
    id: str
    match_id: str
    player_id: str
    team_id: str
    event_type: str
    minute: Optional[int] = None
    note: Optional[str] = None
    created_at: datetime

# Match Events Batch Save Model
class MatchEventsBatchSave(BaseModel):
    events: List[MatchEventCreate]
    ratings: Dict[str, float] = {}  # player_id -> rating
    home_goals: int = 0
    away_goals: int = 0

# Player Stats Response Model (for the stats modal)
class PlayerStatsResponse(BaseModel):
    player_id: str
    full_name: str
    role: str
    photo: Optional[str] = None
    goals: int = 0
    assists: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    appearances: int = 0
    minutes_played: int = 0
    average_rating: float = 0.0
    ratings_count: int = 0

# News Models
class NewsCreate(BaseModel):
    title: str
    content: str
    photo: Optional[str] = None  # base64
    is_published: bool = False

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    photo: Optional[str] = None
    is_published: Optional[bool] = None

class News(BaseModel):
    id: str
    tournament_id: str
    title: str
    content: str
    photo: Optional[str] = None
    is_published: bool = False
    published_at: Optional[datetime] = None
    created_at: datetime

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "free": {"price_monthly": 0, "price_yearly": 0, "max_tournaments": 1, "max_teams": 8},
    "pro": {"price_monthly": 9.99, "price_yearly": 79.00, "max_tournaments": -1, "max_teams": -1},
    "club": {"price_monthly": 19.99, "price_yearly": 149.00, "max_tournaments": -1, "max_teams": -1}
}

# ===================== HELPER FUNCTIONS =====================

def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name"""
    # Normalize unicode characters
    slug = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
    # Convert to lowercase and replace spaces with hyphens
    slug = re.sub(r'[^\w\s-]', '', slug.lower())
    slug = re.sub(r'[-\s]+', '-', slug).strip('-')
    return slug

async def get_unique_slug(name: str) -> str:
    """Generate unique slug, appending number if needed"""
    base_slug = generate_slug(name)
    slug = base_slug
    counter = 1
    
    while await db.tournaments.find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    return slug

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> Optional[User]:
    """Get current user from session token (cookie or header)"""
    session_token = None
    
    # Try to get token from cookie first
    session_token = request.cookies.get("session_token")
    
    # If not in cookie, try Authorization header
    if not session_token and authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization[7:]
        else:
            session_token = authorization
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    # Check session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Sessione non valida")
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessione scaduta")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    
    return User(**user_doc)

async def get_optional_user(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request, authorization)
    except HTTPException:
        return None

# ===================== AUTH ENDPOINTS =====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register new user with email/password"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "plan": "free",
        "plan_expiry": None,
        "stripe_customer_id": None,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "created_at": now
    }
    await db.user_sessions.insert_one(session_doc)
    
    response = JSONResponse(content={
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "plan": "free",
        "session_token": session_token
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return response

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    """Login with email/password"""
    user_doc = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    if not verify_password(user_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    now = datetime.now(timezone.utc)
    session_token = f"session_{uuid.uuid4().hex}"
    
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "created_at": now
    }
    await db.user_sessions.insert_one(session_doc)
    
    response = JSONResponse(content={
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "plan": user_doc.get("plan", "free"),
        "session_token": session_token
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return response

@api_router.post("/auth/session")
async def exchange_session(request: Request):
    """Exchange Emergent OAuth session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id richiesto")
    
    # Exchange session_id with Emergent Auth
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Session ID non valido")
            
            auth_data = resp.json()
        except Exception as e:
            logger.error(f"Error exchanging session: {e}")
            raise HTTPException(status_code=401, detail="Errore autenticazione")
    
    now = datetime.now(timezone.utc)
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if user_doc:
        # Update existing user
        await db.users.update_one(
            {"email": auth_data["email"]},
            {"$set": {"name": auth_data["name"], "picture": auth_data.get("picture")}}
        )
        user_id = user_doc["user_id"]
        plan = user_doc.get("plan", "free")
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        plan = "free"
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "plan": plan,
            "plan_expiry": None,
            "stripe_customer_id": None,
            "created_at": now
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "created_at": now
    }
    await db.user_sessions.insert_one(session_doc)
    
    response = JSONResponse(content={
        "user_id": user_id,
        "email": auth_data["email"],
        "name": auth_data["name"],
        "picture": auth_data.get("picture"),
        "plan": plan,
        "session_token": session_token
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return response

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
        plan=current_user.plan,
        plan_expiry=current_user.plan_expiry
    )

@api_router.post("/auth/logout")
async def logout(request: Request):
    """Logout - delete session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logout effettuato"})
    response.delete_cookie(key="session_token", path="/")
    return response

# ===================== TOURNAMENT ENDPOINTS =====================

@api_router.post("/tournaments", response_model=Tournament)
async def create_tournament(
    tournament_data: TournamentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new tournament"""
    # Check plan limits
    if current_user.plan == "free":
        count = await db.tournaments.count_documents({"organizer_id": current_user.user_id})
        if count >= SUBSCRIPTION_PLANS["free"]["max_tournaments"]:
            raise HTTPException(
                status_code=403,
                detail="Limite tornei raggiunto. Passa al piano Pro per creare più tornei."
            )
    
    now = datetime.now(timezone.utc)
    tournament_id = f"tournament_{uuid.uuid4().hex[:12]}"
    slug = await get_unique_slug(tournament_data.name)
    
    tournament_doc = {
        "id": tournament_id,
        "slug": slug,
        "name": tournament_data.name,
        "description": tournament_data.description,
        "organizer_id": current_user.user_id,
        "category": tournament_data.category,
        "format": tournament_data.format,
        "status": "draft",
        "start_date": tournament_data.start_date,
        "end_date": tournament_data.end_date,
        "location": tournament_data.location,
        "logo": tournament_data.logo,
        "is_public": tournament_data.is_public,
        "created_at": now
    }
    
    await db.tournaments.insert_one(tournament_doc)
    del tournament_doc["_id"]
    
    return Tournament(**tournament_doc)

@api_router.get("/tournaments", response_model=List[Tournament])
async def get_tournaments(
    current_user: User = Depends(get_current_user)
):
    """Get all tournaments for current user"""
    tournaments = await db.tournaments.find(
        {"organizer_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [Tournament(**t) for t in tournaments]

@api_router.get("/tournaments/public", response_model=List[Tournament])
async def get_public_tournaments(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all public tournaments"""
    query = {"is_public": True}
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    
    tournaments = await db.tournaments.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [Tournament(**t) for t in tournaments]

@api_router.get("/tournaments/slug/{slug}")
async def get_tournament_by_slug(slug: str):
    """Get tournament by slug (public)"""
    tournament = await db.tournaments.find_one({"slug": slug}, {"_id": 0})
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    if not tournament.get("is_public", True):
        raise HTTPException(status_code=403, detail="Torneo privato")
    
    return Tournament(**tournament)

@api_router.get("/tournaments/{tournament_id}", response_model=Tournament)
async def get_tournament(
    tournament_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get tournament by ID"""
    tournament = await db.tournaments.find_one(
        {"id": tournament_id, "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    return Tournament(**tournament)

@api_router.put("/tournaments/{tournament_id}", response_model=Tournament)
async def update_tournament(
    tournament_id: str,
    tournament_data: TournamentUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update tournament"""
    tournament = await db.tournaments.find_one(
        {"id": tournament_id, "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    update_data = {k: v for k, v in tournament_data.dict().items() if v is not None}
    
    if update_data:
        await db.tournaments.update_one(
            {"id": tournament_id},
            {"$set": update_data}
        )
    
    updated = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    return Tournament(**updated)

@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(
    tournament_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete tournament and all related data"""
    tournament = await db.tournaments.find_one(
        {"id": tournament_id, "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    # Delete all related data
    await db.matches.delete_many({"tournament_id": tournament_id})
    await db.match_events.delete_many({"tournament_id": tournament_id})
    await db.news.delete_many({"tournament_id": tournament_id})
    
    # Get teams and delete players
    teams = await db.teams.find({"tournament_id": tournament_id}).to_list(100)
    team_ids = [t["id"] for t in teams]
    await db.players.delete_many({"team_id": {"$in": team_ids}})
    await db.teams.delete_many({"tournament_id": tournament_id})
    
    # Delete tournament
    await db.tournaments.delete_one({"id": tournament_id})
    
    return {"message": "Torneo eliminato"}

# ===================== TEAM ENDPOINTS =====================

@api_router.post("/tournaments/{tournament_id}/teams", response_model=Team)
async def create_team(
    tournament_id: str,
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new team"""
    tournament = await db.tournaments.find_one(
        {"id": tournament_id, "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    # Check plan limits
    if current_user.plan == "free":
        count = await db.teams.count_documents({"tournament_id": tournament_id})
        if count >= SUBSCRIPTION_PLANS["free"]["max_teams"]:
            raise HTTPException(
                status_code=403,
                detail="Limite squadre raggiunto. Passa al piano Pro per aggiungere più squadre."
            )
    
    now = datetime.now(timezone.utc)
    team_id = f"team_{uuid.uuid4().hex[:12]}"
    
    team_doc = {
        "id": team_id,
        "name": team_data.name,
        "logo": team_data.logo,
        "tournament_id": tournament_id,
        "created_at": now
    }
    
    await db.teams.insert_one(team_doc)
    del team_doc["_id"]
    
    return Team(**team_doc)

@api_router.get("/tournaments/{tournament_id}/teams", response_model=List[Team])
async def get_teams(tournament_id: str):
    """Get all teams for a tournament"""
    teams = await db.teams.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    
    return [Team(**t) for t in teams]

@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(
    team_id: str,
    team_data: TeamUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update team"""
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Squadra non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": team["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    update_data = {k: v for k, v in team_data.dict().items() if v is not None}
    
    if update_data:
        await db.teams.update_one({"id": team_id}, {"$set": update_data})
    
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return Team(**updated)

@api_router.delete("/teams/{team_id}")
async def delete_team(
    team_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete team and all players"""
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Squadra non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": team["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    # Delete players
    await db.players.delete_many({"team_id": team_id})
    # Delete team
    await db.teams.delete_one({"id": team_id})
    
    return {"message": "Squadra eliminata"}

# ===================== PLAYER ENDPOINTS =====================

@api_router.post("/teams/{team_id}/players", response_model=Player)
async def create_player(
    team_id: str,
    player_data: PlayerCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new player"""
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Squadra non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": team["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    now = datetime.now(timezone.utc)
    player_id = f"player_{uuid.uuid4().hex[:12]}"
    
    player_doc = {
        "id": player_id,
        "full_name": player_data.full_name,
        "number": player_data.number,
        "role": player_data.role,
        "team_id": team_id,
        "photo": player_data.photo,
        "is_active": True,
        "created_at": now
    }
    
    await db.players.insert_one(player_doc)
    del player_doc["_id"]
    
    return Player(**player_doc)

@api_router.get("/teams/{team_id}/players", response_model=List[Player])
async def get_players(team_id: str):
    """Get all players for a team"""
    players = await db.players.find(
        {"team_id": team_id},
        {"_id": 0}
    ).sort("number", 1).to_list(100)
    
    return [Player(**p) for p in players]

@api_router.put("/players/{player_id}", response_model=Player)
async def update_player(
    player_id: str,
    player_data: PlayerUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update player"""
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Giocatore non trovato")
    
    # Verify ownership through team -> tournament
    team = await db.teams.find_one({"id": player["team_id"]}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Squadra non trovata")
    
    tournament = await db.tournaments.find_one(
        {"id": team["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    update_data = {k: v for k, v in player_data.dict().items() if v is not None}
    
    if update_data:
        await db.players.update_one({"id": player_id}, {"$set": update_data})
    
    updated = await db.players.find_one({"id": player_id}, {"_id": 0})
    return Player(**updated)

@api_router.delete("/players/{player_id}")
async def delete_player(
    player_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete player"""
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Giocatore non trovato")
    
    # Verify ownership
    team = await db.teams.find_one({"id": player["team_id"]}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Squadra non trovata")
    
    tournament = await db.tournaments.find_one(
        {"id": team["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.players.delete_one({"id": player_id})
    return {"message": "Giocatore eliminato"}

# ===================== MATCH ENDPOINTS =====================

@api_router.post("/tournaments/{tournament_id}/matches", response_model=Match)
async def create_match(
    tournament_id: str,
    match_data: MatchCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new match"""
    tournament = await db.tournaments.find_one(
        {"id": tournament_id, "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    now = datetime.now(timezone.utc)
    match_id = f"match_{uuid.uuid4().hex[:12]}"
    
    match_doc = {
        "id": match_id,
        "tournament_id": tournament_id,
        "home_team_id": match_data.home_team_id,
        "away_team_id": match_data.away_team_id,
        "home_goals": None,
        "away_goals": None,
        "match_date": match_data.match_date,
        "match_time": match_data.match_time,
        "venue": match_data.venue,
        "round": match_data.round,
        "status": "scheduled",
        "created_at": now
    }
    
    await db.matches.insert_one(match_doc)
    del match_doc["_id"]
    
    return Match(**match_doc)

@api_router.get("/tournaments/{tournament_id}/matches", response_model=List[Match])
async def get_matches(tournament_id: str):
    """Get all matches for a tournament"""
    matches = await db.matches.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).sort([("match_date", 1), ("match_time", 1)]).to_list(500)
    
    return [Match(**m) for m in matches]

@api_router.put("/matches/{match_id}", response_model=Match)
async def update_match(
    match_id: str,
    match_data: MatchUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update match (including result)"""
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": match["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    update_data = {k: v for k, v in match_data.dict().items() if v is not None}
    
    # If goals are being set, mark as completed
    if "home_goals" in update_data and "away_goals" in update_data:
        if update_data["home_goals"] is not None and update_data["away_goals"] is not None:
            update_data["status"] = "completed"
    
    if update_data:
        await db.matches.update_one({"id": match_id}, {"$set": update_data})
    
    updated = await db.matches.find_one({"id": match_id}, {"_id": 0})
    return Match(**updated)

@api_router.delete("/matches/{match_id}")
async def delete_match(
    match_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete match and all events"""
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": match["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.match_events.delete_many({"match_id": match_id})
    await db.matches.delete_one({"id": match_id})
    
    return {"message": "Partita eliminata"}

# ===================== MATCH EVENTS ENDPOINTS =====================

@api_router.post("/matches/{match_id}/events", response_model=MatchEvent)
async def create_match_event(
    match_id: str,
    event_data: MatchEventCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a match event (goal, card, etc.)"""
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": match["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    now = datetime.now(timezone.utc)
    event_id = f"event_{uuid.uuid4().hex[:12]}"
    
    event_doc = {
        "id": event_id,
        "match_id": match_id,
        "tournament_id": match["tournament_id"],
        "player_id": event_data.player_id,
        "team_id": event_data.team_id,
        "event_type": event_data.event_type,
        "minute": event_data.minute,
        "note": event_data.note,
        "created_at": now
    }
    
    await db.match_events.insert_one(event_doc)
    del event_doc["_id"]
    
    return MatchEvent(**event_doc)

@api_router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a match event"""
    event = await db.match_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    
    # Verify ownership through match -> tournament
    match = await db.matches.find_one({"id": event["match_id"]}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    
    tournament = await db.tournaments.find_one(
        {"id": match["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.match_events.delete_one({"id": event_id})
    return {"message": "Evento eliminato"}

@api_router.post("/matches/{match_id}/events/batch")
async def save_match_events_batch(
    match_id: str,
    data: MatchEventsBatchSave,
    current_user: User = Depends(get_current_user)
):
    """
    Save all match events in batch, update match score, and update player stats.
    This is used by the Extra modal to save all events at once.
    """
    import logging
    logging.info(f"Received batch save request for match {match_id}")
    logging.info(f"Events received: {len(data.events)}")
    logging.info(f"Events data: {data.events}")
    logging.info(f"Home goals: {data.home_goals}, Away goals: {data.away_goals}")
    
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": match["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    now = datetime.now(timezone.utc)
    
    # First, delete existing events for this match (to allow re-saving)
    await db.match_events.delete_many({"match_id": match_id})
    
    # Insert all new events
    created_events = []
    for event_data in data.events:
        event_id = f"event_{uuid.uuid4().hex[:12]}"
        event_doc = {
            "id": event_id,
            "match_id": match_id,
            "tournament_id": match["tournament_id"],
            "player_id": event_data.player_id,
            "team_id": event_data.team_id,
            "event_type": event_data.event_type,
            "minute": event_data.minute,
            "note": event_data.note,
            "created_at": now
        }
        await db.match_events.insert_one(event_doc)
        created_events.append(event_doc)
    
    # Update match score
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "home_goals": data.home_goals,
            "away_goals": data.away_goals,
            "updated_at": now
        }}
    )
    
    # Save player ratings for this match in a separate collection
    if data.ratings:
        for player_id, rating in data.ratings.items():
            await db.player_ratings.update_one(
                {"match_id": match_id, "player_id": player_id},
                {"$set": {
                    "match_id": match_id,
                    "player_id": player_id,
                    "tournament_id": match["tournament_id"],
                    "rating": rating,
                    "created_at": now
                }},
                upsert=True
            )
    
    # Update player statistics based on events
    player_updates = {}
    
    for event in data.events:
        pid = event.player_id
        if pid not in player_updates:
            player_updates[pid] = {
                "goals": 0,
                "assists": 0,
                "yellow_cards": 0,
                "red_cards": 0
            }
        
        if event.event_type in ["goal", "penalty_goal"]:
            player_updates[pid]["goals"] += 1
        elif event.event_type == "assist":
            player_updates[pid]["assists"] += 1
        elif event.event_type == "yellow_card":
            player_updates[pid]["yellow_cards"] += 1
        elif event.event_type == "red_card":
            player_updates[pid]["red_cards"] += 1
    
    # Apply updates to player_stats collection (cumulative stats)
    for player_id, updates in player_updates.items():
        await db.player_stats.update_one(
            {"player_id": player_id},
            {"$inc": {
                "goals": updates["goals"],
                "assists": updates["assists"],
                "yellow_cards": updates["yellow_cards"],
                "red_cards": updates["red_cards"]
            }},
            upsert=True
        )
    
    # Return updated match data
    updated_match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    
    return {
        "message": "Eventi salvati con successo",
        "match": updated_match,
        "events_count": len(created_events)
    }

@api_router.get("/matches/{match_id}/events")
async def get_match_events(match_id: str):
    """Get all events for a match with player names"""
    import logging
    logging.info(f"Getting events for match {match_id}")
    
    # Get all events for this match
    events = await db.match_events.find({"match_id": match_id}, {"_id": 0}).to_list(1000)
    logging.info(f"Found {len(events)} events")
    
    # Enrich events with player names
    enriched_events = []
    for event in events:
        player = await db.players.find_one({"id": event.get("player_id")}, {"_id": 0})
        player_name = player.get("full_name", "Sconosciuto") if player else "Sconosciuto"
        logging.info(f"Event {event.get('event_type')} - Player: {player_name}")
        
        enriched_event = dict(event)
        enriched_event["player_name"] = player_name
        enriched_events.append(enriched_event)
    
    logging.info(f"Returning {len(enriched_events)} enriched events")
    return enriched_events

@api_router.get("/players/{player_id}/stats", response_model=PlayerStatsResponse)
async def get_player_stats(player_id: str):
    """Get cumulative statistics for a player"""
    # Get player info
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Giocatore non trovato")
    
    # Get cumulative stats from player_stats collection
    stats = await db.player_stats.find_one({"player_id": player_id}, {"_id": 0})
    
    # Get all ratings for this player
    ratings = await db.player_ratings.find({"player_id": player_id}, {"_id": 0}).to_list(1000)
    
    # Calculate average rating
    avg_rating = 0.0
    ratings_count = len(ratings)
    if ratings_count > 0:
        total_rating = sum(r.get("rating", 0) for r in ratings)
        avg_rating = round(total_rating / ratings_count, 2)
    
    # Count appearances (unique matches where player has events or ratings)
    matches_with_events = await db.match_events.distinct("match_id", {"player_id": player_id})
    matches_with_ratings = await db.player_ratings.distinct("match_id", {"player_id": player_id})
    all_matches = set(matches_with_events + matches_with_ratings)
    appearances = len(all_matches)
    
    # Calculate minutes (assuming 90 minutes per appearance for now)
    minutes_played = appearances * 90
    
    return PlayerStatsResponse(
        player_id=player_id,
        full_name=player.get("full_name", ""),
        role=player.get("role", ""),
        photo=player.get("photo"),
        goals=stats.get("goals", 0) if stats else 0,
        assists=stats.get("assists", 0) if stats else 0,
        yellow_cards=stats.get("yellow_cards", 0) if stats else 0,
        red_cards=stats.get("red_cards", 0) if stats else 0,
        appearances=appearances,
        minutes_played=minutes_played,
        average_rating=avg_rating,
        ratings_count=ratings_count
    )

# ===================== NEWS ENDPOINTS =====================

@api_router.post("/tournaments/{tournament_id}/news", response_model=News)
async def create_news(
    tournament_id: str,
    news_data: NewsCreate,
    current_user: User = Depends(get_current_user)
):
    """Create news article"""
    tournament = await db.tournaments.find_one(
        {"id": tournament_id, "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    now = datetime.now(timezone.utc)
    news_id = f"news_{uuid.uuid4().hex[:12]}"
    
    news_doc = {
        "id": news_id,
        "tournament_id": tournament_id,
        "title": news_data.title,
        "content": news_data.content,
        "photo": news_data.photo,
        "is_published": news_data.is_published,
        "published_at": now if news_data.is_published else None,
        "created_at": now
    }
    
    await db.news.insert_one(news_doc)
    del news_doc["_id"]
    
    return News(**news_doc)

@api_router.get("/tournaments/{tournament_id}/news", response_model=List[News])
async def get_news(tournament_id: str, published_only: bool = True):
    """Get news for a tournament"""
    query = {"tournament_id": tournament_id}
    if published_only:
        query["is_published"] = True
    
    news_list = await db.news.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [News(**n) for n in news_list]

@api_router.put("/news/{news_id}", response_model=News)
async def update_news(
    news_id: str,
    news_data: NewsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update news article"""
    news = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="News non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": news["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    update_data = {k: v for k, v in news_data.dict().items() if v is not None}
    
    # Set published_at if publishing
    if update_data.get("is_published") and not news.get("published_at"):
        update_data["published_at"] = datetime.now(timezone.utc)
    
    if update_data:
        await db.news.update_one({"id": news_id}, {"$set": update_data})
    
    updated = await db.news.find_one({"id": news_id}, {"_id": 0})
    return News(**updated)

@api_router.delete("/news/{news_id}")
async def delete_news(
    news_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete news article"""
    news = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="News non trovata")
    
    # Verify ownership
    tournament = await db.tournaments.find_one(
        {"id": news["tournament_id"], "organizer_id": current_user.user_id},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.news.delete_one({"id": news_id})
    return {"message": "News eliminata"}

# ===================== STATISTICS ENDPOINTS =====================

@api_router.get("/tournaments/{tournament_id}/standings")
async def get_standings(tournament_id: str):
    """Calculate and return standings for a tournament"""
    teams = await db.teams.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).to_list(100)
    
    if not teams:
        return []
    
    matches = await db.matches.find(
        {"tournament_id": tournament_id, "status": "completed"},
        {"_id": 0}
    ).to_list(500)
    
    # Initialize standings
    standings = {}
    for team in teams:
        standings[team["id"]] = {
            "team_id": team["id"],
            "team_name": team["name"],
            "team_logo": team.get("logo"),
            "played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "goals_for": 0,
            "goals_against": 0,
            "goal_difference": 0,
            "points": 0,
            "form": []  # Last 5 results
        }
    
    # Calculate standings from matches
    for match in matches:
        home_id = match["home_team_id"]
        away_id = match["away_team_id"]
        home_goals = match.get("home_goals", 0) or 0
        away_goals = match.get("away_goals", 0) or 0
        
        if home_id not in standings or away_id not in standings:
            continue
        
        # Update played
        standings[home_id]["played"] += 1
        standings[away_id]["played"] += 1
        
        # Update goals
        standings[home_id]["goals_for"] += home_goals
        standings[home_id]["goals_against"] += away_goals
        standings[away_id]["goals_for"] += away_goals
        standings[away_id]["goals_against"] += home_goals
        
        # Update wins/draws/losses and form
        if home_goals > away_goals:
            standings[home_id]["wins"] += 1
            standings[home_id]["points"] += 3
            standings[home_id]["form"].append("W")
            standings[away_id]["losses"] += 1
            standings[away_id]["form"].append("L")
        elif home_goals < away_goals:
            standings[away_id]["wins"] += 1
            standings[away_id]["points"] += 3
            standings[away_id]["form"].append("W")
            standings[home_id]["losses"] += 1
            standings[home_id]["form"].append("L")
        else:
            standings[home_id]["draws"] += 1
            standings[home_id]["points"] += 1
            standings[home_id]["form"].append("D")
            standings[away_id]["draws"] += 1
            standings[away_id]["points"] += 1
            standings[away_id]["form"].append("D")
    
    # Calculate goal difference and limit form to last 5
    for team_id in standings:
        standings[team_id]["goal_difference"] = (
            standings[team_id]["goals_for"] - standings[team_id]["goals_against"]
        )
        standings[team_id]["form"] = standings[team_id]["form"][-5:]
    
    # Sort standings
    sorted_standings = sorted(
        standings.values(),
        key=lambda x: (x["points"], x["goal_difference"], x["goals_for"]),
        reverse=True
    )
    
    # Add position
    for i, team in enumerate(sorted_standings):
        team["position"] = i + 1
    
    return sorted_standings

@api_router.get("/tournaments/{tournament_id}/scorers")
async def get_top_scorers(tournament_id: str):
    """Get top scorers for a tournament"""
    # Get all goal events
    goal_events = await db.match_events.find(
        {
            "tournament_id": tournament_id,
            "event_type": {"$in": ["goal", "penalty_goal"]}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Get all assist events
    assist_events = await db.match_events.find(
        {"tournament_id": tournament_id, "event_type": "assist"},
        {"_id": 0}
    ).to_list(1000)
    
    # Aggregate stats by player
    player_stats = {}
    
    for event in goal_events:
        player_id = event["player_id"]
        if player_id not in player_stats:
            player_stats[player_id] = {"goals": 0, "assists": 0, "matches": set()}
        player_stats[player_id]["goals"] += 1
        player_stats[player_id]["matches"].add(event["match_id"])
    
    for event in assist_events:
        player_id = event["player_id"]
        if player_id not in player_stats:
            player_stats[player_id] = {"goals": 0, "assists": 0, "matches": set()}
        player_stats[player_id]["assists"] += 1
        player_stats[player_id]["matches"].add(event["match_id"])
    
    # Get player details
    player_ids = list(player_stats.keys())
    players = await db.players.find(
        {"id": {"$in": player_ids}},
        {"_id": 0}
    ).to_list(100)
    
    player_map = {p["id"]: p for p in players}
    
    # Get team details
    team_ids = list(set(p.get("team_id") for p in players if p.get("team_id")))
    teams = await db.teams.find(
        {"id": {"$in": team_ids}},
        {"_id": 0}
    ).to_list(100)
    
    team_map = {t["id"]: t for t in teams}
    
    # Build scorers list
    scorers = []
    for player_id, stats in player_stats.items():
        player = player_map.get(player_id)
        if not player:
            continue
        
        team = team_map.get(player.get("team_id"))
        matches_played = len(stats["matches"])
        goals = stats["goals"]
        
        scorers.append({
            "player_id": player_id,
            "player_name": player.get("full_name"),
            "player_photo": player.get("photo"),
            "player_number": player.get("number"),
            "team_id": player.get("team_id"),
            "team_name": team.get("name") if team else None,
            "team_logo": team.get("logo") if team else None,
            "goals": goals,
            "assists": stats["assists"],
            "matches_played": matches_played,
            "goals_per_match": round(goals / matches_played, 2) if matches_played > 0 else 0
        })
    
    # Sort by goals
    scorers.sort(key=lambda x: (x["goals"], x["assists"]), reverse=True)
    
    # Add position
    for i, scorer in enumerate(scorers):
        scorer["position"] = i + 1
    
    return scorers

@api_router.get("/tournaments/{tournament_id}/player-stats")
async def get_player_stats(tournament_id: str):
    """Get detailed player statistics"""
    # Get all events
    events = await db.match_events.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).to_list(5000)
    
    # Aggregate stats
    player_stats = {}
    
    for event in events:
        player_id = event["player_id"]
        if player_id not in player_stats:
            player_stats[player_id] = {
                "goals": 0,
                "assists": 0,
                "penalty_goals": 0,
                "own_goals": 0,
                "yellow_cards": 0,
                "red_cards": 0,
                "mvp_awards": 0,
                "matches": set()
            }
        
        stats = player_stats[player_id]
        event_type = event["event_type"]
        stats["matches"].add(event["match_id"])
        
        if event_type == "goal":
            stats["goals"] += 1
        elif event_type == "assist":
            stats["assists"] += 1
        elif event_type == "penalty_goal":
            stats["penalty_goals"] += 1
            stats["goals"] += 1
        elif event_type == "own_goal":
            stats["own_goals"] += 1
        elif event_type == "yellow_card":
            stats["yellow_cards"] += 1
        elif event_type == "red_card":
            stats["red_cards"] += 1
        elif event_type == "mvp":
            stats["mvp_awards"] += 1
    
    # Get player and team details
    player_ids = list(player_stats.keys())
    players = await db.players.find(
        {"id": {"$in": player_ids}},
        {"_id": 0}
    ).to_list(500)
    
    player_map = {p["id"]: p for p in players}
    
    team_ids = list(set(p.get("team_id") for p in players if p.get("team_id")))
    teams = await db.teams.find(
        {"id": {"$in": team_ids}},
        {"_id": 0}
    ).to_list(100)
    
    team_map = {t["id"]: t for t in teams}
    
    # Build result
    result = []
    for player_id, stats in player_stats.items():
        player = player_map.get(player_id)
        if not player:
            continue
        
        team = team_map.get(player.get("team_id"))
        
        result.append({
            "player_id": player_id,
            "player_name": player.get("full_name"),
            "player_photo": player.get("photo"),
            "player_number": player.get("number"),
            "role": player.get("role"),
            "team_id": player.get("team_id"),
            "team_name": team.get("name") if team else None,
            "team_logo": team.get("logo") if team else None,
            "goals": stats["goals"],
            "assists": stats["assists"],
            "penalty_goals": stats["penalty_goals"],
            "own_goals": stats["own_goals"],
            "yellow_cards": stats["yellow_cards"],
            "red_cards": stats["red_cards"],
            "mvp_awards": stats["mvp_awards"],
            "appearances": len(stats["matches"])
        })
    
    result.sort(key=lambda x: (x["goals"], x["assists"]), reverse=True)
    
    return result

# ===================== PAYMENT ENDPOINTS =====================

@api_router.post("/payments/checkout")
async def create_checkout_session(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Create Stripe checkout session for subscription"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest
    )
    
    body = await request.json()
    plan = body.get("plan")  # pro_monthly, pro_yearly, club_monthly, club_yearly
    origin_url = body.get("origin_url")
    
    if not plan or not origin_url:
        raise HTTPException(status_code=400, detail="Piano e origin_url richiesti")
    
    # Define fixed prices
    PLANS = {
        "pro_monthly": 9.99,
        "pro_yearly": 79.00,
        "club_monthly": 19.99,
        "club_yearly": 149.00
    }
    
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Piano non valido")
    
    amount = PLANS[plan]
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    success_url = f"{origin_url}/dashboard/subscription?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/dashboard/subscription"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user.user_id,
            "plan": plan,
            "source": "goalmanager"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    now = datetime.now(timezone.utc)
    await db.payment_transactions.insert_one({
        "id": f"payment_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "session_id": session.session_id,
        "amount": amount,
        "currency": "eur",
        "plan": plan,
        "status": "pending",
        "payment_status": "initiated",
        "created_at": now
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def check_payment_status(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Check payment status and update user plan"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if transaction:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": status.status, "payment_status": status.payment_status}}
        )
        
        # If paid and not already processed
        if status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            plan = transaction.get("plan", "")
            plan_type = "pro" if "pro" in plan else "club"
            is_yearly = "yearly" in plan
            
            expiry = datetime.now(timezone.utc) + timedelta(days=365 if is_yearly else 30)
            
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$set": {"plan": plan_type, "plan_expiry": expiry}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "complete", "payment_status": "paid"}}
            )
            
            # Get transaction to update user
            transaction = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
            
            if transaction:
                user_id = transaction.get("user_id")
                plan = transaction.get("plan", "")
                plan_type = "pro" if "pro" in plan else "club"
                is_yearly = "yearly" in plan
                
                expiry = datetime.now(timezone.utc) + timedelta(days=365 if is_yearly else 30)
                
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"plan": plan_type, "plan_expiry": expiry}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "GoalManager API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
