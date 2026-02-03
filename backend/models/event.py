from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Event(Base):
    """Calendar Event model"""
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)

    event_type = Column(String(100), index=True, default="Other")
    status = Column(String(50), index=True, default="Planned")
    
    # DateTime
    start_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    end_datetime = Column(DateTime(timezone=True))
    all_day = Column(Boolean, default=False)
    
    # Categorization
    category = Column(String(100), index=True)  # release, contract, meeting, deadline, etc.
    color = Column(String(20))  # For color-coding in calendar
    location = Column(String(255))
    
    # Recurrence (using iCalendar RRULE format)
    recurrence_rule = Column(String(500))  # e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR"
    recurrence_end_date = Column(DateTime(timezone=True))
    
    # Reminders
    reminder_minutes = Column(Integer)  # Minutes before event to send reminder
    
    # Relations to other entities (optional)
    related_entity_type = Column(String(50))  # release, contract, artist, etc.
    related_entity_id = Column(Integer)
    
    # User tracking
    created_by = Column(Integer, ForeignKey("users.id"))

    is_deleted = Column(Boolean, nullable=False, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")
    
    def __repr__(self):
        return f"<Event {self.title} @ {self.start_datetime}>"
