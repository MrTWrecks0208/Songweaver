import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Add a connection helper to diagnose issues
export const checkConnection = async () => {
  console.log("Firebase config state:", {
    projectId: !!firebaseConfig.projectId,
    apiKey: !!firebaseConfig.apiKey,
    databaseId: firebaseConfig.firestoreDatabaseId
  });
  try {
    const { getDocFromServer, doc } = await import('firebase/firestore');
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
    return true;
  } catch (error: any) {
    console.error("Firestore connection failed:", error.code, error.message);
    return false;
  }
};

export let storage: FirebaseStorage | null = null;
try {
  storage = getStorage(app);
  storage.maxUploadRetryTime = 1000; // 1 second
} catch (e) {
  console.error("Firebase Storage initialization failed:", e);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
