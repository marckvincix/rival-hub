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
db = client[os.environ['DB_NAME']]

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
    created_at: datetime

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

# Tournament Models
class TournamentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sport: str = "calcio"  # calcio, basket, padel, tennis, pallavolo, rugby, baseball, nuoto, ciclismo, atletica
    category: str = "Open"  # U8, U10, U12, U14, U16, U18, Senior, Open
    format: str = "league"  # league, knockout, groups_knockout, mixed
    game_format: str = "11v11"  # Dynamic based on sport
    custom_players_per_side: Optional[int] = None  # For custom format
    game_structure: Optional[str] = None  # e.g., "4_quarters", "2_halves", "3_sets", "5_sets"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    logo: Optional[str] = None  # base64
    is_public: bool = True

class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sport: Optional[str] = None
    category: Optional[str] = None
    format: Optional[str] = None
    game_format: Optional[str] = None
    custom_players_per_side: Optional[int] = None
    game_structure: Optional[str] = None
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
    sport: str = "calcio"
    category: str = "Open"
    format: str = "league"
    game_format: str = "11v11"
    custom_players_per_side: Optional[int] = None
    game_structure: Optional[str] = None
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
    role: Optional[str] = None  # Optional for sports like tennis/padel that don't have roles
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
    role: Optional[str] = None  # Optional for sports like tennis/padel that don't have roles
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
    # Basketball specific fields
    periods_score: Optional[Dict[str, Dict[str, int]]] = None  # {"Q1": {"home": 20, "away": 18}, ...}
    home_team_fouls: Optional[Dict[str, int]] = None  # {"Q1": 3, "Q2": 2, ...}
    away_team_fouls: Optional[Dict[str, int]] = None
    current_period: Optional[str] = None  # Q1, Q2, Q3, Q4, OT, T1, T2
    timer_seconds: Optional[int] = None
    timer_running: Optional[bool] = None
    # Tennis specific fields
    tennis_sets: Optional[List[Dict]] = None  # List of set scores
    currentGame: Optional[Dict] = None  # Current game state {homePoints, awayPoints, isDeuce, advantage, homeGamesInSet, awayGamesInSet}
    home_stats: Optional[Dict] = None  # Tennis player stats (aces, double_faults, etc.)
    away_stats: Optional[Dict] = None

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
    status: str = "scheduled"  # scheduled, in_progress, completed
    # Basketball specific fields
    periods_score: Optional[Dict[str, Dict[str, int]]] = None
    home_team_fouls: Optional[Dict[str, int]] = None
    away_team_fouls: Optional[Dict[str, int]] = None
    current_period: Optional[str] = None
    timer_seconds: Optional[int] = None
    timer_running: Optional[bool] = None
    # Tennis specific fields
    tennis_sets: Optional[List[Dict]] = None
    currentGame: Optional[Dict] = None
    home_stats: Optional[Dict] = None
    away_stats: Optional[Dict] = None
    created_at: datetime

# Match Event Models
class MatchEventCreate(BaseModel):
    player_id: str
    team_id: str
    event_type: str  # Football: goal, assist, penalty_goal, own_goal, yellow_card, red_card, substitution_in, substitution_out, mvp
                     # Basketball: points_1pt, points_2pt, points_3pt, rebound, assist, foul, steal, block
    minute: Optional[int] = None
    note: Optional[str] = None
    period: Optional[str] = None  # For basketball: Q1, Q2, Q3, Q4, OT, T1, T2
    points_value: Optional[int] = None  # 1, 2, or 3 for basketball

class MatchEvent(BaseModel):
    id: str
    match_id: str
    player_id: str
    team_id: str
    event_type: str
    minute: Optional[int] = None
    note: Optional[str] = None
    period: Optional[str] = None
    points_value: Optional[int] = None
    created_at: datetime

# Match Events Batch Save Model
class MatchEventsBatchSave(BaseModel):
    events: List[MatchEventCreate]
    ratings: Dict[str, float] = {}  # player_id -> rating
    home_goals: int = 0
    away_goals: int = 0
    # Basketball specific
    periods_score: Optional[Dict[str, Dict[str, int]]] = None
    home_team_fouls: Optional[Dict[str, int]] = None
    away_team_fouls: Optional[Dict[str, int]] = None

# Player Stats Response Model (for the stats modal)
class PlayerStatsResponse(BaseModel):
    player_id: str
    full_name: str
    role: str
    photo: Optional[str] = None
    # Football stats
    goals: int = 0
    assists: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    appearances: int = 0
    minutes_played: int = 0
    average_rating: float = 0.0
    ratings_count: int = 0
    # Basketball stats
    points_1pt: int = 0
    points_2pt: int = 0
    points_3pt: int = 0
    total_points: int = 0
    rebounds: int = 0
    basketball_assists: int = 0
    fouls: int = 0
    steals: int = 0
    blocks: int = 0

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

# Formation Models
class FormationPlayer(BaseModel):
    player_id: str
    position: str  # goalkeeper, defender, midfielder, forward
    slot_index: int  # Position in the lineup (0-based index within position group)

class FormationCreate(BaseModel):
    module: str  # e.g., "4-3-3", "4-4-2", "1-2-1"
    starters: List[FormationPlayer]  # Players in starting lineup
    bench: List[str] = []  # List of player_ids on bench

class FormationUpdate(BaseModel):
    module: Optional[str] = None
    starters: Optional[List[FormationPlayer]] = None
    bench: Optional[List[str]] = None

class Formation(BaseModel):
    id: str
    team_id: str
    tournament_id: str
    module: str
    starters: List[FormationPlayer]
    bench: List[str] = []
    created_at: datetime
    updated_at: datetime

# ===================== FAVORITES & NOTIFICATIONS MODELS =====================

