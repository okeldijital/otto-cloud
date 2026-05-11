from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from models.job import Job


class JobRepository:
    def __init__(self):
        self.model = Job

    def create_job(self, db: Session, input: Dict[str, Any], organization_id: UUID, user_id: int) -> Job:
        job = Job(
            organization_id=organization_id,
            user_id=user_id,
            status="pending",
            input=input,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def get_job(self, db: Session, id: UUID, organization_id: UUID) -> Optional[Job]:
        return db.query(Job).filter(
            Job.id == id,
            Job.organization_id == organization_id
        ).first()

    def update_job_status(self, db: Session, id: UUID, status: str, organization_id: UUID) -> Optional[Job]:
        job = self.get_job(db, id, organization_id)
        if job:
            job.status = status
            db.commit()
            db.refresh(job)
        return job

    def complete_job(self, db: Session, id: UUID, output: Dict[str, Any], organization_id: UUID) -> Optional[Job]:
        job = self.get_job(db, id, organization_id)
        if job:
            job.status = "completed"
            job.output = output
            db.commit()
            db.refresh(job)
        return job

    def fail_job(self, db: Session, id: UUID, error: str, organization_id: UUID) -> Optional[Job]:
        job = self.get_job(db, id, organization_id)
        if job:
            job.status = "failed"
            job.error = error
            db.commit()
            db.refresh(job)
        return job