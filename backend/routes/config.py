"""Hub/Spoke configuration management."""
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class ConfigRequest(BaseModel):
    """Hub/Spoke configuration request."""
    nodeRole: str  # "hub" or "spoke"
    node_name: str
    hub_url: Optional[str] = None


class ConfigResponse(BaseModel):
    """Hub/Spoke configuration response."""
    nodeRole: str
    node_name: str
    hub_url: Optional[str] = None
    nodeId: Optional[str] = None
    createdAt: Optional[str] = None


def get_config_path() -> Path:
    """Get config.json path."""
    app_data_dir = Path(settings.DATABASE_URL.replace('sqlite:///', '')).parent.parent
    return app_data_dir / "config.json"


def read_config() -> Dict[str, Any]:
    """Read current configuration."""
    config_path = get_config_path()
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading config: {e}")
            return get_default_config()
    return get_default_config()


def get_default_config() -> Dict[str, Any]:
    """Get default configuration."""
    return {
        "nodeRole": "hub",
        "node_name": "OTTO Node",
        "hub_url": None,
        "version": "1.0.1"
    }


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Get current configuration (Read-Only)."""
    try:
        # We still read config for the frontend 'Settings' display if needed,
        # but the Source of Truth for logic is Env Vars.
        config = read_config()
        return ConfigResponse(
            nodeRole=config.get("nodeRole", "hub"),
            node_name=config.get("node_name", "OTTO Node"),
            hub_url=config.get("hub_url"),
            nodeId=config.get("nodeId"),
            createdAt=config.get("createdAt")
        )
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/node/info")
async def get_node_info():
    """Get node role and ID (Strictly from Environment)."""
    try:
        import os
        env_role = os.getenv("OTTO_NODE_ROLE")
        env_id = os.getenv("OTTO_NODE_ID")
        
        # If running in Dev without Electron, we might fall back to config for convenience,
        # OR strictly return what the process sees.
        # User requested: "Backend knows OTTO_NODE_ROLE... via Env".
        
        # We return the Env values. If missing, we might return defaults or 'unknown'.
        # For 'Settings.jsx', it expects a role. 
        
        config = read_config() # Optional fallback for display only?
        
        return {
            "nodeRole": env_role or config.get("nodeRole", "hub"),
            "nodeId": env_id or config.get("nodeId", "unknown"),
            "nodeName": config.get("node_name", "OTTO Node"),
            "env_injected": bool(env_role)
        }
    except Exception as e:
        logger.error(f"Error getting node info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/is-first-run")
async def is_first_run():
    """Check if this is the first run."""
    try:
        config_path = get_config_path()
        return {"is_first_run": not config_path.exists()}
    except Exception as e:
        logger.error(f"Error checking first run: {e}")
        raise HTTPException(status_code=500, detail=str(e))