class FavoriteCreate(BaseModel):
    type: str  # "tournament" or "team"
    reference_id: str  # tournament_id or team_id
    notifications_enabled: bool = True

class FavoriteUpdate(BaseModel):
    notifications_enabled: bool

class Favorite(BaseModel):
    id: str
    user_id: str
    type: str  # "tournament" or "team"
    reference_id: str
    notifications_enabled: bool = True
    created_at: datetime

class PushTokenCreate(BaseModel):
    token: str
    device_type: str = "unknown"  # ios, android, web

class PushToken(BaseModel):
    id: str
    user_id: str
    token: str
    device_type: str
    created_at: datetime

class NotificationSettingsUpdate(BaseModel):
    notifications_enabled: bool  # Global toggle

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
    oauth_session_url = os.getenv("OAUTH_SESSION_URL", "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                oauth_session_url,
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
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
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
        picture=current_user.picture
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
    now = datetime.now(timezone.utc)
    tournament_id = f"tournament_{uuid.uuid4().hex[:12]}"
    slug = await get_unique_slug(tournament_data.name)
    
    tournament_doc = {
        "id": tournament_id,
        "slug": slug,
        "name": tournament_data.name,
        "description": tournament_data.description,
        "organizer_id": current_user.user_id,
        "sport": tournament_data.sport,
        "category": tournament_data.category,
        "format": tournament_data.format,
        "game_format": tournament_data.game_format,
        "custom_players_per_side": tournament_data.custom_players_per_side,
        "game_structure": tournament_data.game_structure,
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

# ===================== FORMATION ENDPOINTS =====================

@api_router.get("/teams/{team_id}/formation")
async def get_team_formation(team_id: str):
    """Get formation for a team (public endpoint)"""
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Squadra non trovata")
    
    formation = await db.formations.find_one({"team_id": team_id}, {"_id": 0})
    if not formation:
        return None
    
    # Enrich with player details
    enriched_starters = []
    for starter in formation.get("starters", []):
        player = await db.players.find_one({"id": starter["player_id"]}, {"_id": 0})
        if player:
            enriched_starters.append({
                **starter,
                "player_name": player.get("full_name", ""),
                "player_number": player.get("number"),
                "player_photo": player.get("photo"),
                "player_role": player.get("role", "")
            })
    
    enriched_bench = []
    for player_id in formation.get("bench", []):
        player = await db.players.find_one({"id": player_id}, {"_id": 0})
        if player:
            enriched_bench.append({
                "player_id": player_id,
                "player_name": player.get("full_name", ""),
                "player_number": player.get("number"),
                "player_photo": player.get("photo"),
                "player_role": player.get("role", "")
            })
    
    return {
        **formation,
        "starters": enriched_starters,
        "bench": enriched_bench
    }

@api_router.post("/teams/{team_id}/formation")
async def save_team_formation(
    team_id: str,
    formation_data: FormationCreate,
    current_user: User = Depends(get_current_user)
):
    """Create or update formation for a team"""
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
    
    # Check if formation exists
    existing = await db.formations.find_one({"team_id": team_id}, {"_id": 0})
    
    if existing:
        # Update existing formation
        await db.formations.update_one(
            {"team_id": team_id},
            {"$set": {
                "module": formation_data.module,
                "starters": [s.dict() for s in formation_data.starters],
                "bench": formation_data.bench,
                "updated_at": now
            }}
        )
        formation_id = existing["id"]
    else:
        # Create new formation
        formation_id = f"formation_{uuid.uuid4().hex[:12]}"
        formation_doc = {
            "id": formation_id,
            "team_id": team_id,
            "tournament_id": team["tournament_id"],
            "module": formation_data.module,
            "starters": [s.dict() for s in formation_data.starters],
            "bench": formation_data.bench,
            "created_at": now,
            "updated_at": now
        }
        await db.formations.insert_one(formation_doc)
    
    # Return the saved formation
    saved = await db.formations.find_one({"id": formation_id}, {"_id": 0})
    return saved

@api_router.get("/tournaments/{tournament_id}/formations")
async def get_tournament_formations(tournament_id: str):
    """Get all formations for a tournament (public endpoint)"""
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    formations = await db.formations.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich each formation with player details
    enriched_formations = []
    for formation in formations:
        enriched_starters = []
        for starter in formation.get("starters", []):
            player = await db.players.find_one({"id": starter["player_id"]}, {"_id": 0})
            if player:
                enriched_starters.append({
                    **starter,
                    "player_name": player.get("full_name", ""),
                    "player_number": player.get("number"),
                    "player_photo": player.get("photo"),
                    "player_role": player.get("role", "")
                })
        
        enriched_bench = []
        for player_id in formation.get("bench", []):
            player = await db.players.find_one({"id": player_id}, {"_id": 0})
            if player:
                enriched_bench.append({
                    "player_id": player_id,
                    "player_name": player.get("full_name", ""),
                    "player_number": player.get("number"),
                    "player_photo": player.get("photo"),
                    "player_role": player.get("role", "")
                })
        
        enriched_formations.append({
            **formation,
            "starters": enriched_starters,
            "bench": enriched_bench
        })
    
    return enriched_formations

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
    
    # Send notification to tournament followers
    home_team = await db.teams.find_one({"id": match_data.home_team_id}, {"_id": 0, "name": 1})
    away_team = await db.teams.find_one({"id": match_data.away_team_id}, {"_id": 0, "name": 1})
    
    if home_team and away_team:
        date_str = match_data.match_date if match_data.match_date else "data da definire"
        time_str = match_data.match_time if match_data.match_time else ""
        
        await notify_tournament_followers(
            tournament_id,
            f"Nuova partita nel Torneo {tournament['name']}",
            f"{home_team['name']} vs {away_team['name']} il {date_str} {time_str}".strip(),
            {"type": "new_match", "match_id": match_id, "tournament_id": tournament_id}
        )
        
        # Notify team followers
        await notify_team_followers(
            match_data.home_team_id,
            f"Partita programmata per {home_team['name']}",
            f"Gioca il {date_str} {time_str} contro {away_team['name']}".strip(),
            {"type": "team_match_scheduled", "match_id": match_id}
        )
        await notify_team_followers(
            match_data.away_team_id,
            f"Partita programmata per {away_team['name']}",
            f"Gioca il {date_str} {time_str} contro {home_team['name']}".strip(),
            {"type": "team_match_scheduled", "match_id": match_id}
        )
    
    return Match(**match_doc)

@api_router.get("/tournaments/{tournament_id}/matches", response_model=List[Match])
async def get_matches(tournament_id: str):
    """Get all matches for a tournament"""
    matches = await db.matches.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).sort([("match_date", 1), ("match_time", 1)]).to_list(500)
    
    return [Match(**m) for m in matches]

@api_router.get("/tournaments/{tournament_id}/matches-live")
async def get_matches_live(tournament_id: str):
    """Get all matches for a tournament with LIVE scores calculated from events"""
    matches = await db.matches.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).sort([("match_date", 1), ("match_time", 1)]).to_list(500)
    
    # Get tournament to know the sport type
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0, "sport": 1})
    sport = tournament.get("sport", "calcio") if tournament else "calcio"
    is_basketball = sport == "basket"
    is_tennis = sport == "tennis"
    is_padel = sport == "padel"
    
    result = []
    for match in matches:
        match_id = match.get("id")
        
        # Get events for this match
        events = await db.match_events.find(
            {"match_id": match_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Calculate live score
        home_score = 0
        away_score = 0
        has_live_data = False
        
        if is_basketball:
            # Basketball scoring from events
            for event in events:
                event_type = event.get("event_type", "")
                team_id = event.get("team_id")
                
                pts = 0
                if event_type == "points_3pt":
                    pts = 3
                elif event_type == "points_2pt":
                    pts = 2
                elif event_type == "points_1pt":
                    pts = 1
                
                if pts > 0:
                    if team_id == match.get("home_team_id"):
                        home_score += pts
                    else:
                        away_score += pts
            has_live_data = len(events) > 0
        elif is_tennis or is_padel:
            # Tennis/Padel: Use home_goals/away_goals (sets won) directly from match data
            # These are updated in real-time by the organizer via TennisMatchModal
            home_score = match.get("home_goals", 0) or 0
            away_score = match.get("away_goals", 0) or 0
            # Has live data only if match is in_progress and has some data
            tennis_sets = match.get("tennis_sets", [])
            current_game = match.get("currentGame", {})
            is_in_progress = match.get("status") == "in_progress"
            has_game_data = len(tennis_sets) > 0 or home_score > 0 or away_score > 0 or current_game.get("homePoints", 0) > 0 or current_game.get("awayPoints", 0) > 0
            # Only mark as live if match is in progress (not completed)
            has_live_data = is_in_progress and has_game_data
        else:
            # Soccer scoring - first try from events, then fallback to home_goals/away_goals
            for event in events:
                if event.get("event_type") == "goal":
                    if event.get("team_id") == match.get("home_team_id"):
                        home_score += 1
                    else:
                        away_score += 1
            
            # If no events but status is in_progress, use home_goals/away_goals
            if len(events) == 0 and match.get("status") == "in_progress":
                home_score = match.get("home_goals", 0) or 0
                away_score = match.get("away_goals", 0) or 0
            
            # Has live data if has events OR status is in_progress
            has_live_data = len(events) > 0 or match.get("status") == "in_progress"
        
        # Add live_score to match data
        match_data = {**match}
        match_data["live_home_score"] = home_score
        match_data["live_away_score"] = away_score
        match_data["has_events"] = has_live_data
        result.append(match_data)
    
    return result

@api_router.get("/matches/{match_id}")
async def get_match(match_id: str):
    """Get a single match by ID"""
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    return match

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
    
    # Track if match is being completed
    is_completing = False
    
    # If goals are being set AND status is not explicitly set to in_progress, mark as completed
    # This allows auto-save during live matches without marking them as completed
    if "home_goals" in update_data and "away_goals" in update_data:
        if update_data["home_goals"] is not None and update_data["away_goals"] is not None:
            # Only auto-complete if status is not explicitly set to "in_progress"
            if "status" not in update_data or update_data.get("status") != "in_progress":
                update_data["status"] = "completed"
            is_completing = update_data.get("status") == "completed" and match.get("status") != "completed"
    
    if update_data:
        await db.matches.update_one({"id": match_id}, {"$set": update_data})
    
    updated = await db.matches.find_one({"id": match_id}, {"_id": 0})
    
    # Send notifications for score updates
    if "home_goals" in update_data or "away_goals" in update_data:
        home_team = await db.teams.find_one({"id": match["home_team_id"]}, {"_id": 0, "name": 1})
        away_team = await db.teams.find_one({"id": match["away_team_id"]}, {"_id": 0, "name": 1})
        
        if home_team and away_team:
            home_goals = updated.get("home_goals", 0) or 0
            away_goals = updated.get("away_goals", 0) or 0
            
            if is_completing:
                # Match ended notification
                await notify_tournament_followers(
                    match["tournament_id"],
                    f"Risultato finale - {tournament['name']}",
                    f"{home_team['name']} {home_goals} - {away_goals} {away_team['name']}",
                    {"type": "match_ended", "match_id": match_id}
                )
                
                # Team followers
                await notify_team_followers(
                    match["home_team_id"],
                    "Partita terminata",
                    f"{home_team['name']} {home_goals} - {away_goals} {away_team['name']}",
                    {"type": "team_match_ended", "match_id": match_id}
                )
                await notify_team_followers(
                    match["away_team_id"],
                    "Partita terminata",
                    f"{away_team['name']} {away_goals} - {home_goals} {home_team['name']}",
                    {"type": "team_match_ended", "match_id": match_id}
                )
            else:
                # Score update notification
                await notify_tournament_followers(
                    match["tournament_id"],
                    f"Aggiornamento - {tournament['name']}",
                    f"{home_team['name']} {home_goals} - {away_goals} {away_team['name']}",
                    {"type": "score_update", "match_id": match_id}
                )
    
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
    
    # Send notification for goals
    if event_data.event_type == "goal":
        scoring_team = await db.teams.find_one({"id": event_data.team_id}, {"_id": 0, "name": 1})
        home_team = await db.teams.find_one({"id": match["home_team_id"]}, {"_id": 0, "name": 1})
        away_team = await db.teams.find_one({"id": match["away_team_id"]}, {"_id": 0, "name": 1})
        
        if scoring_team and home_team and away_team:
            # Count current goals
            home_goals = await db.match_events.count_documents({
                "match_id": match_id,
                "team_id": match["home_team_id"],
                "event_type": "goal"
            })
            away_goals = await db.match_events.count_documents({
                "match_id": match_id,
                "team_id": match["away_team_id"],
                "event_type": "goal"
            })
            
            # Notify team followers of the goal
            await notify_team_followers(
                event_data.team_id,
                f"GOOOL! {scoring_team['name']} segna!",
                f"Risultato: {home_team['name']} {home_goals} - {away_goals} {away_team['name']}",
                {"type": "goal", "match_id": match_id, "team_id": event_data.team_id}
            )
    
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
    
    # Update match score (with basketball specific fields if present)
    match_update = {
        "home_goals": data.home_goals,
        "away_goals": data.away_goals,
        "updated_at": now
    }
    
    # Add basketball specific fields if present
    if data.periods_score is not None:
        match_update["periods_score"] = data.periods_score
    if data.home_team_fouls is not None:
        match_update["home_team_fouls"] = data.home_team_fouls
    if data.away_team_fouls is not None:
        match_update["away_team_fouls"] = data.away_team_fouls
    
    await db.matches.update_one(
        {"id": match_id},
        {"$set": match_update}
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
    
    # Update player statistics based on events (Football + Basketball)
    player_updates = {}
    
    for event in data.events:
        pid = event.player_id
        if pid not in player_updates:
            player_updates[pid] = {
                # Football stats
                "goals": 0,
                "assists": 0,
                "yellow_cards": 0,
                "red_cards": 0,
                # Basketball stats
                "points_1pt": 0,
                "points_2pt": 0,
                "points_3pt": 0,
                "rebounds": 0,
                "basketball_assists": 0,
                "fouls": 0,
                "steals": 0,
                "blocks": 0
            }
        
        et = event.event_type
        # Football events
        if et in ["goal", "penalty_goal"]:
            player_updates[pid]["goals"] += 1
        elif et == "assist":
            player_updates[pid]["assists"] += 1
        elif et == "yellow_card":
            player_updates[pid]["yellow_cards"] += 1
        elif et == "red_card":
            player_updates[pid]["red_cards"] += 1
        # Basketball events
        elif et == "points_1pt":
            player_updates[pid]["points_1pt"] += 1
        elif et == "points_2pt":
            player_updates[pid]["points_2pt"] += 1
        elif et == "points_3pt":
            player_updates[pid]["points_3pt"] += 1
        elif et == "rebound":
            player_updates[pid]["rebounds"] += 1
        elif et == "basketball_assist":
            player_updates[pid]["basketball_assists"] += 1
        elif et == "foul":
            player_updates[pid]["fouls"] += 1
        elif et == "steal":
            player_updates[pid]["steals"] += 1
        elif et == "block":
            player_updates[pid]["blocks"] += 1
    
    # Apply updates to player_stats collection (cumulative stats)
    for player_id, updates in player_updates.items():
        await db.player_stats.update_one(
            {"player_id": player_id},
            {"$inc": {
                # Football
                "goals": updates["goals"],
                "assists": updates["assists"],
                "yellow_cards": updates["yellow_cards"],
                "red_cards": updates["red_cards"],
                # Basketball
                "points_1pt": updates["points_1pt"],
                "points_2pt": updates["points_2pt"],
                "points_3pt": updates["points_3pt"],
                "rebounds": updates["rebounds"],
                "basketball_assists": updates["basketball_assists"],
                "fouls": updates["fouls"],
                "steals": updates["steals"],
                "blocks": updates["blocks"]
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
    """Get cumulative statistics for a player (Football and Basketball)"""
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
    
    # Calculate minutes (assuming 90 minutes per appearance for football, 40 for basketball)
    minutes_played = appearances * 90
    
    # Basketball stats
    points_1pt = stats.get("points_1pt", 0) if stats else 0
    points_2pt = stats.get("points_2pt", 0) if stats else 0
    points_3pt = stats.get("points_3pt", 0) if stats else 0
    total_points = points_1pt + (points_2pt * 2) + (points_3pt * 3)
    
    return PlayerStatsResponse(
        player_id=player_id,
        full_name=player.get("full_name", ""),
        role=player.get("role", ""),
        photo=player.get("photo"),
        # Football stats
        goals=stats.get("goals", 0) if stats else 0,
        assists=stats.get("assists", 0) if stats else 0,
        yellow_cards=stats.get("yellow_cards", 0) if stats else 0,
        red_cards=stats.get("red_cards", 0) if stats else 0,
        appearances=appearances,
        minutes_played=minutes_played,
        average_rating=avg_rating,
        ratings_count=ratings_count,
        # Basketball stats
        points_1pt=points_1pt,
        points_2pt=points_2pt,
        points_3pt=points_3pt,
        total_points=total_points,
        rebounds=stats.get("rebounds", 0) if stats else 0,
        basketball_assists=stats.get("basketball_assists", 0) if stats else 0,
        fouls=stats.get("fouls", 0) if stats else 0,
        steals=stats.get("steals", 0) if stats else 0,
        blocks=stats.get("blocks", 0) if stats else 0
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

@api_router.get("/tournaments/{tournament_id}/basketball-standings")
async def get_basketball_standings(tournament_id: str):
    """Get standings for a basketball tournament (2 pts win, 0 pts loss)"""
    # Get tournament to check sport
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    # Get all teams
    teams = await db.teams.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get completed matches
    matches = await db.matches.find(
        {"tournament_id": tournament_id, "status": "completed"},
        {"_id": 0}
    ).to_list(500)
    
    # Initialize standings (basketball style)
    standings = {}
    for team in teams:
        standings[team["id"]] = {
            "team_id": team["id"],
            "team_name": team["name"],
            "team_logo": team.get("logo"),
            "played": 0,
            "wins": 0,
            "losses": 0,
            "points_for": 0,
            "points_against": 0,
            "point_difference": 0,
            "points": 0,  # 2 per vittoria, 0 per sconfitta
            "form": []
        }
    
    # Calculate standings from matches
    for match in matches:
        home_id = match["home_team_id"]
        away_id = match["away_team_id"]
        home_score = match.get("home_goals", 0) or 0
        away_score = match.get("away_goals", 0) or 0
        
        if home_id not in standings or away_id not in standings:
            continue
        
        # Update played
        standings[home_id]["played"] += 1
        standings[away_id]["played"] += 1
        
        # Update points scored
        standings[home_id]["points_for"] += home_score
        standings[home_id]["points_against"] += away_score
        standings[away_id]["points_for"] += away_score
        standings[away_id]["points_against"] += home_score
        
        # Determine winner (no draws in basketball)
        if home_score > away_score:
            standings[home_id]["wins"] += 1
            standings[home_id]["points"] += 2
            standings[home_id]["form"].append("W")
            standings[away_id]["losses"] += 1
            standings[away_id]["form"].append("L")
        else:
            standings[away_id]["wins"] += 1
            standings[away_id]["points"] += 2
            standings[away_id]["form"].append("W")
            standings[home_id]["losses"] += 1
            standings[home_id]["form"].append("L")
    
    # Calculate point difference and keep only last 5 form
    for team in standings.values():
        team["point_difference"] = team["points_for"] - team["points_against"]
        team["form"] = team["form"][-5:]
    
    # Sort standings (points, then point difference, then points scored)
    sorted_standings = sorted(
        standings.values(),
        key=lambda x: (x["points"], x["point_difference"], x["points_for"]),
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

@api_router.get("/tournaments/{tournament_id}/basketball-scorers")
async def get_basketball_top_scorers(tournament_id: str):
    """Get top scorers for a basketball tournament"""
    # Get all point events
    point_events = await db.match_events.find(
        {
            "tournament_id": tournament_id,
            "event_type": {"$in": ["points_1pt", "points_2pt", "points_3pt"]}
        },
        {"_id": 0}
    ).to_list(3000)
    
    # Get all assist events
    assist_events = await db.match_events.find(
        {"tournament_id": tournament_id, "event_type": "basketball_assist"},
        {"_id": 0}
    ).to_list(1000)
    
    # Aggregate stats by player
    player_stats = {}
    
    for event in point_events:
        player_id = event["player_id"]
        if player_id not in player_stats:
            player_stats[player_id] = {"total_points": 0, "points_1pt": 0, "points_2pt": 0, "points_3pt": 0, "assists": 0, "matches": set()}
        
        if event["event_type"] == "points_1pt":
            player_stats[player_id]["points_1pt"] += 1
            player_stats[player_id]["total_points"] += 1
        elif event["event_type"] == "points_2pt":
            player_stats[player_id]["points_2pt"] += 1
            player_stats[player_id]["total_points"] += 2
        elif event["event_type"] == "points_3pt":
            player_stats[player_id]["points_3pt"] += 1
            player_stats[player_id]["total_points"] += 3
        
        player_stats[player_id]["matches"].add(event["match_id"])
    
    for event in assist_events:
        player_id = event["player_id"]
        if player_id not in player_stats:
            player_stats[player_id] = {"total_points": 0, "points_1pt": 0, "points_2pt": 0, "points_3pt": 0, "assists": 0, "matches": set()}
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
    ).to_list(50)
    
    team_map = {t["id"]: t for t in teams}
    
    # Build scorers list
    scorers = []
    for player_id, stats in player_stats.items():
        player = player_map.get(player_id)
        if not player:
            continue
        
        team = team_map.get(player.get("team_id"))
        total_points = stats["total_points"]
        matches_played = len(stats["matches"])
        
        scorers.append({
            "player_id": player_id,
            "player_name": player.get("full_name"),
            "player_photo": player.get("photo"),
            "player_number": player.get("number"),
            "team_id": player.get("team_id"),
            "team_name": team.get("name") if team else None,
            "team_logo": team.get("logo") if team else None,
            "total_points": total_points,
            "points_1pt": stats["points_1pt"],
            "points_2pt": stats["points_2pt"],
            "points_3pt": stats["points_3pt"],
            "assists": stats["assists"],
            "matches_played": matches_played,
            "ppg": round(total_points / matches_played, 1) if matches_played > 0 else 0
        })
    
    # Sort by total points
    scorers.sort(key=lambda x: (x["total_points"], x["assists"]), reverse=True)
    
    # Add position
    for i, scorer in enumerate(scorers):
        scorer["position"] = i + 1
    
    return scorers

@api_router.get("/tournaments/{tournament_id}/player-stats")
async def get_tournament_player_stats(tournament_id: str):
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
        
        # Get average rating for this player
        ratings = await db.player_ratings.find(
            {"player_id": player_id, "tournament_id": tournament_id},
            {"_id": 0}
        ).to_list(100)
        avg_rating = 0.0
        if ratings:
            total_rating = sum(r.get("rating", 0) for r in ratings)
            avg_rating = round(total_rating / len(ratings), 2)
        
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
            "appearances": len(stats["matches"]),
            "average_rating": avg_rating
        })
    
    result.sort(key=lambda x: (x["goals"], x["assists"]), reverse=True)
    
    return result

@api_router.get("/tournaments/{tournament_id}/basketball-stats")
async def get_tournament_basketball_stats(tournament_id: str):
    """Get detailed basketball player statistics for a tournament"""
    # Get all basketball events
    events = await db.match_events.find(
        {"tournament_id": tournament_id, "event_type": {"$in": ["points_1pt", "points_2pt", "points_3pt", "rebound", "basketball_assist", "foul", "steal", "block"]}},
        {"_id": 0}
    ).to_list(5000)
    
    # Aggregate stats
    player_stats = {}
    
    for event in events:
        player_id = event["player_id"]
        if player_id not in player_stats:
            player_stats[player_id] = {
                "points_1pt": 0,
                "points_2pt": 0,
                "points_3pt": 0,
                "total_points": 0,
                "rebounds": 0,
                "assists": 0,
                "fouls": 0,
                "steals": 0,
                "blocks": 0,
                "matches": set()
            }
        
        stats = player_stats[player_id]
        event_type = event["event_type"]
        stats["matches"].add(event["match_id"])
        
        if event_type == "points_1pt":
            stats["points_1pt"] += 1
            stats["total_points"] += 1
        elif event_type == "points_2pt":
            stats["points_2pt"] += 1
            stats["total_points"] += 2
        elif event_type == "points_3pt":
            stats["points_3pt"] += 1
            stats["total_points"] += 3
        elif event_type == "rebound":
            stats["rebounds"] += 1
        elif event_type == "basketball_assist":
            stats["assists"] += 1
        elif event_type == "foul":
            stats["fouls"] += 1
        elif event_type == "steal":
            stats["steals"] += 1
        elif event_type == "block":
            stats["blocks"] += 1
    
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
            "points_1pt": stats["points_1pt"],
            "points_2pt": stats["points_2pt"],
            "points_3pt": stats["points_3pt"],
            "total_points": stats["total_points"],
            "rebounds": stats["rebounds"],
            "assists": stats["assists"],
            "fouls": stats["fouls"],
            "steals": stats["steals"],
            "blocks": stats["blocks"],
            "appearances": len(stats["matches"]),
            # MVP calc: most points, tie-breaker: most assists
            "mvp_score": stats["total_points"] * 100 + stats["assists"]
        })
    
    # Sort by total points (for scoring leaders) then assists
    result.sort(key=lambda x: (x["total_points"], x["assists"]), reverse=True)
    
    return result

# ===================== TENNIS ENDPOINTS =====================

@api_router.get("/tournaments/{tournament_id}/tennis-standings")
async def get_tennis_standings(tournament_id: str):
    """Get tennis standings for a tournament (V, P, Set V, Set P, Pt)"""
    # Verify tournament exists and is tennis
    tournament = await db.tournaments.find_one(
        {"id": tournament_id},
        {"_id": 0}
    )
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    # Get all teams
    teams = await db.teams.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).to_list(100)
    
    team_map = {t["id"]: t for t in teams}
    
    # Get all completed matches
    matches = await db.matches.find(
        {"tournament_id": tournament_id, "status": "completed"},
        {"_id": 0}
    ).to_list(500)
    
    # Calculate standings
    standings = {}
    for team in teams:
        standings[team["id"]] = {
            "team_id": team["id"],
            "team_name": team["name"],
            "team_logo": team.get("logo"),
            "played": 0,
            "won": 0,
            "lost": 0,
            "sets_won": 0,
            "sets_lost": 0,
            "points": 0
        }
    
    for match in matches:
        home_id = match.get("home_team_id")
        away_id = match.get("away_team_id")
        
        if home_id not in standings or away_id not in standings:
            continue
        
        # Get set scores from match data
        tennis_sets = match.get("tennis_sets", [])
        home_sets_won = 0
        away_sets_won = 0
        
        for set_score in tennis_sets:
            if set_score.get("home", 0) > set_score.get("away", 0):
                home_sets_won += 1
            elif set_score.get("away", 0) > set_score.get("home", 0):
                away_sets_won += 1
        
        # Fallback to home_goals/away_goals if tennis_sets not available
        if home_sets_won == 0 and away_sets_won == 0:
            home_sets_won = match.get("home_goals", 0)
            away_sets_won = match.get("away_goals", 0)
        
        standings[home_id]["played"] += 1
        standings[away_id]["played"] += 1
        standings[home_id]["sets_won"] += home_sets_won
        standings[home_id]["sets_lost"] += away_sets_won
        standings[away_id]["sets_won"] += away_sets_won
        standings[away_id]["sets_lost"] += home_sets_won
        
        # Winner gets 2 points, loser gets 0
        if home_sets_won > away_sets_won:
            standings[home_id]["won"] += 1
            standings[home_id]["points"] += 2
            standings[away_id]["lost"] += 1
        elif away_sets_won > home_sets_won:
            standings[away_id]["won"] += 1
            standings[away_id]["points"] += 2
            standings[home_id]["lost"] += 1
    
    # Sort by points, then set difference
    result = list(standings.values())
    result.sort(key=lambda x: (
        x["points"],
        x["sets_won"] - x["sets_lost"],
        x["sets_won"]
    ), reverse=True)
    
    return result

@api_router.get("/tournaments/{tournament_id}/tennis-stats")
async def get_tennis_stats(tournament_id: str):
    """Get individual tennis stats for players in tournament"""
    # Verify tournament exists
    tournament = await db.tournaments.find_one(
        {"id": tournament_id},
        {"_id": 0}
    )
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo non trovato")
    
    # Get all matches with tennis stats
    matches = await db.matches.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).to_list(500)
    
    # Get all teams
    teams = await db.teams.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).to_list(100)
    
    team_map = {t["id"]: t for t in teams}
    
    # Aggregate stats per team (tennis is often 1v1 or 2v2)
    team_stats = {}
    
    for match in matches:
        home_id = match.get("home_team_id")
        away_id = match.get("away_team_id")
        
        home_stats = match.get("home_stats", {})
        away_stats = match.get("away_stats", {})
        
        # Initialize if not exists
        if home_id and home_id not in team_stats:
            team = team_map.get(home_id, {})
            team_stats[home_id] = {
                "team_id": home_id,
                "team_name": team.get("name", ""),
                "team_logo": team.get("logo"),
                "aces": 0,
                "double_faults": 0,
                "winners": 0,
                "unforced_errors": 0,
                "break_points_converted": 0,
                "break_points_saved": 0,
                "smash_winners": 0,
                "matches_played": 0,
                "mvp_score": 0
            }
        
        if away_id and away_id not in team_stats:
            team = team_map.get(away_id, {})
            team_stats[away_id] = {
                "team_id": away_id,
                "team_name": team.get("name", ""),
                "team_logo": team.get("logo"),
                "aces": 0,
                "double_faults": 0,
                "winners": 0,
                "unforced_errors": 0,
                "break_points_converted": 0,
                "break_points_saved": 0,
                "smash_winners": 0,
                "matches_played": 0,
                "mvp_score": 0
            }
        
        # Aggregate home stats
        if home_id and home_stats:
            team_stats[home_id]["aces"] += home_stats.get("aces", 0)
            team_stats[home_id]["double_faults"] += home_stats.get("doubleFaults", 0)
            team_stats[home_id]["winners"] += home_stats.get("winners", 0)
            team_stats[home_id]["unforced_errors"] += home_stats.get("unforcedErrors", 0)
            team_stats[home_id]["break_points_converted"] += home_stats.get("breakPointsConverted", 0)
            team_stats[home_id]["break_points_saved"] += home_stats.get("breakPointsSaved", 0)
            team_stats[home_id]["smash_winners"] += home_stats.get("smashWinners", 0)
            team_stats[home_id]["matches_played"] += 1
        
        # Aggregate away stats
        if away_id and away_stats:
            team_stats[away_id]["aces"] += away_stats.get("aces", 0)
            team_stats[away_id]["double_faults"] += away_stats.get("doubleFaults", 0)
            team_stats[away_id]["winners"] += away_stats.get("winners", 0)
            team_stats[away_id]["unforced_errors"] += away_stats.get("unforcedErrors", 0)
            team_stats[away_id]["break_points_converted"] += away_stats.get("breakPointsConverted", 0)
            team_stats[away_id]["break_points_saved"] += away_stats.get("breakPointsSaved", 0)
            team_stats[away_id]["smash_winners"] += away_stats.get("smashWinners", 0)
            team_stats[away_id]["matches_played"] += 1
    
    # Calculate MVP score: most winners, tiebreaker: most aces
    for team_id, stats in team_stats.items():
        stats["mvp_score"] = stats["winners"] * 100 + stats["aces"]
    
    # Sort by MVP score
    result = list(team_stats.values())
    result.sort(key=lambda x: x["mvp_score"], reverse=True)
    
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
    plan = body.get("plan")  # pro_monthly, pro_yearly
    origin_url = body.get("origin_url")
    
    if not plan or not origin_url:
        raise HTTPException(status_code=400, detail="Piano e origin_url richiesti")
    
    # Define fixed prices - Only PRO plan available
    PLANS = {
        "pro_monthly": 3.99,
        "pro_yearly": 39.99
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
            plan_type = "pro"  # Only PRO plan available
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
                plan_type = "pro"  # Only PRO plan available
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

# ===================== FAVORITES ENDPOINTS =====================

@api_router.post("/favorites")
async def add_favorite(favorite: FavoriteCreate, user: User = Depends(get_current_user)):
    """Add a tournament or team to user's favorites"""
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    # Check if already favorited
    existing = await db.user_favorites.find_one({
        "user_id": user.user_id,
        "type": favorite.type,
        "reference_id": favorite.reference_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Già nei preferiti")
    
    # Validate reference exists
    if favorite.type == "tournament":
        ref = await db.tournaments.find_one({"id": favorite.reference_id})
        if not ref:
            raise HTTPException(status_code=404, detail="Torneo non trovato")
    elif favorite.type == "team":
        ref = await db.teams.find_one({"id": favorite.reference_id})
        if not ref:
            raise HTTPException(status_code=404, detail="Squadra non trovata")
    else:
        raise HTTPException(status_code=400, detail="Tipo non valido")
    
    favorite_doc = {
        "id": f"fav_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "type": favorite.type,
        "reference_id": favorite.reference_id,
        "notifications_enabled": favorite.notifications_enabled,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_favorites.insert_one(favorite_doc)
    
    return {"id": favorite_doc["id"], "message": "Aggiunto ai preferiti"}

@api_router.get("/favorites")
async def get_favorites(user: User = Depends(get_current_user)):
    """Get all favorites for current user with details"""
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    favorites = await db.user_favorites.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with details
    result = []
    for fav in favorites:
        item = {**fav}
        if fav["type"] == "tournament":
            tournament = await db.tournaments.find_one(
                {"id": fav["reference_id"]},
                {"_id": 0, "id": 1, "name": 1, "category": 1, "location": 1, "status": 1, "slug": 1}
            )
            item["details"] = tournament
        elif fav["type"] == "team":
            team = await db.teams.find_one(
                {"id": fav["reference_id"]},
                {"_id": 0, "id": 1, "name": 1, "logo": 1, "tournament_id": 1}
            )
            if team:
                # Get tournament name for team
                tournament = await db.tournaments.find_one(
                    {"id": team.get("tournament_id")},
                    {"_id": 0, "name": 1, "slug": 1}
                )
                item["details"] = {**team, "tournament_name": tournament.get("name") if tournament else None}
            else:
                item["details"] = team
        result.append(item)
    
    return result

@api_router.get("/favorites/check/{type}/{reference_id}")
async def check_favorite(type: str, reference_id: str, user: User = Depends(get_optional_user)):
    """Check if an item is in user's favorites"""
    if not user:
        return {"is_favorite": False, "notifications_enabled": False}
    
    favorite = await db.user_favorites.find_one({
        "user_id": user.user_id,
        "type": type,
        "reference_id": reference_id
    })
    
    if favorite:
        return {"is_favorite": True, "notifications_enabled": favorite.get("notifications_enabled", True)}
    return {"is_favorite": False, "notifications_enabled": False}

@api_router.put("/favorites/{favorite_id}")
async def update_favorite(favorite_id: str, update: FavoriteUpdate, user: User = Depends(get_current_user)):
    """Update favorite notification settings"""
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    result = await db.user_favorites.update_one(
        {"id": favorite_id, "user_id": user.user_id},
        {"$set": {"notifications_enabled": update.notifications_enabled}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Preferito non trovato")
    
    return {"message": "Impostazioni aggiornate"}

@api_router.delete("/favorites/{type}/{reference_id}")
async def remove_favorite(type: str, reference_id: str, user: User = Depends(get_current_user)):
    """Remove an item from user's favorites"""
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    result = await db.user_favorites.delete_one({
        "user_id": user.user_id,
        "type": type,
        "reference_id": reference_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Preferito non trovato")
    
    return {"message": "Rimosso dai preferiti"}

# ===================== PUSH NOTIFICATIONS ENDPOINTS =====================

@api_router.post("/push-tokens")
async def register_push_token(token_data: PushTokenCreate, user: User = Depends(get_current_user)):
    """Register a push notification token for user"""
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    # Check if token already exists for this user
    existing = await db.push_tokens.find_one({
        "user_id": user.user_id,
        "token": token_data.token
    })
    
    if existing:
        return {"message": "Token già registrato"}
    
    # Remove old tokens for same device if any
    await db.push_tokens.delete_many({
        "user_id": user.user_id,
        "device_type": token_data.device_type
    })
    
    token_doc = {
        "id": f"token_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "token": token_data.token,
        "device_type": token_data.device_type,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.push_tokens.insert_one(token_doc)
    
    return {"message": "Token registrato"}

@api_router.delete("/push-tokens/{token}")
async def remove_push_token(token: str, user: User = Depends(get_current_user)):
    """Remove a push notification token"""
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    await db.push_tokens.delete_one({
        "user_id": user.user_id,
        "token": token
    })
    
    return {"message": "Token rimosso"}

@api_router.put("/users/notification-settings")
async def update_notification_settings(settings: NotificationSettingsUpdate, user: User = Depends(get_current_user)):
    """Update global notification settings"""
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"notifications_enabled": settings.notifications_enabled}}
    )
    
    return {"message": "Impostazioni aggiornate"}

@api_router.get("/users/notification-settings")
async def get_notification_settings(user: User = Depends(get_current_user)):
    """Get user's global notification settings"""
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "notifications_enabled": 1}
    )
    
    return {"notifications_enabled": user_doc.get("notifications_enabled", True) if user_doc else True}

# ===================== INTERNAL NOTIFICATION HELPERS =====================

async def send_push_notification(user_ids: List[str], title: str, body: str, data: dict = None):
    """Send push notifications to specified users via Expo Push API"""
    if not user_ids:
        return
    
    # Get all push tokens for users with notifications enabled
    users_with_notifications = await db.users.find(
        {"user_id": {"$in": user_ids}, "notifications_enabled": {"$ne": False}},
        {"_id": 0, "user_id": 1}
    ).to_list(1000)
    
    enabled_user_ids = [u["user_id"] for u in users_with_notifications]
    
    if not enabled_user_ids:
        return
    
    tokens = await db.push_tokens.find(
        {"user_id": {"$in": enabled_user_ids}},
        {"_id": 0, "token": 1}
    ).to_list(1000)
    
    if not tokens:
        return
    
    # Send via Expo Push API
    messages = []
    for t in tokens:
        message = {
            "to": t["token"],
            "sound": "default",
            "title": title,
            "body": body,
        }
        if data:
            message["data"] = data
        messages.append(message)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Content-Type": "application/json"}
            )
            logger.info(f"Push notification sent: {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")

async def notify_tournament_followers(tournament_id: str, title: str, body: str, data: dict = None):
    """Send notification to all users following a tournament"""
    favorites = await db.user_favorites.find(
        {"type": "tournament", "reference_id": tournament_id, "notifications_enabled": True},
        {"_id": 0, "user_id": 1}
    ).to_list(1000)
    
    user_ids = [f["user_id"] for f in favorites]
    await send_push_notification(user_ids, title, body, data)

async def notify_team_followers(team_id: str, title: str, body: str, data: dict = None):
    """Send notification to all users following a team"""
    favorites = await db.user_favorites.find(
        {"type": "team", "reference_id": team_id, "notifications_enabled": True},
        {"_id": 0, "user_id": 1}
    ).to_list(1000)
    
    user_ids = [f["user_id"] for f in favorites]
    await send_push_notification(user_ids, title, body, data)

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
