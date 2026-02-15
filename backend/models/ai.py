from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class AISession(Base):
    """AI chat session model"""
    __tablename__ = "ai_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    messages = relationship("AIMessage", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<AISession {self.id}>"


class AIMessage(Base):
    """AI chat message model - stores minimal message history"""
    __tablename__ = "ai_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("ai_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("AISession", back_populates="messages")
    
    def __repr__(self):
        return f"<AIMessage {self.id} role={self.role}>"


class AIAuditLog(Base):
    """AI audit log - tracks all AI requests for compliance"""
    __tablename__ = "ai_audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    action = Column(String(50), nullable=False)  # 'chat', 'search', etc.
    tool = Column(String(50), nullable=True)  # tool name if applicable
    request_hash = Column(String(64), nullable=False)  # sha256 hash
    parser_version = Column(String(20), nullable=True) # version of logic used
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<AIAuditLog {self.id} action={self.action}>"


class AIContractResolutionRun(Base):
    """Stores a single execution of the resolution/linking flow"""
    __tablename__ = "ai_contract_resolution_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contract_hash = Column(String(64), nullable=False, index=True)
    extractor_version = Column(String(50), nullable=True)
    linker_version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    links = relationship("AIContractResolutionLink", back_populates="run", cascade="all, delete-orphan")


class AIContractResolutionLink(Base):
    """Stores individual link/ignore decisions within a resolution run"""
    __tablename__ = "ai_contract_resolution_links"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("ai_contract_resolution_runs.id"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # 'artist', 'individual', 'organization', etc.
    entity_id = Column(Integer, nullable=True)  # Can be NULL if action is 'ignore' with no entity
    action = Column(String(20), nullable=False)  # 'link' or 'ignore'
    confidence = Column(Integer, nullable=True) # 0-100 score if applicable
    rationale = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    run = relationship("AIContractResolutionRun", back_populates="links")
