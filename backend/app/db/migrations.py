"""Idempotent additive migration for existing SQLite workspaces; no reseeding."""
from sqlalchemy import inspect, text
from app.db.models import Base

def migrate_database(engine):
    Base.metadata.create_all(engine)
    additions = {
        "customers": {"product_id": "VARCHAR REFERENCES products(id)"},
        "tickets": {"product_id": "VARCHAR REFERENCES products(id)"},
        "offers": {
            "product_id": "VARCHAR REFERENCES products(id)",
            "pricing_rationale": "TEXT",
            "ltv_factor": "FLOAT",
            "calculated_discount": "INTEGER",
        },
    }
    with engine.begin() as conn:
        for table, columns in additions.items():
            existing = {column["name"] for column in inspect(conn).get_columns(table)}
            for name, sql_type in columns.items():
                if name not in existing:
                    conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {sql_type}'))
            conn.execute(text(f'CREATE INDEX IF NOT EXISTS "ix_{table}_product_id" ON "{table}" (product_id)'))
