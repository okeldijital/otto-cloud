from sqlalchemy import Column, String, Integer, Numeric
from sqlalchemy.sql import func
from database import Base


class Plan(Base):
    """Pricing plan model"""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)  # free, pro, enterprise
    job_limit = Column(Integer, nullable=False, default=100)
    price = Column(Numeric(10, 2), nullable=True)

    def __repr__(self):
        return f"<Plan {self.name}>"