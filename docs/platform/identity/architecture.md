# IAM Architecture (v1.0)

```
Business Module
      │
      ▼
Platform SDK (@/lib/platform/sdk)
      │
      ▼
Public IAM Services
      │
      ▼
Internal implementation
      │
      ▼
Repositories → PostgreSQL (iam_*)
```

## Layers

1. **SDK** — only public import path for features  
2. **Services** — domain logic  
3. **Repositories** — persistence (internal)  
4. **Contracts/DTOs** — typed boundaries  

## Request path

```
Request → cookies/Bearer
       → CurrentIdentityService
       → PermissionResolver (cached)
       → AuthorizationService / middleware
       → Handler
```
