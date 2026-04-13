import { initializeApp } from 'firebase/app';
import { getAuth, User } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, getDocFromServer, deleteDoc, getDocs, query, orderBy, limit, Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject, Storage } from 'firebase/storage';
import { FirebaseOptions } from 'firebase/app';

// Import the Firebase configuration
import firebaseConfig from '../../firebase-applet-config.json';

// Validate Firebase configuration
if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Invalid Firebase configuration. Please check firebase-applet-config.json');
}

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Use long polling to bypass potential WebSocket issues in restricted environments
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth();
export const storage: Storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface ProviderInfo {
  providerId: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
}

export interface AuthInfo {
  userId: string | undefined;
  email: string | null | undefined;
  emailVerified: boolean | undefined;
  isAnonymous: boolean | undefined;
  tenantId: string | null | undefined;
  providerInfo: ProviderInfo[];
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: AuthInfo;
  timestamp: number;
}

function getAuthInfo(): AuthInfo {
  const currentUser: User | null = auth.currentUser;
  
  return {
    userId: currentUser?.uid,
    email: currentUser?.email,
    emailVerified: currentUser?.emailVerified,
    isAnonymous: currentUser?.isAnonymous,
    tenantId: currentUser?.tenantId,
    providerInfo: currentUser?.providerData.map((provider): ProviderInfo => ({
      providerId: provider.providerId,
      displayName: provider.displayName,
      email: provider.email,
      photoUrl: provider.photoURL
    })) || []
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: getAuthInfo(),
    operationType,
    path,
    timestamp: Date.now()
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('the client is offline')) {
      console.error("Firebase connection failed: Client is offline. Please check your internet connection.");
    } else if (errorMessage.includes('permission-denied')) {
      console.error("Firebase connection failed: Permission denied. Please check your Firebase configuration.");
    } else {
      console.error("Firebase connection failed:", errorMessage);
    }
    
    return false;
  }
}

// Initialize connection test on module load
testConnection().catch(() => {
  // Silent catch to avoid unhandled promise rejection during initialization
  // The actual error is logged in testConnection function
});