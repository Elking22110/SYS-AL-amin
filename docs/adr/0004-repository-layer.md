# ADR 0004: Roadmap for Dedicated Repository Layer & Atomic Transactions

## Status
Accepted (Phase 2 Roadmap)

## Context
Persistence mechanisms (LocalStorage, IndexedDB, Supabase PostgREST) are currently invoked in UI handlers and utility wrappers. To achieve true enterprise modularity, data access should be encapsulated behind repository interfaces with atomic transaction support.

## Decision
In Phase 2, implement `src/repositories/`:
- `invoiceRepository.js`
- `productRepository.js`
- `stockRepository.js`
- `auditRepository.js`

Multi-table operations (Invoice update + Stock adjustment + Return entry + Audit log) will be executed within atomic transaction blocks with rollback support.

## Consequences
- **Positive:** Complete decoupling of storage implementation details from application logic.
- **Positive:** Zero risk of partial state corruption during system crashes.
