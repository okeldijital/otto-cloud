"""
Database models for OTTO platform
"""
from models.user import User
from models.pro import PRO
from models.label import Label
from models.publisher import Publisher
from models.artist import Artist
from models.release import Release
from models.track import Track
from models.work import Work
from models.royalty import Royalty
from models.document import Document
from models.note import Note
from models.event import Event
from models.playlist import Playlist
from models.audit_log import AuditLog
from models.activity import Activity
from models.network import Organization, Individual, Platform, NetworkRelationship
from models.task import Task
from models.office_note import OfficeNote, OfficeNoteLink
from models.office_document import OfficeDocument, OfficeDocumentLink
from models.reporting import ReportDefinition, ReportRun, ReportArtifact
from models.governance import StatusQuoItem
from models.ai import AISession, AIMessage, AIAuditLog, AIContractResolutionRun, AIContractResolutionLink
from models.contract_intake_links import ContractIntakeReleaseLink

# Aliases for backward compatibility
Company = Organization
Contact = Individual

from models.contract import Contract, ContractParty, ContractAsset, ContractDocument, ContractSplitGroup, ContractSplit
from models.works_admin import WorksAdmin, WorksAdminDocument

__all__ = [
    "User",
    "PRO",
    "Label",
    "Publisher",
    "Artist",
    "Release",
    "Track",
    "Work",
    "Royalty",
    "Document",
    "Note",
    "Event",
    "Playlist",
    "AuditLog",
    "Activity",
    "Organization",
    "Individual",
    "Platform",
    "NetworkRelationship",
    "Company",
    "Contact",
    "Task",
    "OfficeNote",
    "OfficeNoteLink",
    "OfficeDocument",
    "OfficeDocumentLink",
    "ReportDefinition",
    "ReportRun",
    "ReportArtifact",
    "StatusQuoItem",
    "AISession",
    "AIMessage",
    "AIAuditLog",
    "AIContractResolutionRun",
    "AIContractResolutionLink",
    "ContractIntakeReleaseLink",
    "Contract",
    "ContractParty",
    "ContractAsset",
    "ContractDocument",
    "ContractSplitGroup",
    "ContractSplit",
    "WorksAdmin",
    "WorksAdminDocument",
]
