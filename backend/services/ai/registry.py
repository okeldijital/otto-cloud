from typing import Dict, Callable, List
from sqlalchemy.orm import Session
from uuid import UUID
from schemas.ai import AIToolInfo, AIResultItem
from services.ai import tools


# Hard allowlist of tools - Phase 1 read-only only
TOOL_REGISTRY: Dict[str, Dict] = {
    "search_catalog": {
        "function": tools.search_catalog,
        "description": "Search artists, tracks, works, and releases in your catalog",
        "read_only": True,
        "requires_db": True
    },
    "search_network": {
        "function": tools.search_network,
        "description": "Search individuals and organizations in your network",
        "read_only": True,
        "requires_db": True
    },
    "help_tips": {
        "function": tools.get_help_tips,
        "description": "Get helpful tips on using the AI assistant",
        "read_only": True,
        "requires_db": False
    }
}


def get_available_tools() -> List[AIToolInfo]:
    """
    Return list of available tools.
    """
    return [
        AIToolInfo(
            name=name,
            description=info["description"],
            read_only=info["read_only"]
        )
        for name, info in TOOL_REGISTRY.items()
    ]


def execute_tool(
    tool_name: str,
    db: Session,
    org_id: UUID,
    query: str,
    limit: int = 10
) -> List[AIResultItem]:
    """
    Execute a tool by name with org scoping.
    All tools are read-only in Phase 1.
    """
    if tool_name not in TOOL_REGISTRY:
        raise ValueError(f"Tool '{tool_name}' not found in registry")
    
    tool_info = TOOL_REGISTRY[tool_name]
    tool_function = tool_info["function"]
    
    # Execute tool with appropriate parameters
    if tool_info["requires_db"]:
        return tool_function(db=db, org_id=org_id, query=query, limit=limit)
    else:
        return tool_function()


def is_tool_allowed(tool_name: str) -> bool:
    """
    Check if a tool is in the allowlist.
    """
    return tool_name in TOOL_REGISTRY
