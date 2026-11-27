import {Injectable, PLATFORM_ID, inject, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {FirebaseApp, initializeApp, getApps, getApp} from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseClient {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly user = signal<User | null>(null);
  readonly authReady = signal(false);
  readonly isSigningIn = signal(false);
  readonly authError = signal<string | null>(null);
  readonly offlineWarning = signal(false);

  private app: FirebaseApp | null = null;
  private authInstance: Auth | null = null;
  private dbInstance: Firestore | null = null;
  private googleProvider: GoogleAuthProvider | null = null;

  constructor() {
    if (this.isBrowser) {
      this.initialize();
    } else {
      this.authReady.set(true);
    }
  }

  private initialize(): void {
    this.app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    this.authInstance = getAuth(this.app);
    this.dbInstance = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.setCustomParameters({prompt: 'select_account'});

    onAuthStateChanged(this.authInstance, (firebaseUser) => {
      this.user.set(firebaseUser);
      this.authReady.set(true);
    });

    void this.testConnection();
  }

  private async testConnection(): Promise<void> {
    if (!this.dbInstance) {
      return;
    }
    try {
      await getDocFromServer(doc(this.dbInstance, 'test', 'connection'));
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('the client is offline')
      ) {
        this.offlineWarning.set(true);
        console.error('Please check your Firebase configuration.', error);
      }
    }
  }

  get db(): Firestore {
    if (!this.dbInstance) {
      throw new Error('Firestore solo está disponible en el navegador.');
    }
    return this.dbInstance;
  }

  get auth(): Auth {
    if (!this.authInstance) {
      throw new Error('Firebase Auth solo está disponible en el navegador.');
    }
    return this.authInstance;
  }

  async signInWithGoogle(): Promise<User | null> {
    if (!this.isBrowser || !this.authInstance || !this.googleProvider) {
      return null;
    }
    this.isSigningIn.set(true);
    this.authError.set(null);
    try {
      const cred = await signInWithPopup(this.authInstance, this.googleProvider);
      return cred.user;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo completar el inicio de sesión con Google.';
      this.authError.set(message);
      return null;
    } finally {
      this.isSigningIn.set(false);
    }
  }

  async signOutUser(): Promise<void> {
    if (!this.isBrowser || !this.authInstance) {
      return;
    }
    await signOut(this.authInstance);
  }

  handleFirestoreError(
    error: unknown,
    operationType: OperationType,
    path: string | null,
  ): never {
    const currentUser = this.authInstance?.currentUser;
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: currentUser?.uid,
        email: currentUser?.email,
        emailVerified: currentUser?.emailVerified,
        isAnonymous: currentUser?.isAnonymous,
        tenantId: currentUser?.tenantId,
        providerInfo:
          currentUser?.providerData?.map((provider) => ({
            providerId: provider.providerId,
            email: provider.email,
          })) || [],
      },
      operationType,
      path,
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}
