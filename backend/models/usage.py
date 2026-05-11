from sqlalchemy import Column, String, Integer, Index, BigInteger
from sqlalchemy.sql import func
from database import Base, SafeUuid


class Usage(Base):
    """Organization usage tracking"""
    __tablename__ = "usage"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    metric = Column(String(50), nullable=False)  # jobs, api_calls, tokens, etc.
    value = Column(Integer, nullable=False, default=0)
    tokens_used = Column(BigInteger, nullable=False, default=0)
    period = Column(String(10), nullable=False)  # YYYY-MM format

    __table_args__ = (
        Index("ix_usage_org_metric_period", "organization_id", "metric", "period"),
    )

    def __repr__(self):
        return f"<Usage org={self.organization_id} metric={self.metric} period={self.period}>"