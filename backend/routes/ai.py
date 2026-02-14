from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User
from models.ai import AISession, AIMessage
from schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AIMessageSchema,
    AIToolsResponse,
    AIHealthResponse,
    AIResultItem
)
from services.ai.registry import get_available_tools, execute_tool
from services.ai.audit import log_ai_request
from dependencies import get_current_user
from config import settings

router = APIRouter()


def ensure_ai_enabled():
    """Dependency to check if AI is enabled"""
    if not settings.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled"
        )


@router.get("/health", response_model=AIHealthResponse)
async def ai_health():
    """
    Health check endpoint for AI module.
    Returns enabled status without requiring authentication.
    """
    return AIHealthResponse(
        status="ok",
        enabled=settings.AI_ENABLED,
        version="1.0.0"
    )


@router.get("/tools", response_model=AIToolsResponse, dependencies=[Depends(ensure_ai_enabled)])
async def list_tools(
    current_user: User = Depends(get_current_user)
):
    """
    List available AI tools.
    All tools are read-only in Phase 1.
    """
    tools = get_available_tools()
    return AIToolsResponse(tools=tools)


@router.post("/chat", response_model=AIChatResponse, dependencies=[Depends(ensure_ai_enabled)])
async def chat(
    request: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    AI chat endpoint.
    Phase 1: Read-only responses using internal tools only.
    No external LLM calls.
    """
    # Audit logging
    log_ai_request(
        db=db,
        org_id=current_user.organization_id,
        user_id=current_user.id,
        action="chat",
        message=request.message,
        tool=None
    )
    
    # Get or create session
    if request.session_id:
        session = db.query(AISession).filter(
            AISession.id == request.session_id,
            AISession.organization_id == current_user.organization_id
        ).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
    else:
        session = AISession(
            organization_id=current_user.organization_id,
            user_id=current_user.id
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    
    # Store user message
    user_message = AIMessage(
        session_id=session.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    db.commit()
    
    # Determine intent and execute
    message_lower = request.message.lower().strip()
    results: List[AIResultItem] = []
    response_content = ""
    tool_used = None
    
    # Check for search intent
    if message_lower.startswith("find:") or "find" in message_lower or "search" in message_lower:
        # Extract query
        query = message_lower.replace("find:", "").replace("find", "").replace("search", "").strip()
        
        # Try catalog search first
        try:
            catalog_results = execute_tool(
                tool_name="search_catalog",
                db=db,
                org_id=current_user.organization_id,
                query=query,
                limit=10
            )
            results.extend(catalog_results)
            tool_used = "search_catalog"
        except Exception as e:
            print(f"Catalog search error: {e}")
        
        # Also try network search
        try:
            network_results = execute_tool(
                tool_name="search_network",
                db=db,
                org_id=current_user.organization_id,
                query=query,
                limit=10
            )
            results.extend(network_results)
            if not tool_used:
                tool_used = "search_network"
        except Exception as e:
            print(f"Network search error: {e}")
        
        if results:
            response_content = f"Found {len(results)} results for '{query}'. Click on any result to view details."
        else:
            response_content = f"No results found for '{query}'. Try a different search term."
    
    else:
        # Return help guidance
        help_tips = execute_tool(
            tool_name="help_tips",
            db=db,
            org_id=current_user.organization_id,
            query="",
            limit=10
        )
        results = help_tips
        tool_used = "help_tips"
        response_content = """I can help you search your catalog and network. Here are some things you can try:

• Use "find:" to search for artists, tracks, works, or releases
• Search your network for individuals and organizations
• Ask me what I can help with

Example: "find: midnight groove" """
    
    # Log tool usage
    if tool_used:
        log_ai_request(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            action="tool_execution",
            message=request.message,
            tool=tool_used
        )
    
    # Store assistant response
    assistant_message = AIMessage(
        session_id=session.id,
        role="assistant",
        content=response_content
    )
    db.add(assistant_message)
    db.commit()
    
    # Get recent messages (last 10)
    recent_messages = db.query(AIMessage).filter(
        AIMessage.session_id == session.id
    ).order_by(AIMessage.created_at.desc()).limit(10).all()
    
    recent_messages.reverse()  # Chronological order
    
    return AIChatResponse(
        session_id=session.id,
        messages=[AIMessageSchema.from_orm(msg) for msg in recent_messages],
        results=results
    )
