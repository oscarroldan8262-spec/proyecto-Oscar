# Security Specification — Bitácora Digital de Cambio de Turno

## 1. Data Invariants
1. Every top-level shift log (`bitacoras/{bitacoraId}`) must carry a verified `ownerId` matching `request.auth.uid` on creation and server-validated `createdAt` / `updatedAt` timestamps (`request.time`).
2. Every subcollection document (`eventos`, `incidencias`, `produccion`, `maquinas`, `firmas`) cannot exist without an existing parent `bitacora` owned by the authenticated user (`get(/databases/$(database)/documents/bitacoras/$(bitacoraId)).data.ownerId == request.auth.uid`).
3. User PII (`email`) is strictly isolated in `/users/{userId}/private/{docId}` and never readable by other non-admin users.
4. Once a shift log reaches terminal status `'cerrada'`, non-admin users cannot mutate its content.
5. Every document ID and foreign key reference must pass `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars), and every string field has an explicit `.size()` bound.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Read/Write**: Anonymous client attempting `get` or `create` on `/bitacoras/bit-1`. Expected: `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Signed-in token with `email_verified: false` claiming admin email. Expected: `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: User A sets `ownerId: "user-b"` when creating `/bitacoras/bit-1`. Expected: `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Payload includes extra undeclared key `isAdminApproved: true` or `bypassAudit: true`. Expected: `PERMISSION_DENIED`.
5. **Privilege Escalation on User Profile**: User attempts to set `role: "admin"` in `/users/{uid}`. Expected: `PERMISSION_DENIED`.
6. **Cross-Tenant Subcollection Orphan Write**: User A creates `/bitacoras/bit-of-user-b/eventos/ev-1`. Expected: `PERMISSION_DENIED`.
7. **PII Blanket Read**: User A reads `/users/user-b/private/info`. Expected: `PERMISSION_DENIED`.
8. **Blanket List Scraping**: User queries `/bitacoras` without filtering to `ownerId == request.auth.uid`. Expected: `PERMISSION_DENIED`.
9. **ID Poisoning**: Document ID contains 2KB junk characters or `/` / spaces (`"bad id !!"`). Expected: `PERMISSION_DENIED`.
10. **Client Timestamp Forgery**: Payload passes backdated `createdAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: Update sets `cumplimiento: "100%"` (string instead of number) or oversized 20KB description. Expected: `PERMISSION_DENIED`.
12. **Terminal State Mutation**: Non-admin attempts to edit a `bitacora` whose `estado` is `'cerrada'`. Expected: `PERMISSION_DENIED`.

## 3. Verification
All 12 payloads are covered in `firestore.rules.test.ts` and validated against `DRAFT_firestore.rules` via `@firebase/eslint-plugin-security-rules`.
