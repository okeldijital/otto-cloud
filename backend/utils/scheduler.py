import json
import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from utils.backup import create_backup
from datetime import datetime

CONFIG_FILE = "scheduler_config.json"
scheduler = BackgroundScheduler()

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {"frequency": "weekly"}

def save_config(frequency):
    with open(CONFIG_FILE, 'w') as f:
        json.dump({"frequency": frequency}, f)

def scheduled_backup_job():
    """Wrapper to run backup and print status"""
    print(f"[{datetime.now()}] Running scheduled auto-backup...")
    try:
        filename = create_backup()
        print(f"[{datetime.now()}] Auto-backup successful: {filename}")
    except Exception as e:
        print(f"[{datetime.now()}] Auto-backup failed: {e}")

def update_schedule(frequency):
    """Update the backup schedule"""
    scheduler.remove_all_jobs()
    
    trigger = None
    if frequency == 'daily':
        # Run daily at midnight
        trigger = CronTrigger(hour=0, minute=0)
    elif frequency == 'weekly':
        # Run weekly on Sunday at midnight
        trigger = CronTrigger(day_of_week='sun', hour=0, minute=0)
    elif frequency == 'monthly':
        # Run monthly on the 1st at midnight
        trigger = CronTrigger(day=1, hour=0, minute=0)
    
    if trigger:
        scheduler.add_job(
            scheduled_backup_job,
            trigger=trigger,
            id='auto_backup',
            replace_existing=True
        )
        save_config(frequency)
        return True
    return False

def start_scheduler():
    """Start the scheduler with loaded config"""
    config = load_config()
    frequency = config.get("frequency", "weekly")
    update_schedule(frequency)
    scheduler.start()
    return frequency

def get_current_frequency():
    return load_config().get("frequency", "weekly")
