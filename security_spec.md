# Daybook Mercantile Ledger — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Owner Isolation (PII Protection)**: Every document in `/users/{userId}` and its subcollections (`parties`, `transactions`, `cashDrawer`) contains private financial and contact PII (`email`, `phone`, `address`, `gstin`, ledger amounts). Only the authenticated, email-verified user whose `request.auth.uid == userId` may read or write their own documents.
2. **Master Gate**: Subcollection documents (`parties`, `transactions`, `cashDrawer`) cannot be created or modified unless the parent `/users/{userId}` ShopProfile document exists.
3. **Immutable Ownership & Timestamps**: `uid` (on `ShopProfile`), `ownerId` (on subcollections), and `createdAt` (on all documents) are strictly immutable after creation. All `createdAt` and `updatedAt` timestamps must match `request.time`.
4. **Strict Keys & Volumetric Bounds**: All documents enforce `keys().hasAll(...) && keys().hasOnly(...)` on create and `diff(existing()).affectedKeys().hasOnly(...)` on update. Every string has an explicit `.size()` bound and every numeric amount is bounded.
5. **Path Variable Hardening**: Single-document operations validate document IDs with `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
6. **Secure List Queries**: Listing `/users` is strictly forbidden. Listing subcollections requires `isVerifiedOwner(userId) && resource.data.ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Attack Payloads (Must All Return `PERMISSION_DENIED`)
1. **Unauthenticated Profile Read**: `GET /users/userA` with `auth = null`.
2. **Cross-User PII Read**: `GET /users/userA` while authenticated as `userB`.
3. **Users Collection Enumeration**: `LIST /users` while authenticated as `userA`.
4. **Unverified Email Write**: `CREATE /users/userA` where `auth.token.email_verified == false`.
5. **Shadow / Ghost Field Injection (Profile)**: `CREATE /users/userA` including extra field `"isAdmin": true`.
6. **Identity Spoofing on Transaction**: `CREATE /users/userA/transactions/tx1` with `"ownerId": "userB"`.
7. **Orphaned Subcollection Write (Master Gate Bypass)**: `CREATE /users/userA/parties/p1` when `/users/userA` does not exist yet.
8. **Immutable Timestamp Tampering**: `UPDATE /users/userA/transactions/tx1` modifying `"createdAt"` to a backdated timestamp.
9. **Client-Spoofed Server Timestamp**: `CREATE /users/userA/transactions/tx1` with client-supplied `createdAt != request.time`.
10. **Negative or Zero Transaction Amount**: `CREATE /users/userA/transactions/tx1` with `"amount": -500` or `"amount": 0`.
11. **Oversized String / Resource Exhaustion**: `CREATE /users/userA/transactions/tx1` with `"note"` > 280 chars or `"partyName"` > 120 chars.
12. **Invalid Document ID Poisoning**: `CREATE /users/userA/parties/bad$id!with*symbols` failing `isValidId()`.
