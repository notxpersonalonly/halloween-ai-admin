HALLOWEEN AI - COMPLETE FIREBASE ADMIN WEBSITE

This is the complete static admin website, not a patch. It includes
index.html, assets/admin.css, assets/admin.js, assets/config.js,
assets/app-icon.png, firestore.rules, README.md, SCHEMA.md and
BACKEND_REVIEW.md.

DEPLOY
1. Back up the current GitHub repository first.
2. Replace the website files in the repository with this ZIP's contents.
3. Preserve the repository's root-level index.html and assets/ directory.
4. Commit to main and wait for GitHub Pages to publish.
5. config.js contains public Firebase web configuration, public App Check
   site key, authorized admin email and the Worker base URL. Never put
   service-account JSON, OAuth client secrets, API tokens or Cashfree
   secrets in this repository.

DIAGNOSTIC
After signing in with the authorized verified admin account, the dashboard
calls GET /admin/firestore-check on the Worker. A successful result verifies
a temporary Firestore write, read and delete operation.

The dashboard's Firebase connection indicator and the Worker Firestore
indicator are separate checks. Zero users/payment records is not itself
an error; it may simply mean no records exist yet.
