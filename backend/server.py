from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import string
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

TRAINER_CODE = os.environ.get('TRAINER_CODE', 'TRAINER')

app = FastAPI()
api_router = APIRouter(prefix="/api")


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def generate_client_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(6))


# ============ MODELS ============

class LoginRequest(BaseModel):
    role: Literal['trainer', 'client']
    code: str


class LoginResponse(BaseModel):
    role: str
    user_id: Optional[str] = None
    name: Optional[str] = None


class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str = Field(default_factory=generate_client_code)
    created_at: str = Field(default_factory=utcnow_iso)


class ClientCreate(BaseModel):
    name: str


class Exercise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    muscle_group: Optional[str] = ""
    instructions: Optional[str] = ""
    media_base64: Optional[str] = ""  # data URI string or base64
    media_type: Optional[Literal['image', 'video', '']] = ""
    created_at: str = Field(default_factory=utcnow_iso)


class ExerciseCreate(BaseModel):
    name: str
    muscle_group: Optional[str] = ""
    instructions: Optional[str] = ""
    media_base64: Optional[str] = ""
    media_type: Optional[Literal['image', 'video', '']] = ""


class ExerciseItem(BaseModel):
    exercise_id: str
    target_sets: int = 3
    target_reps: int = 10
    target_weight: float = 0
    notes: Optional[str] = ""


class Day(BaseModel):
    day_number: int
    name: str = ""
    notes: str = ""
    items: List[ExerciseItem] = []


class Week(BaseModel):
    week_number: int
    name: str = ""
    notes: str = ""
    days: List[Day] = []


class Program(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str = "Program"
    weeks: List[Week] = []
    updated_at: str = Field(default_factory=utcnow_iso)

class SavedProgramme(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Weekly Programme"
    weeks: List[Week] = []
    created_at: str = Field(default_factory=utcnow_iso)

class ProgramUpsert(BaseModel):
    client_id: str
    name: Optional[str] = "Program"
    weeks: List[Week] = []


class SetEntry(BaseModel):
    set_number: int
    weight: float = 0
    reps: int = 0


class WorkoutLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    exercise_id: str
    week_number: int
    day_number: int
    sets: List[SetEntry] = []
    notes: Optional[str] = ""
    completed_at: str = Field(default_factory=utcnow_iso)


class WorkoutLogCreate(BaseModel):
    client_id: str
    exercise_id: str
    week_number: int
    day_number: int
    sets: List[SetEntry] = []
    notes: Optional[str] = ""


# ============ AUTH ============

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    code = payload.code.strip().upper()
    if payload.role == 'trainer':
        if code != TRAINER_CODE.upper():
            raise HTTPException(status_code=401, detail="Invalid trainer code")
        return LoginResponse(role='trainer', user_id='trainer', name='Trainer')
    # client
    doc = await db.clients.find_one({"code": code}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="Invalid client code")
    return LoginResponse(role='client', user_id=doc['id'], name=doc['name'])


# ============ CLIENTS ============

@api_router.get("/clients", response_model=List[Client])
async def list_clients():
    docs = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Client(**d) for d in docs]


@api_router.post("/clients", response_model=Client)
async def create_client(payload: ClientCreate):
    obj = Client(name=payload.name.strip())
    # ensure unique code
    for _ in range(5):
        existing = await db.clients.find_one({"code": obj.code})
        if not existing:
            break
        obj.code = generate_client_code()
    await db.clients.insert_one(obj.model_dump())
    return obj


@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found")
    return Client(**doc)


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    await db.clients.delete_one({"id": client_id})
    await db.programs.delete_many({"client_id": client_id})
    await db.workout_logs.delete_many({"client_id": client_id})
    return {"ok": True}


# ============ EXERCISES ============

@api_router.get("/exercises", response_model=List[Exercise])
async def list_exercises():
    docs = await db.exercises.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Exercise(**d) for d in docs]


@api_router.post("/exercises", response_model=Exercise)
async def create_exercise(payload: ExerciseCreate):
    obj = Exercise(**payload.model_dump())
    await db.exercises.insert_one(obj.model_dump())
    return obj


