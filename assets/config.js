// Firebase web configuration. These values identify your Firebase project; they are not server secrets.
// Replace only if you register a different Firebase web app.
export const firebaseConfig = {
  apiKey: "AIzaSyD0TUuLdUAGCn8nJMlhqwxWUGH5M9UBeiI",
  authDomain: "halloween-ai-official.firebaseapp.com",
  databaseURL: "https://halloween-ai-official-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "halloween-ai-official",
  storageBucket: "halloween-ai-official.firebasestorage.app",
  messagingSenderId: "546434887616",
  appId: "1:546434887616:web:1fe51ec762a2cdfbd62225",
  measurementId: "G-79LGPJD3C8"
};

// This is the only Google account allowed to use the owner dashboard.
// Firestore Security Rules enforce the same allowlist on the database.
export const ADMIN_EMAIL = "notxpersonalonly@gmail.com";

// Halloween AI server (payments, promo codes, push, blocking). See backend/halloween-server/README.md in the app repo.
// Example: "https://halloween-ai-server.onrender.com"
export const API_BASE_URL = "https://halloween-ai-server.notxpersonalonly.workers.dev";

// Firebase App Check for this dashboard: paste the reCAPTCHA v3 SITE key (public) from Firebase Console >
// App Check > Apps > your web app. Leave empty until you have registered it.
export const APP_CHECK_SITE_KEY = "6LdBxRIuAAAAAFJDxbh7_upIuRDY_M82vGDNoB-u";
