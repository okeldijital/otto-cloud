# Contract Amendment Error Handling

## Purpose

Contract amendment registration must distinguish validation/conflict failures from unexpected server failures. Users must never receive a generic error when the amendment number already exists.

## Required behaviour

- Amendment numbers are unique per contract.
- A duplicate amendment number is a conflict, not a generic server error.
- The API should return HTTP `409 Conflict` for an existing amendment number.
- The response should identify the conflicting amendment number and provide a user-actionable message.
- The Contract Detail UI should surface the API message inline near the registration form.
- The UI should not clear valid form fields when a conflict occurs.
- A successful registration should refresh the amendment list and show the newly registered amendment.

## Validation

Client-side validation may warn before submission when an existing amendment number is already known, but the server remains authoritative because concurrent requests can race.

## User-facing message

Preferred duplicate message:

> Amendment A-001 already exists for this contract. Use a different amendment number.

The exact number should be interpolated from the API conflict response.

## Verification gate

A production test must cover:

1. Register a new amendment number.
2. Confirm it appears in the Amendments list.
3. Submit the same amendment number again.
4. Confirm HTTP 409 handling.
5. Confirm the actionable conflict message is visible in the UI.
6. Confirm no duplicate record is created.
