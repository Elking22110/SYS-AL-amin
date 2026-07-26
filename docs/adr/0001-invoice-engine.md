# ADR 0001: Modular Invoice Engine Architecture & Pure Business Logic Facade

## Status
Accepted

## Context
The POS application previously suffered from fragmented invoice calculations scattered across React UI components, printing templates, and reports. This resulted in duplicate total calculations, inconsistent stock movements, and race conditions during invoice editing.

## Decision
Modularize the Invoice Engine into pure domain modules under `src/utils/invoice/`:
- `calculations.js`: Financial calculations using integer cents via `safeMath.js`.
- `discountEngine.js`: Pure discount & markup logic (-100% to +100%).
- `validation.js`: Business rule validators.
- `stockEngine.js`: Pure stock delta computation.
- `editEngine.js`: Item diffing and version incrementing.
- `printSnapshot.js`: Unified print snapshot generator.
- `index.js`: Unified facade API.

## Consequences
- **Positive:** Single Source of Truth for all financial and invoice calculations across UI, Reports, Printing, and Sync.
- **Positive:** Domain functions are 100% pure, simplifying automated unit testing.
- **Negative:** Requires strict adherence to layer rules; direct calculations inside UI or printing components are forbidden.
