# Organization Switching

```
POST /api/auth/organizations/switch { organizationId }
```

1. Membership exists and is active  
2. Clear previous default  
3. Set new default  
4. Resolve roles/permissions  
5. Re-issue access token with `org` claim  
6. Publish `identity.organization.switched`  

No re-authentication required.
