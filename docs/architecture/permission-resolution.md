# Permission Resolution

```
Identity + Organization
  → active Membership
  → Role (+ permissions join)
  → Owner grants (if isOwner)
  → Effective permission set
```

Multiple roles can be modeled later via join tables; today one primary `roleId` per membership.
