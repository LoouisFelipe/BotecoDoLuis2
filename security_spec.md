# Security Specification - Boteco do Luis

## 1. Data Invariants
- A `game_session` must have a valid `modalityId` and `amount`.
- A `transaction` must reference a valid `type` (income/expense).
- User roles can only be updated by the owner or an admin.
- Only the owner (`louisfelipecabral@gmail.com`) has full root access.

## 2. The "Dirty Dozen" Payloads (Security Test Cases)

1. **Identity Spoofing**: Attempt to create a game session with a different `userId`.
2. **Privilege Escalation**: A staff user trying to update their own role to 'admin' in `/users/{uid}`.
3. **Ghost Field Injection**: Adding an `isVerified: true` field to a `product` by a non-admin.
4. **State Shortcutting**: Skipping the status flow in `orders`.
5. **ID Poisoning**: Using a 2KB string as a `sessionId`.
6. **Negative Amount**: Creating a transaction with a negative amount to manipulate totals (unless logical).
7. **Orphaned Record**: Creating a game session for a non-existent modality.
8. **Unauthorized Deletion**: A staff user trying to delete a closed transaction.
9. **Timestamp Manipulation**: Providing a custom `date` from the client that is not `request.time`.
10. **PII Blanket Read**: Trying to list all users as a regular staff member.
11. **Shadow Category**: Creating a product with a category that doesn't exist.
12. **Recursive Cost Attack**: Performing a query that triggers excessive `get()` calls in rules.

## 3. Test Runner (Mock Tests)
- `test('game_sessions_list_denied_for_unauthenticated')`: Expect fail.
- `test('game_sessions_write_denied_for_staff_on_admin_fields')`: Expect fail.
- `test('owner_bypass')`: Expect success for all operations by owner.
