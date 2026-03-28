import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDocsFromServer,
  deleteDoc,
  orderBy,
  serverTimestamp,
  increment,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

function getApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

function ensureAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

function ensureDb(): Firestore {
  if (!_db) {
    const app = getApp();
    try {
      _db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
      });
    } catch {
      // Fallback if persistence fails (e.g. multiple tabs, private browsing)
      _db = getFirestore(app);
    }
  }
  return _db;
}

function ensureGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) _googleProvider = new GoogleAuthProvider();
  return _googleProvider;
}

const auth: Auth = typeof window !== "undefined" ? ensureAuth() : ({} as Auth);
const db: Firestore = typeof window !== "undefined" ? ensureDb() : ({} as Firestore);
const googleProvider: GoogleAuthProvider =
  typeof window !== "undefined" ? ensureGoogleProvider() : ({} as GoogleAuthProvider);

export {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDocsFromServer,
  deleteDoc,
  orderBy,
  serverTimestamp,
  increment,
  type User,
};
