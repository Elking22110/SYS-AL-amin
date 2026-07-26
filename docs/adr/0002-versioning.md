# ADR 0002: Optimistic Concurrency Control via Invoice Versioning

## Status
Accepted

## Context
In a multi-client POS environment, two cashier devices may attempt to view or edit the same invoice concurrently. Relying solely on `updated_at` timestamps resulted in race conditions where stale clients uploaded outdated invoice states over newer remote edits.

## Decision
Every invoice record contains an integer `version` field (starting at 1). Every edit increments `version` (`version++`). `version` is the **ONLY Concurrency Authority**.

When saving an edit:
If `clientInvoice.version === storedInvoice.version`:
  Apply edit and set `newVersion = version + 1`.
Else:
  Reject edit with `CONFLICT_STALE_VERSION` error and prompt user to refresh.

## Consequences
- **Positive:** Guaranteed protection against stale client overwrites.
- **Negative:** Users must reload latest invoice if a concurrent edit occurred.
