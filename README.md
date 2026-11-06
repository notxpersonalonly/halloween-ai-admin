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

| Collection | Written by | Purpose |
|---|---|---|
| `users/{uid}` | app (own profile only) | Basic profile |
| `entitlements/{uid}` | **server only** | `paymentStatus`, `paidUntil`, `promoUntil`, `blocked` |
| `subscriptions/{orderId}` | **server only** | One record per verified payment |
| `announcements/{id}` | dashboard | Shown in the app's bell screen |
| `promoCodes/{CODE}` | dashboard creates; server redeems | `days`, `maxUses`, `uses`, `active`, `expiresAt` |
| `feedback/{id}` | app (create only) | Feedback and bug reports; you read them here |
| `adminLog/{id}` | dashboard and server, append-only | Audit trail |

The dashboard cannot grant Imagine access. Access comes from a verified payment or a redeemed promo code, both applied by the server (`backend/halloween-server` in the app repository). Blocking and push notifications also go through that server: set `API_BASE_URL` in `assets/config.js` once it is deployed.

## Payments

This dashboard never verifies or records payments. The server checks Cashfree's signature and then writes the access record.

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
