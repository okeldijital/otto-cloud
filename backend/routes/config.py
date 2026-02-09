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
    mode: str  # "hub" or "spoke"
    node_name: str
    hub_url: Optional[str] = None


class ConfigResponse(BaseModel):
    """Hub/Spoke configuration response."""
    mode: str
    node_name: str
    hub_url: Optional[str] = None


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
        "mode": "hub",
        "node_name": "OTTO Node",
        "hub_url": None,
        "version": "1.0.1"
    }


def write_config(config: Dict[str, Any]) -> None:
    """Write configuration to file."""
    config_path = get_config_path()
    config_path.parent.mkdir(exist_ok=True, parents=True)
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    logger.info(f"Configuration saved to {config_path}")


@router.get("/api/config", response_model=ConfigResponse)
async def get_config():
    """Get current configuration."""
    try:
        config = read_config()
        return ConfigResponse(
            mode=config.get("mode", "hub"),
            node_name=config.get("node_name", "OTTO Node"),
            hub_url=config.get("hub_url")
        )
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/config", response_model=ConfigResponse)
async def set_config(request: ConfigRequest):
    """Update configuration."""
    try:
        # Validate mode
        if request.mode not in ["hub", "spoke"]:
            raise ValueError("Mode must be 'hub' or 'spoke'")
        
        # If spoke mode, require hub_url
        if request.mode == "spoke" and not request.hub_url:
            raise ValueError("Hub URL is required for spoke mode")
        
        # Read current config and update
        config = read_config()
        config["mode"] = request.mode
        config["node_name"] = request.node_name
        config["hub_url"] = request.hub_url
        
        # Write back
        write_config(config)
        
        logger.info(f"Configuration updated: mode={request.mode}, node={request.node_name}")
        
        return ConfigResponse(
            mode=request.mode,
            node_name=request.node_name,
            hub_url=request.hub_url
        )
    except Exception as e:
        logger.error(f"Error setting config: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/config/is-first-run")
async def is_first_run():
    """Check if this is the first run."""
    try:
        config_path = get_config_path()
        return {"is_first_run": not config_path.exists()}
    except Exception as e:
        logger.error(f"Error checking first run: {e}")
        raise HTTPException(status_code=500, detail=str(e))
