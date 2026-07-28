# Release Workspace

Product documentation for OTTO Release Workspace.

## Documents

| Document | Purpose |
|----------|---------|
| [adr-018-release-contract-integration.md](./adr-018-release-contract-integration.md) | Contract integration ownership |
| [milestone-5.0-complete.md](./milestone-5.0-complete.md) | Contract integration completion |
| [release-contract-integration.md](../../architecture/release-contract-integration.md) | Technical integration |
| [release-read-model.md](../../architecture/release-read-model.md) | Projection model |

## Ownership

- **Release Workspace** owns releases, workspace UX, and contract **projections**.
- **Contract Center** owns contracts, verification, and legal domain data.
- Links flow through the **Relationship Layer**.
- Synchronization uses the **Platform Event Bus**.
