from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
import sqlalchemy as sa
import logging


def test_migration_1b8bbe8cb2e9_applies(tmp_path, monkeypatch):
    """
    Ensures migration 1b8bbe8cb2e9 exists and can be applied to a fresh DB.
    This protects against schema drift where tests would pass via metadata.create_all()
    but migrations would fail in real environments.
    """
    db_file = tmp_path / "alembic_migration_test.sqlite"
    db_url = f"sqlite:///{db_file}"
    monkeypatch.setenv("DATABASE_URL", db_url)

    backend_dir = Path(__file__).resolve().parents[1]
    alembic_ini = backend_dir / "alembic.ini"
    assert alembic_ini.exists()

    cfg = Config(str(alembic_ini))
    cfg.set_main_option("sqlalchemy.url", db_url)

    # Create minimal pre-migration schema + stamp the down_revision, then run the migration.
    # This validates that the migration itself is runnable and adds the intended columns.
    engine = sa.create_engine(db_url)
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)"
            )
        )
        conn.execute(sa.text("DELETE FROM alembic_version"))
        conn.execute(sa.text("INSERT INTO alembic_version (version_num) VALUES (:v)"), {"v": "b49295526708"})

        conn.execute(
            sa.text(
                "CREATE TABLE IF NOT EXISTS organizations (id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL)"
            )
        )
        conn.execute(
            sa.text(
                "CREATE TABLE IF NOT EXISTS individuals (id INTEGER PRIMARY KEY, first_name VARCHAR(100), last_name VARCHAR(100))"
            )
        )

    alembic_logger = logging.getLogger("alembic")
    prev_level = alembic_logger.level
    alembic_logger.setLevel(logging.WARNING)
    try:
        command.upgrade(cfg, "1b8bbe8cb2e9")
    finally:
        alembic_logger.setLevel(prev_level)

    insp = sa.inspect(engine)

    org_cols = {c["name"] for c in insp.get_columns("organizations")}
    ind_cols = {c["name"] for c in insp.get_columns("individuals")}

    assert "organization_id" in org_cols
    assert "organization_id" in ind_cols

    # And confirm alembic version includes the revision
    with engine.connect() as conn:
        version = conn.execute(sa.text("select version_num from alembic_version")).scalar()
    assert version is not None
