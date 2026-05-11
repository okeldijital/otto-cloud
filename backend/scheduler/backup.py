import os
import schedule
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_daily_backup():
    """Trigger daily backup."""
    import requests

    try:
        from database import get_db
        from services.admin_backup.service import create_manual_backup

        db = next(get_db())
        from uuid import UUID

        result = create_manual_backup(db, UUID("00000000-0000-0000-0000-000000000001"), user_id=1)
        logger.info(f"Daily backup created: {result}")
    except Exception as e:
        logger.error(f"Daily backup failed: {e}")


def main():
    logger.info("Starting backup scheduler")

    schedule.every().day.at("02:00").do(run_daily_backup)

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()