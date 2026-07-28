# Organization Membership (A.5)

## Lifecycle

Invitation → Accepted → Membership active → Role assigned → Suspend / Reactivate / Remove

## Services

| Service | Role |
|---------|------|
| OrganizationService | CRUD, archive |
| MembershipService | Create, suspend, reactivate, remove, transfer ownership |
| InvitationService | Invite, cancel, accept, decline |
| OrganizationSwitchService | Active org switch |
| OrganizationPolicyService | Limits, domains, lock |

## Status values

`active` | `invited` | `suspended` | `removed`
