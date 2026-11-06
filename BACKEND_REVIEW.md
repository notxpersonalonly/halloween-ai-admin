# Backend review

## Done in v3
- Manual grants removed everywhere. Imagine access = verified payment or promo code, written only by the server.
- Rules: entitlements/subscriptions are server-only; feedback, promo codes and an append-only audit log added; blocked accounts cannot send feedback.
- Dashboard: block/unblock, promo codes, feedback inbox, audit log, push with announcements. App settings page (maintenance / forced update) removed.
- App Check wiring added (dashboard + Android). Enforce it only after checking its metrics (see below).

## Still to do by you
1. Deploy backend/halloween-server on Render and set its environment variables (README there). Then set API_BASE_URL here and `-PapiUrl=` in the app build.
2. Publish firestore.rules. Do this BEFORE using the new dashboard.
3. App Check: register Android (Play Integrity) and the web app (reCAPTCHA v3) in the console, ship the new app, watch the App Check metrics for a few days, THEN turn on enforcement for Firestore. Turning it on early locks out everyone on an older build.
4. Realtime Database: `config.js` lists a databaseURL. Make sure its rules deny everything, or delete the database.
5. Restrict the web API key to your GitHub Pages address and the Android key to com.halloween.ai + your SHA-1s.
6. Update the privacy policy and Play Data Safety answers: push notifications (FCM), feedback you send, and the payment record are new.
7. Cashfree: create orders with the buyer's Firebase UID as customer_id and test with their sandbox before charging real money.

## Later
Pagination of users, announcement expiry, rules tests in the Firebase emulator.
