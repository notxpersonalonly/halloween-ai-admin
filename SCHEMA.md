# Firestore data schema for Halloween AI

## users/{uid}
Basic profile only. Suggested fields: `uid` (string), `email` (string), `displayName` (string), `photoURL` (string), `createdAt` (timestamp), `lastSeenAt` (timestamp).

## entitlements/{uid}
Suggested fields:
- `paymentStatus`: `none`, `active`, `expired`, `revoked` (written only by trusted payment backend/admin)
- `paidUntil`: Firestore Timestamp (written only by trusted payment backend/admin)
- `manualAccessUntil`: Firestore Timestamp (owner dashboard manual trial)
- `source`: `cashfree_webhook` or `manual_admin`
- `updatedAt`: Firestore Timestamp

The Android app should unlock Imagine when a trusted active paid entitlement has not expired, or a valid manual access window exists. The payment webhook service must validate provider signatures, amount, order/subscription identity and event idempotency before writing paid entitlement fields.

## subscriptions/{subscriptionId}
Suggested fields: `uid`, `provider`, `providerSubscriptionId`, `status`, `periodEnd`, `updatedAt`. Treat this as server-written payment data.

## announcements/{id}
Fields: `title`, `body`, `type`, `published`, `createdAt`, `updatedAt`, `createdBy`.

## appConfig/public
Fields: `version`, `minVersion`, `updateMessage`, `maintenance`, `maintenanceMessage`, `updatedAt`, `updatedBy`.
