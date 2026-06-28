from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from app.core.config import settings
from app.core.database import Base, sync_engine
from app.models.auth import User
from app.models.trading import Signal, Analysis, Strategy, Trade, PerformanceMetrics

def init_db() -> None:
    # We will attempt to connect to the postgres database to create the target database if not exists
    # Create tables
    Base.metadata.create_all(bind=sync_engine)
    print("Database tables initialized successfully.")