@api_router.get("/exercises/{exercise_id}", response_model=Exercise)
async def get_exercise(exercise_id: str):
    doc = await db.exercises.find_one({"id": exercise_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return Exercise(**doc)


@api_router.put("/exercises/{exercise_id}", response_model=Exercise)
async def update_exercise(exercise_id: str, payload: ExerciseCreate):
    update = payload.model_dump()
    res = await db.exercises.find_one_and_update(
        {"id": exercise_id},
        {"$set": update},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return Exercise(**res)


@api_router.delete("/exercises/{exercise_id}")
async def delete_exercise(exercise_id: str):
    await db.exercises.delete_one({"id": exercise_id})
    return {"ok": True}


# ============ PROGRAMS ============

@api_router.get("/programs/{client_id}", response_model=Program)
async def get_program(client_id: str):
    doc = await db.programs.find_one({"client_id": client_id}, {"_id": 0})
    if not doc:
        # return empty program structure
        return Program(client_id=client_id, weeks=[])
    return Program(**doc)


@api_router.post("/programs", response_model=Program)
async def upsert_program(payload: ProgramUpsert):
    existing = await db.programs.find_one({"client_id": payload.client_id}, {"_id": 0})
    if existing:
        update = {
            "name": payload.name or "Program",
            "weeks": [w.model_dump() for w in payload.weeks],
            "updated_at": utcnow_iso(),
        }
        await db.programs.update_one({"client_id": payload.client_id}, {"$set": update})
        existing.update(update)
        return Program(**existing)
    obj = Program(
        client_id=payload.client_id,
        name=payload.name or "Program",
        weeks=payload.weeks,
    )
    await db.programs.insert_one(obj.model_dump())
    return obj

@api_router.post("/saved-programmes", response_model=SavedProgramme)
async def create_saved_programme(payload: SavedProgramme):
    obj = SavedProgramme(
        name=payload.name,
        weeks=payload.weeks,
    )
    await db.saved_programmes.insert_one(obj.model_dump())
    return obj

@api_router.get("/saved-programmes", response_model=List[SavedProgramme])
async def list_saved_programmes():
    docs = await db.saved_programmes.find({}, {"_id": 0}).to_list(500)
    return [SavedProgramme(**d) for d in docs]

# ============ WORKOUT LOGS ============

@api_router.post("/logs", response_model=WorkoutLog)
async def create_log(payload: WorkoutLogCreate):
    existing = await db.workout_logs.find_one(
        {
            "client_id": payload.client_id,
            "exercise_id": payload.exercise_id,
            "week_number": payload.week_number,
            "day_number": payload.day_number,
        },
        {"_id": 0},
    )

    if existing:
        await db.workout_logs.update_one(
            {"id": existing["id"]},
            {
                "$set": {
                    "sets": [s.model_dump() for s in payload.sets],
                    "notes": payload.notes,
                    "completed_at": utcnow_iso(),
                }
            },
        )
        existing["sets"] = [s.model_dump() for s in payload.sets]
        existing["notes"] = payload.notes
        existing["completed_at"] = utcnow_iso()
        return WorkoutLog(**existing)

    obj = WorkoutLog(**payload.model_dump())
    await db.workout_logs.insert_one(obj.model_dump())
    return obj


@api_router.get("/logs/{client_id}", response_model=List[WorkoutLog])
async def get_logs(client_id: str, exercise_id: Optional[str] = None, week_number: Optional[int] = None):
    q: dict = {"client_id": client_id}
    if exercise_id:
        q["exercise_id"] = exercise_id
    if week_number is not None:
        q["week_number"] = week_number
    docs = await db.workout_logs.find(q, {"_id": 0}).sort("completed_at", -1).to_list(2000)
    return [WorkoutLog(**d) for d in docs]

@api_router.delete("/saved-programmes/{programme_id}")
async def delete_saved_programme(programme_id: str):
    result = await db.saved_programmes.delete_one({"id": programme_id})
    return {"ok": result.deleted_count > 0}


# ============ MESSAGES ============


@api_router.get("/")
async def root():
    return {"message": "EKPT Workout Tracker API", "trainer_code_hint": "use configured TRAINER_CODE"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
