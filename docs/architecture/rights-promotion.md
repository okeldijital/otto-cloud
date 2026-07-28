# Rights Promotion

Promotion builds **candidates** only — never auto-publishes to the registry.

```
Verified Contract (current)
      ↓
RightPromotionRun
      ↓
RightCandidate[] (status=pending)
      ↓
Human Review (approve | reject)
      ↓
Right (registry) + rights.created
```

Sources used (in order):

1. `VerifiedRight` rows  
2. `rightsSummary` text  
3. Shell candidate if empty (still reviewable)

**Never** reads extraction jobs or draft verification fields.
