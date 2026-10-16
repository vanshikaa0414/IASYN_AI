import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Ensure database directory exists
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "iasyn_ai.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Video Storage Directory (private local storage outside public frontend assets)
VIDEO_STORAGE_DIR = BASE_DIR / "storage" / "videos"
os.makedirs(VIDEO_STORAGE_DIR, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def upgrade_database_schema(db_engine):
    """
    Safely inspects existing SQLite tables and executes idempotent ALTER TABLE
    statements for newly introduced columns without corrupting existing records.
    """
    with db_engine.connect() as conn:
        # Check webcam_assessments table
        res = conn.exec_driver_sql("PRAGMA table_info(webcam_assessments)")
        existing_cols = {row[1] for row in res.fetchall()}
        
        new_cols = [
            ("total_attempts", "INTEGER DEFAULT 0"),
            ("passed_attempts", "INTEGER DEFAULT 0"),
            ("failed_attempts", "INTEGER DEFAULT 0"),
            ("unassessable_attempts", "INTEGER DEFAULT 0"),
            ("movement_pass_rate", "REAL"),
            ("attempts_json", "TEXT DEFAULT '[]'"),
            ("configured_criteria_json", "TEXT DEFAULT '{}'"),
            ("has_video", "INTEGER DEFAULT 0"),
            ("video_storage_path", "VARCHAR(255)"),
            ("video_mime_type", "VARCHAR(50)"),
            ("video_file_size", "INTEGER"),
            ("video_duration", "REAL"),
            ("is_demo", "INTEGER DEFAULT 0"),
        ]
        
        for col_name, col_type in new_cols:
            if col_name not in existing_cols:
                try:
                    conn.exec_driver_sql(f"ALTER TABLE webcam_assessments ADD COLUMN {col_name} {col_type}")
                    print(f"[Schema Upgrade] Added column '{col_name}' to webcam_assessments.")
                except Exception as err:
                    print(f"[Schema Upgrade Notice] Column '{col_name}': {err}")
        conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
