# MFA Policies

## Platform (`getPlatformConfig().security.mfa`)

| Key | Default |
|-----|---------|
| recoveryCodeCount | 10 |
| trustedDeviceDays | 30 |
| challengeTtlSeconds | 300 |
| challengeMaxAttempts | 5 |
| totpIssuer | OTTO |
| requiredForAdmins | false |

## Organization (`iam_organizations.mfaPolicy`)

| Mode | Behavior |
|------|----------|
| disabled | Only if user enrolled (optional) |
| optional | Challenge if enrolled |
| required_admins | Always for org_admin roles |
| required_owners | Always for owners |
| required_all | Always for all members |
