export const NOTIFICATION_STATUS = {
  unread: "unread",
  read: "read",
  archived: "archived",
  dismissed: "dismissed",
} as const;

export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export const NOTIFICATION_TYPES = {
  contractExpiring: "contracts.lifecycle.expiring",
  renewalDue: "contracts.lifecycle.renewal_due",
  verificationCompleted: "contracts.verification.completed",
  verificationReopened: "contracts.verification.reopened",
  relationshipAdded: "contracts.relationship.created",
  relationshipRejected: "contracts.relationship.rejected",
  contractAmended: "contracts.lifecycle.amended",
  contractSuperseded: "contracts.lifecycle.superseded",
  contractActivated: "contracts.lifecycle.activated",
  contractExpired: "contracts.lifecycle.expired",
  contractRenewed: "contracts.lifecycle.renewed",
  verifiedCreated: "contracts.verified.created",
  reminderFired: "reminders.fired",
} as const;

/** Data-driven notification definitions (title templates). */
export const NOTIFICATION_DEFINITIONS: Record<
  string,
  { title: string; body?: string; defaultEnabled: boolean }
> = {
  [NOTIFICATION_TYPES.contractExpiring]: {
    title: "Contract expiring soon",
    body: "A contract is approaching its expiration date.",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.renewalDue]: {
    title: "Renewal due",
    body: "A contract requires renewal attention.",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.verificationCompleted]: {
    title: "Verification completed",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.verificationReopened]: {
    title: "Verification reopened",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.relationshipAdded]: {
    title: "Relationship added",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.relationshipRejected]: {
    title: "Relationship rejected",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.contractAmended]: {
    title: "Contract amended",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.contractSuperseded]: {
    title: "Contract superseded",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.contractActivated]: {
    title: "Contract activated",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.contractExpired]: {
    title: "Contract expired",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.contractRenewed]: {
    title: "Contract renewed",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.verifiedCreated]: {
    title: "Verified contract created",
    defaultEnabled: true,
  },
  [NOTIFICATION_TYPES.reminderFired]: {
    title: "Reminder",
    defaultEnabled: true,
  },
};

export const EVENT_TO_NOTIFICATION_TYPE: Record<string, string> = {
  "contracts.lifecycle.activated": NOTIFICATION_TYPES.contractActivated,
  "contracts.lifecycle.expired": NOTIFICATION_TYPES.contractExpired,
  "contracts.lifecycle.renewal_due": NOTIFICATION_TYPES.renewalDue,
  "contracts.lifecycle.renewed": NOTIFICATION_TYPES.contractRenewed,
  "contracts.lifecycle.superseded": NOTIFICATION_TYPES.contractSuperseded,
  "contracts.lifecycle.amended": NOTIFICATION_TYPES.contractAmended,
  "contracts.verification.completed": NOTIFICATION_TYPES.verificationCompleted,
  "contracts.verification.reopened": NOTIFICATION_TYPES.verificationReopened,
  "contracts.relationship.created": NOTIFICATION_TYPES.relationshipAdded,
  "contracts.relationship.rejected": NOTIFICATION_TYPES.relationshipRejected,
  "contracts.verified.created": NOTIFICATION_TYPES.verifiedCreated,
  "reminders.fired": NOTIFICATION_TYPES.reminderFired,
};

export class NotificationError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "NOTIFICATION_ERROR") {
    super(message);
    this.name = "NotificationError";
    this.status = status;
    this.code = code;
  }
}
