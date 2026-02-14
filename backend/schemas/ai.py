from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Literal


class AIChatRequest(BaseModel):
    """Request schema for AI chat"""
    session_id: Optional[int] = None
    message: str = Field(..., min_length=1, max_length=2000)


class AIMessageSchema(BaseModel):
    """Schema for AI message"""
    role: Literal["user", "assistant"]
    content: str
    created_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class AIResultItem(BaseModel):
    """Schema for search result item"""
    type: str  # 'artist', 'track', 'work', 'entity', etc.
    id: int
    label: str
    metadata: Optional[dict] = None


class AIChatResponse(BaseModel):
    """Response schema for AI chat"""
    session_id: int
    messages: List[AIMessageSchema]
    results: List[AIResultItem] = []


class AIToolInfo(BaseModel):
    """Schema for tool information"""
    name: str
    description: str
    read_only: bool = True


class AIToolsResponse(BaseModel):
    """Response schema for tools list"""
    tools: List[AIToolInfo]


class AIHealthResponse(BaseModel):
    """Response schema for health check"""
    status: str
    enabled: bool
    version: str = "1.0.0"


class AISessionSchema(BaseModel):
    """Schema for AI session"""
    id: int
    organization_id: str
    user_id: int
    created_at: datetime
    
    model_config = {"from_attributes": True}
