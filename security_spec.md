# TWE Asset Workspace — Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Identity Isolation (PII Protection)**: A `/users/{userId}` document contains PII (`email`). Only the authenticated owner (`request.auth.uid == userId`) or a verified administrator may read it. Collection listing (`list`) on `/users` is strictly denied (`if false`). Users can never set or modify RBAC privileges (`role`, `isAdmin`) on their own profile.
2. **Admin Registry Integrity**: `/admins/{adminId}` is read-only for the authenticated owner or an admin and strictly denies all client writes (`create`, `update`, `delete`). Bootstrapped admin checks require BOTH `request.auth.token.email == 'maurodar08@gmail.com'` AND `request.auth.token.email_verified == true`.
3. **Verified Identity & Strict Schema**: Every write across `/users`, `/assets`, `/orders`, `/vaultRecords`, and `/nftEditions` requires a signed-in user with `request.auth.token.email_verified == true`, path variable validation via `isValidId(...)`, and a standalone `isValid[Entity](incoming())` helper enforcing `hasAll` + `hasOnly` keys, exact types, bounded string lengths, and numeric bounds.
4. **Temporal & Ownership Immutability**: `ownerId` (or `uid`) and `createdAt` are immutable after creation. `createdAt == request.time` is mandated on create; `updatedAt == request.time` is mandated on both create and update.
5. **Global Consistency Invariant**: Every `/orders/{orderId}` document MUST reference an existing parent asset at `/assets/$(incoming().assetId)` whose `ownerId == request.auth.uid`.
6. **Terminal State Locking**:
   - `/assets/{assetId}`: Once `existing().status == 'Archived'`, non-admin updates are strictly rejected.
   - `/orders/{orderId}`: Once `existing().status` is `'FILLED'` or `'CANCELLED'`, non-admin updates are strictly rejected.
   - `/vaultRecords/{recordId}`: Once `existing().status == 'FINALIZED'`, non-admin updates are strictly rejected.
7. **Secure List Queries**: No `allow list` rule delegates filtering to the client or performs `get()`/`exists()` lookups. Every `allow list` explicitly checks `resource.data.ownerId == request.auth.uid || isBootstrappedAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Malicious Payload / Operation | Expected Result |
|---|--------------|-------------|-------------------------------|-----------------|
| 1 | **Shadow Field Injection (User)** | `CREATE /users/{uid}` | Valid `UserProfile` + extra field `{ "isAdmin": true }` | `PERMISSION_DENIED` (`hasOnly` rejects ghost key) |
| 2 | **Unverified Email Admin Spoof** | `GET /users/victimUid` | Auth token `{ email: "maurodar08@gmail.com", email_verified: false }` | `PERMISSION_DENIED` (`isVerifiedUser()` fails) |
| 3 | **Cross-User PII Read** | `GET /users/victimUid` | Authenticated user `attackerUid` reading `victimUid` | `PERMISSION_DENIED` (owner-only PII gate) |
| 4 | **Blanket User List Scrape** | `LIST /users` | Authenticated user listing `/users` | `PERMISSION_DENIED` (`allow list: if false`) |
| 5 | **Identity Spoofing on Asset Create** | `CREATE /assets/asset-1` | `ownerId: "victimUid"` while signed in as `attackerUid` | `PERMISSION_DENIED` (`ownerId == request.auth.uid`) |
| 6 | **ID Poisoning (Oversized Path ID)** | `CREATE /assets/<200-char-junk>` | Document ID exceeding 128 chars or containing spaces/symbols | `PERMISSION_DENIED` (`isValidId(assetId)` fails) |
| 7 | **Timestamp Forgery** | `CREATE /assets/asset-2` | Client-supplied `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` | `PERMISSION_DENIED` (`createdAt == request.time`) |
| 8 | **Orphaned Order Write** | `CREATE /orders/ord-orphan` | `assetId: "nonexistent-asset"` (missing parent asset) | `PERMISSION_DENIED` (`exists(/assets/...)` fails) |
| 9 | **Cross-Tenant Order Hijack** | `CREATE /orders/ord-hijack` | `assetId` belongs to `victimUid`, order created by `attackerUid` | `PERMISSION_DENIED` (parent asset `ownerId` mismatch) |
| 10 | **Terminal State Mutation (Order)** | `UPDATE /orders/ord-filled` | Changing `status` from `'FILLED'` back to `'OPEN'` | `PERMISSION_DENIED` (terminal state lock) |
| 11 | **Value Poisoning on Allowed Key** | `UPDATE /assets/asset-1` | Updating allowed field `notes` with a 1,500-char string or boolean | `PERMISSION_DENIED` (`isValidAsset(incoming())` runs first) |
| 12 | **Unauthorized List Scrape (Assets)** | `LIST /assets` | Unfiltered `collection(db, 'assets')` query without `where('ownerId', '==', uid)` | `PERMISSION_DENIED` (`resource.data.ownerId == request.auth.uid`) |
