/**
 * Platform Event Registry — registered event definitions + payload contracts.
 * Every published event must appear here (M4.2 + M4.2A).
 */

import type { EventDefinition } from "../types";
import { contract, f, nullable, required, withOrgContract } from "../contracts/helpers";

const V = "1.0.0";

export const PLATFORM_EVENT_DEFINITIONS: EventDefinition[] = [
  // ── Documents ──────────────────────────────────────────────────────────
  {
    name: "contracts.document.uploaded",
    version: V,
    producer: "contract-center",
    description: "A document was uploaded and linked to a contract",
    contract: contract(
      V,
      withOrgContract({
        documentId: required(f.string({ description: "Document asset UUID" })),
        fileName: f.string({ description: "Original file name" }),
        relationshipId: f.string(),
      }),
      { description: "Document linked to contract" }
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.document.deleted",
    version: V,
    producer: "contract-center",
    description: "A contract document was soft-deleted",
    contract: contract(
      V,
      withOrgContract({
        documentId: required(f.string()),
        relationshipId: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "365d",
  },

  // ── Intelligence / verification ────────────────────────────────────────
  {
    name: "contracts.verification.completed",
    version: V,
    producer: "contract-center",
    description: "Human verification session completed",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      contractId: nullable(f.number({ description: "May be null pre-link" })),
      documentId: required(f.string()),
      sessionId: f.string(),
      extractionId: f.string(),
    }),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.verification.reopened",
    version: V,
    producer: "contract-center",
    description: "Verification session reopened",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      contractId: nullable(f.number()),
      documentId: required(f.string()),
      sessionId: f.string(),
      extractionId: f.string(),
    }),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "365d",
  },
  {
    name: "contracts.extraction.completed",
    version: V,
    producer: "contract-center",
    description: "Document extraction job completed",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      contractId: nullable(f.number()),
      documentId: required(f.string()),
      extractionId: f.string(),
      jobId: f.string(),
    }),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "90d",
  },

  // ── Verified domain ────────────────────────────────────────────────────
  {
    name: "contracts.verified.created",
    version: V,
    producer: "contract-center",
    description: "Verified contract domain record created",
    contract: contract(
      V,
      withOrgContract({
        verifiedContractId: required(f.uuid()),
        version: f.integer({ description: "Verified domain version number" }),
        title: f.string(),
        partyCount: f.integer(),
        verificationSessionId: f.string(),
        documentId: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.verified.updated",
    version: V,
    producer: "contract-center",
    description: "Verified contract domain updated",
    contract: contract(
      V,
      withOrgContract({
        verifiedContractId: required(f.uuid()),
        version: f.integer(),
        title: f.string(),
        partyCount: f.integer(),
        verificationSessionId: f.string(),
        documentId: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.verified.reverified",
    version: V,
    producer: "contract-center",
    description: "Contract re-verified from new session",
    contract: contract(
      V,
      withOrgContract({
        verifiedContractId: required(f.uuid()),
        version: f.integer(),
        title: f.string(),
        partyCount: f.integer(),
        verificationSessionId: f.string(),
        documentId: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },

  // ── Relationships ──────────────────────────────────────────────────────
  {
    name: "contracts.relationship.created",
    version: V,
    producer: "contract-center",
    description: "Contract relationship confirmed",
    contract: contract(
      V,
      withOrgContract({
        relationshipId: required(f.string()),
        relationshipType: f.string(),
        targetEntityType: f.string(),
        targetEntityId: f.string(),
        source: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.relationship.removed",
    version: V,
    producer: "contract-center",
    description: "Contract relationship removed",
    contract: contract(
      V,
      withOrgContract({
        relationshipId: required(f.string()),
        targetEntityType: f.string(),
        targetEntityId: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "365d",
  },
  {
    name: "contracts.relationship.suggested",
    version: V,
    producer: "contract-center",
    description: "Relationship suggestion created",
    contract: contract(
      V,
      withOrgContract({
        suggestionId: required(f.string()),
        targetEntityType: f.string(),
        targetEntityId: f.string(),
        confidence: f.number(),
        matchStrategy: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "90d",
  },
  {
    name: "contracts.relationship.rejected",
    version: V,
    producer: "contract-center",
    description: "Relationship suggestion rejected",
    contract: contract(
      V,
      withOrgContract({
        suggestionId: required(f.string()),
        targetEntityType: f.string(),
        targetEntityId: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "90d",
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────
  {
    name: "contracts.lifecycle.status_changed",
    version: V,
    producer: "contract-center",
    description: "Contract lifecycle status changed",
    contract: contract(
      V,
      withOrgContract({
        from: required(f.string({ description: "Previous status" })),
        to: required(f.string({ description: "New status" })),
        legacyEventType: f.string(),
      })
    ),
    consumers: ["notifications", "reminders"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.lifecycle.activated",
    version: V,
    producer: "contract-center",
    description: "Contract became active",
    contract: contract(
      V,
      withOrgContract({
        activatedAt: f.datetime({
          description: "When the contract became active (ISO-8601)",
        }),
        verifiedVersion: f.integer({
          description: "Verified domain version if known",
        }),
        legacyEventType: f.string(),
      }),
      { description: "Operational activation of a verified contract" }
    ),
    consumers: ["notifications", "reminders"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.lifecycle.expired",
    version: V,
    producer: "contract-center",
    description: "Contract expired",
    contract: contract(
      V,
      withOrgContract({
        expiredAt: f.datetime(),
        legacyEventType: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.lifecycle.renewal_due",
    version: V,
    producer: "contract-center",
    description: "Contract renewal is due",
    contract: contract(
      V,
      withOrgContract({
        dueAt: f.datetime(),
        legacyEventType: f.string(),
      })
    ),
    consumers: ["notifications", "reminders"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.lifecycle.renewed",
    version: V,
    producer: "contract-center",
    description: "Contract manually marked renewed",
    contract: contract(
      V,
      withOrgContract({
        renewedAt: f.datetime(),
        legacyEventType: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.lifecycle.superseded",
    version: V,
    producer: "contract-center",
    description: "Contract superseded by another",
    contract: contract(
      V,
      withOrgContract({
        supersedesContractId: f.number(),
        supersededByContractId: f.number(),
        reason: f.string(),
        direction: f.string(),
        legacyEventType: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "contracts.lifecycle.amended",
    version: V,
    producer: "contract-center",
    description: "Amendment registered on contract",
    contract: contract(
      V,
      withOrgContract({
        amendmentId: required(f.string()),
        amendmentNumber: f.string(),
        legacyEventType: f.string(),
      })
    ),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },

  // ── Platform self-events ───────────────────────────────────────────────
  {
    name: "platform.events.replayed",
    version: V,
    producer: "platform",
    description: "An event or DLQ entry was replayed",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      originalEventId: required(f.string()),
      replayEventId: f.string(),
    }),
    consumers: [],
    idempotencyStrategy: "none",
    retentionPolicy: "90d",
  },
  {
    name: "notifications.created",
    version: V,
    producer: "notifications",
    description: "In-app notification created",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      notificationId: required(f.string()),
      userId: required(f.integer()),
      type: required(f.string()),
    }),
    consumers: [],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "90d",
  },
  {
    name: "reminders.created",
    version: V,
    producer: "notifications",
    description: "Reminder scheduled",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      reminderId: required(f.string()),
      type: required(f.string()),
      dueAt: required(f.datetime()),
    }),
    consumers: [],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "90d",
  },
  {
    name: "reminders.fired",
    version: V,
    producer: "notifications",
    description: "Reminder fired (in-app only)",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      reminderId: required(f.string()),
    }),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "90d",
  },

  // ── Release Workspace (consumer-owned events) ──────────────────────────
  {
    name: "release.contract.summary.updated",
    version: V,
    producer: "release-workspace",
    description: "Release contract projection summary was updated",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      releaseId: required(f.number()),
      contractCount: f.integer(),
      healthStatus: f.string(),
    }),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "90d",
  },
  {
    name: "release.health.changed",
    version: V,
    producer: "release-workspace",
    description: "Aggregate release contract health changed",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      releaseId: required(f.number()),
      from: f.string(),
      to: required(f.string()),
      reasons: f.array(),
    }),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "90d",
  },

  // ── Rights Domain (Milestone 6.0) ──────────────────────────────────────
  {
    name: "rights.candidate.created",
    version: V,
    producer: "rights",
    description: "Rights candidate created from verified contract",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      candidateId: required(f.string()),
      contractId: required(f.number()),
      category: f.string(),
      promotionRunId: f.string(),
      rightId: f.string(),
    }),
    consumers: ["notifications"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "365d",
  },
  {
    name: "rights.review.completed",
    version: V,
    producer: "rights",
    description: "Rights candidate review completed",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      candidateId: required(f.string()),
      decision: required(f.string()),
      contractId: f.number(),
      rightId: f.string(),
    }),
    consumers: ["notifications", "royalties"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "rights.created",
    version: V,
    producer: "rights",
    description: "Right registered in Rights Registry",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
      category: f.string(),
      contractId: f.number(),
      status: f.string(),
    }),
    consumers: ["notifications", "royalties", "reporting"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "rights.updated",
    version: V,
    producer: "rights",
    description: "Right updated",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
      from: f.string(),
      to: f.string(),
    }),
    consumers: ["notifications", "royalties"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "365d",
  },
  {
    name: "rights.activated",
    version: V,
    producer: "rights",
    description: "Right became active",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
    }),
    consumers: ["notifications", "royalties", "reporting"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "rights.expired",
    version: V,
    producer: "rights",
    description: "Right expired",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
    }),
    consumers: ["notifications", "royalties"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "rights.assigned",
    version: V,
    producer: "rights",
    description: "Right assigned",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
    }),
    consumers: ["notifications", "royalties"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "rights.transferred",
    version: V,
    producer: "rights",
    description: "Right ownership transferred",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
    }),
    consumers: ["notifications", "royalties"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "rights.restricted",
    version: V,
    producer: "rights",
    description: "Right restrictions updated",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
      count: f.integer(),
    }),
    consumers: ["notifications", "royalties"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "365d",
  },
  {
    name: "rights.superseded",
    version: V,
    producer: "rights",
    description: "Right superseded",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
    }),
    consumers: ["notifications", "royalties"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
  {
    name: "rights.terminated",
    version: V,
    producer: "rights",
    description: "Right terminated",
    contract: contract(V, {
      organizationId: required(f.uuid()),
      rightId: f.string(),
    }),
    consumers: ["notifications", "royalties"],
    idempotencyStrategy: "event_subscriber",
    retentionPolicy: "indefinite",
  },
];

/** Map legacy PascalCase / module-local event types → platform names */
export const LEGACY_EVENT_MAP: Record<string, string> = {
  ContractActivated: "contracts.lifecycle.activated",
  ContractExpired: "contracts.lifecycle.expired",
  ContractRenewalDue: "contracts.lifecycle.renewal_due",
  ContractRenewed: "contracts.lifecycle.renewed",
  ContractSuperseded: "contracts.lifecycle.superseded",
  ContractAmended: "contracts.lifecycle.amended",
  LifecycleStatusChanged: "contracts.lifecycle.status_changed",
  RelationshipSuggested: "contracts.relationship.suggested",
  RelationshipCreated: "contracts.relationship.created",
  RelationshipUpdated: "contracts.relationship.created",
  RelationshipRemoved: "contracts.relationship.removed",
  RelationshipRejected: "contracts.relationship.rejected",
  VerifiedContractCreated: "contracts.verified.created",
  VerifiedContractUpdated: "contracts.verified.updated",
  VerifiedContractReverified: "contracts.verified.reverified",
  DocumentUploaded: "contracts.document.uploaded",
  DocumentDeleted: "contracts.document.deleted",
  "extraction.completed": "contracts.extraction.completed",
  "verification.completed": "contracts.verification.completed",
  "verification.reopened": "contracts.verification.reopened",
};
