# Firestore data schema

## users/{uid}  (app writes own profile)
`uid`, `email`, `displayName`, `photoURL`, `createdAt`, `lastSeenAt`

## entitlements/{uid}  (server only)
- `paymentStatus`: `active` after a verified payment; `paidUntil`: Timestamp (renewals stack)
- `promoUntil`: Timestamp from a redeemed promo code
- `blocked`: boolean, `blockedReason`, `blockedAt`
- `source`, `updatedAt`
Imagine unlocks when not blocked and (paid and `paidUntil` in the future, or `promoUntil` in the future). `manualAccessUntil` is no longer read.

## subscriptions/{orderId}  (server only)
`uid`, `provider`, `providerSubscriptionId`, `status`, `periodEnd`, `amount`, `updatedAt`

## announcements/{id}  (dashboard)
`title`, `body`, `type` (info/success/warning), `published`, `createdAt`, `updatedAt`, `createdBy`

## promoCodes/{CODE}  (dashboard creates, server redeems)
`days`, `maxUses` (0 = unlimited), `uses`, `active`, `expiresAt?`, `createdAt`, `createdBy`; subcollection `redemptions/{uid}` (server only)

## feedback/{id}  (app creates, admin reads)
`uid`, `category` (feedback/bug/other), `message` (max 2000), `appVersion`, `device`, `status` (new/done), `createdAt`

## adminLog/{id}  (append-only)
`admin`, `action`, `target`, `detail`, `createdAt`
