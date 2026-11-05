# Halloween AI Admin — Firebase + GitHub Pages

A static owner dashboard for the Halloween AI project. It uses Firebase Authentication (Google) and Cloud Firestore directly from the browser. No Cloudflare Worker is used for ordinary dashboard reads/writes.

## Project configuration included

- Firebase project: `halloween-ai-official`
- Firebase web app ID: `1:546434887616:web:1fe51ec762a2cdfbd62225`
- Admin allowlist: `notxpersonalonly@gmail.com`
- GitHub Pages hostname to authorize: `notxpersonalonly.github.io`

The Firebase web config is public client configuration, not a server credential. Do not add service-account JSON, OAuth client secrets, Cashfree secrets, private keys, or `.env` files to this repository.

## 1. Upload to GitHub

1. Extract this ZIP on your phone.
2. Open the `halloween-ai-admin` GitHub repository.
3. Upload the **contents** of this folder to the repository root. `index.html` must be at the root, not inside another nested folder.
4. Commit the files.

## 2. Enable GitHub Pages

Repository → Settings → Pages:
- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`
- Save

Expected site URL: `https://notxpersonalonly.github.io/halloween-ai-admin/`

## 3. Firebase Authentication

Firebase Console → Authentication:
- Google provider must be enabled.
- Authorized domains must include `notxpersonalonly.github.io`.
- Sign in using the exact admin account configured in `assets/config.js`.

## 4. Publish Firestore Security Rules

Firebase Console → Firestore Database → Rules.
Copy the complete contents of `firestore.rules` into the rules editor and click **Publish**.

These rules are deny-by-default. They permit the configured admin email to administer the dashboard; users can read only their own entitlement and can edit only basic profile fields. Update the admin email in BOTH `assets/config.js` and `firestore.rules` if the owner account changes.

## 5. Firestore collections used

| Collection | Purpose |
|---|---|
| `users/{uid}` | Basic user profile (uid, email, displayName, createdAt, lastSeenAt) |
| `entitlements/{uid}` | Payment status and optional manual access window |
| `subscriptions/{subscriptionId}` | Read-only subscription records in the dashboard |
| `announcements/{id}` | App announcements |
| `appConfig/public` | Version and maintenance settings |

The Android app must write user profiles using the signed-in Firebase UID. It must never write payment status, paid expiry, or subscription state.

## Important payment limitation

This dashboard does **not** verify Cashfree payments, create recurring mandates, process webhooks, or automatically renew entitlements. Do not treat a browser action as proof of payment. A trusted server-side payment webhook/reconciliation service is still required before paid subscription access can be activated automatically. The manual 7-day grant is explicitly a trial/manual override, not a payment record.

## Before launch

- Keep the repository free of secrets. A public repository exposes current files and Git history.
- Publish and test Firestore rules before entering real user data.
- Test Google login using the exact authorized admin account.
- Test that a different Google account is denied.
- Test that a normal user cannot list users, change entitlements, subscriptions, announcements, or app settings.
- Consider enabling Firebase App Check after the web and Android clients are integrated.
- Firebase Spark has quotas and limits; this architecture does not mean unlimited database usage.

## Troubleshooting

- `auth/unauthorized-domain`: add the exact Pages hostname under Authentication → Settings → Authorized domains.
- `permission-denied`: check that Firestore rules were published and the signed-in email exactly matches the admin allowlist.
- Blank page: verify `index.html` is in the repository root and Pages deployment completed; open the browser console if possible.
