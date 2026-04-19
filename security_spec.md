# Security Specification - Bar do Luis (Nexus/Boteco 360)

## Data Invariants
1. **User Role Integrity:** Only the hardcoded owner or verified admins can promote staff or change roles.
2. **Financial Traceability:** Every `income` transaction must reference be associated with a valid event (order, game session, or debt payment).
3. **Identity Verification:** All write operations must verify that the `authorId` or similar field matches the authenticated UID.
4. **Terminal State Locking:** Closed orders cannot be modified.
5. **Inventory Consistency:** Product stock updates should ideally be atomic, though current client-side logic updates them after purchase. Rules should at least prevent arbitrary stock changes by non-admins.
6. **PII Protection:** Customer data (phone, address) restricted to staff and admins.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing:** Create a game session using another user's `userId`.
2. **Role Escalation:** A staff user trying to update their own `role` to `admin` in `/users/{userId}`.
3. **Unauthorized Query:** A guest (unauthenticated) trying to list `game_sessions`.
4. **Inventory Tampering:** Staff user trying to change a product's price.
5. **Shadow Field Injection:** Adding `isVerified: true` to a customer document to bypass logic.
6. **Orphaned Transaction:** Creating a transaction without a `type` or with invalid `amount`.
7. **Deletion of Closed Records:** Staff trying to delete a `closed_order`.
8. **Negative Purchase:** Registering a purchase with a negative price/quantity.
9. **Fake Debt Payment:** Customer trying to reduce their own debt balance.
10. **ID Poisoning:** Creating a product with a 1MB string as the ID.
11. **System Field Overwrite:** Modifying `updatedAt` to a past date instead of `serverTimestamp`.
12. **Anonymous Access:** Any read request without a valid session.

## Test Strategy (Phase 0)
We will verify that these payloads return `PERMISSION_DENIED` using the security rules.
