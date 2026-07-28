# sessions/ — A.3 Session Management

| Module | Role |
|--------|------|
| `SessionService.ts` | Lifecycle: create / refresh / revoke / logout-all |
| `SessionPolicyService` (policies/) | Central timeouts & limits |
| `SessionAuditService.ts` | Audit + activity |
| `SessionCleanupService.ts` | Expire / archive / purge |
| `DeviceService.ts` | UA parse + device registry |
| `TrustedDeviceService.ts` | Trust foundation (A.4) |

Model: **Session owns tokens** — never create orphan refresh tokens.
