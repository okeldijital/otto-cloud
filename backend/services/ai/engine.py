from abc import ABC, abstractmethod
from typing import Type, TypeVar
from pydantic import BaseModel
import logging

T = TypeVar("T", bound=BaseModel)

class AIError(Exception):
    """Base exception for AI engine errors"""
    pass

class AIEngine(ABC):
    """Abstract base class for AI engines"""
    
    @abstractmethod
    def complete_json(
        self, 
        *, 
        schema: Type[T], 
        system: str, 
        user: str
    ) -> T:
        """
        Request a structured JSON completion from the AI engine.
        Required: Validated against the provided Pydantic schema.
        """
        pass

class NullEngine(AIEngine):
    """Default engine when no provider is configured"""
    
    def complete_json(
        self, 
        *, 
        schema: Type[T], 
        system: str, 
        user: str
    ) -> T:
        logging.error("AI provider not configured. Attempted complete_json.")
        raise AIError("AI provider not configured. Please check your environment settings.")

def get_ai_engine() -> AIEngine:
    """
    Factory to get the configured AI engine.
    In Phase 2, this defaults to NullEngine unless specifically implemented.
    """
    # Placeholder for future provider selection logic (OpenAI, Anthropic, etc.)
    return NullEngine()
