import { Injectable } from '@angular/core';
import { Auth, User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, UserCredential } from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators';

// Modelo para el perfil de usuario (incluye el rol)
export interface UserProfile {
  uid: string;
  email: string | null;
  name?: string;
  role: 'docente' | 'estudiante' | 'lider' | 'pendiente';
  assignedGrade?: number;
  studentId?: string;
}

// --- USUARIOS PREDETERMINADOS PARA EL MODO SIMULADO ---
const MOCK_USERS: { [email: string]: { password: string, profile: UserProfile } } = {
  'lider@simpade.com': {
    password: 'password123',
    profile: { uid: 'mock-leader-uid', email: 'lider@simpade.com', name: 'Líder Institucional', role: 'lider' }
  },
  'docente@simpade.com': {
    password: 'password123',
    profile: { uid: 'mock-teacher-uid', email: 'docente@simpade.com', name: 'Profe Ejemplo', role: 'docente', assignedGrade: 10 }
  },
  'estudiante@simpade.com': {
    password: 'password123',
    profile: { uid: 'mock-student-uid', email: 'estudiante@simpade.com', name: 'Estudiante Ejemplo', role: 'estudiante', studentId: '1001' }
  }
};


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth!: Auth;
  private db!: Firestore;
  private isConnected = false;

  private currentUserProfile = new BehaviorSubject<UserProfile | null>(null);
  currentUserProfile$ = this.currentUserProfile.asObservable();

  private authReady = new BehaviorSubject<boolean>(false);
  authReady$ = this.authReady.asObservable();

  constructor() {}

  initializeAuthService(auth: Auth, db: Firestore) {
    this.auth = auth;
    this.db = db;
    this.isConnected = auth.app.options.apiKey !== 'mock-api-key-safe';
    
    if (this.isConnected) {
        this.monitorAuthState();
    } else {
        this.authReady.next(true);
        console.warn("AuthService: Operando en MODO SIMULADO. Usa las credenciales predeterminadas.");
    }
  }

  isFirebaseConnected(): boolean {
    return this.isConnected;
  }

  private monitorAuthState() {
    onAuthStateChanged(this.auth, user => {
      if (user) {
        this.fetchUserProfile(user.uid).subscribe(profile => {
          this.currentUserProfile.next(profile);
          this.authReady.next(true);
        });
      } else {
        this.currentUserProfile.next(null);
        this.authReady.next(true);
      }
    });
  }

  // --- MÉTODOS DE LOGIN ---

  login(email: string, password: string): Observable<User | UserProfile> {
    // Si no estamos conectados a Firebase, usamos la lógica de usuarios predeterminados
    if (!this.isConnected) {
      const userRecord = MOCK_USERS[email];
      if (userRecord && userRecord.password === password) {
        // Credenciales correctas, emitimos el perfil del usuario
        this.currentUserProfile.next(userRecord.profile);
        return of(userRecord.profile); // Retornamos el perfil como un Observable
      } else {
        // Credenciales incorrectas
        return throwError(() => new Error('Credenciales inválidas'));
      }
    }

    // Lógica original para Firebase
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      map((userCredential: UserCredential) => userCredential.user)
    );
  }

  logout(): Observable<void> {
    if (!this.isConnected) {
      this.currentUserProfile.next(null);
      return of(undefined);
    }
    return from(signOut(this.auth));
  }

  // --- OTROS MÉTODOS ---

  fetchUserProfile(uid: string): Observable<UserProfile | null> {
    const userDocRef = doc(this.db, `users/${uid}`);
    return from(getDoc(userDocRef)).pipe(
      map((docSnap: DocumentSnapshot) => {
        if (docSnap.exists()) {
          return { uid, ...docSnap.data() } as UserProfile;
        } else {
          const user = this.auth.currentUser;
          return { uid, email: user?.email || null, role: 'pendiente' } as UserProfile;
        }
      })
    );
  }

  register(email: string, password: string, name: string, role: UserProfile['role'] = 'pendiente', studentId?: string): Observable<UserProfile> {
    // El registro solo tiene sentido en un entorno real con Firebase
    if (!this.isConnected) {
        return throwError(() => new Error('El registro no está disponible en modo simulado.'));
    }

    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCredential: UserCredential) => {
        const uid = userCredential.user.uid;
        const newUserProfile: UserProfile = { uid, email, name, role, ...(studentId && { studentId }) };
        const userDocRef = doc(this.db, `users/${uid}`);
        return from(setDoc(userDocRef, { email, name, role, ...(studentId && { studentId }) })).pipe(
          map(() => newUserProfile)
        );
      })
    );
  }
}

