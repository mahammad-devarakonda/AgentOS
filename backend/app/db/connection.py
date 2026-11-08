import os
import sqlite3
from pathlib import Path
from typing import Any, Callable
from app.core.config import settings


def get_db_path() -> Path:
    """Resolves the database file path based on settings and backend directory."""
    raw_path = settings.DATABASE_PATH
    p = Path(raw_path)
    if not p.is_absolute():
        # Place it relative to backend root directory
        backend_dir = Path(__file__).resolve().parent.parent.parent
        p = backend_dir / p
    return p


def get_db_connection() -> sqlite3.Connection:
    """Returns a configured SQLite connection with row factory and WAL mode enabled."""
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(
        str(db_path),
        check_same_thread=False,
        timeout=15.0,
    )
    conn.row_factory = sqlite3.Row

    # Performance and integrity pragmas
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


def init_db() -> None:
    """Creates the conversations and messages tables and indexes if they do not exist."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    agent_type TEXT NOT NULL DEFAULT 'general',
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    sender_name TEXT,
                    content TEXT NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );
                """
            )

            # Indexes for fast querying and sorting
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
                ON messages(conversation_id);
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_created_at 
                ON messages(created_at);
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
                ON conversations(updated_at DESC);
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_conversations_agent_type 
                ON conversations(agent_type);
                """
            )
    finally:
        conn.close()
