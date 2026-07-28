# Session Policies

Source: `getPlatformConfig().security.session`

| Key | Default | Env |
|-----|---------|-----|
| maxAgeHours | 12 | `SECURITY_SESSION_MAX_AGE_HOURS` |
| idleTimeoutHours | 4 | `SECURITY_SESSION_IDLE_TIMEOUT_HOURS` |
| rememberMeDays | 30 | `SECURITY_SESSION_REMEMBER_ME_DAYS` |
| refreshTokenDays | 30 | `SECURITY_REFRESH_TOKEN_DAYS` |
| accessTokenMinutes | 15 | `SECURITY_ACCESS_TOKEN_MINUTES` |
| maxConcurrentSessions | 20 | `SECURITY_SESSION_MAX_CONCURRENT` |
| logoutAllKeepCurrent | true | `SECURITY_LOGOUT_ALL_KEEP_CURRENT` |
| exposeIpToUser | true | `SECURITY_SESSION_EXPOSE_IP` |
| trustedDeviceDays | 30 | `SECURITY_TRUSTED_DEVICE_DAYS` |
| archiveAfterDays | 90 | `SECURITY_SESSION_ARCHIVE_DAYS` |
| cleanupBatchSize | 200 | `SECURITY_SESSION_CLEANUP_BATCH` |
