import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs'; // Asegúrate de importar Observable

// ⬇️ Imports de Firebase
import { initializeApp, FirebaseApp } from 'firebase/app'; // Importa FirebaseApp
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// ⬇️ Imports del proyecto
import { DataService } from './core/services/data.service';
import { AuthService, UserProfile } from './core/services/auth.service'; // Importa AuthService y UserProfile

// Variables globales proporcionadas por el entorno (se asume su existencia)
declare const __app_id: string;
declare const __firebase_config: string;
// __initial_auth_token ya no es necesario aquí, AuthService lo podría manejar si fuera necesario pasarlo.

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'SIMPADE - Sistema de Monitoreo'; // Título actualizado

  // Firebase Instances (se mantienen para inicialización)
  private app!: FirebaseApp;
  public auth!: Auth;
  public db!: Firestore;

  // Observables del AuthService
  currentUserProfile$: Observable<UserProfile | null>;
  isAuthReady$: Observable<boolean>;

  // Variables locales (opcional, si aún se necesitan directamente en el template)
  userId: string | null = null;
  userRole: string | null = null;

  // Flag MOCK (se mantiene si es relevante para lógica fuera de AuthService)
  public isMockAuth: boolean = false;

  constructor(
    private dataService: DataService,
    private authService: AuthService // Inyecta AuthService
  ) {
    // 1. Get Configuration and ID
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-simpade-app';
    let firebaseConfig: any = {};

    try {
      if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        firebaseConfig = JSON.parse(__firebase_config);
      }
    } catch (e) {
      console.error("Failed to parse __firebase_config:", e);
    }

    // 🛑 CRITICAL FALLBACK (Mantenido si es necesario antes de inicializar Auth)
    if (!firebaseConfig.apiKey) {
      console.warn("ADVERTENCIA: Usando configuración de Firebase de MOCK.");
      this.isMockAuth = true; // El AuthService también podría determinar esto
      firebaseConfig = {
        apiKey: "mock-api-key-safe", authDomain: "localhost-auth-domain", projectId: "mock-project-id",
        storageBucket: "mock-storage.appspot.com", messagingSenderId: "123456789012", appId: "1:123456789012:web:mock-app-id"
      };
    }
    console.log("Firebase Configuración:", Object.keys(firebaseConfig));

    // 2. Initialize Firebase
    this.app = initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);

    // 3. Inicializar AuthService con las instancias creadas
    // Asegúrate de que AuthService tiene el método initializeAuthService
    if (typeof this.authService.initializeAuthService === 'function') {
         this.authService.initializeAuthService(this.auth, this.db);
    } else {
         console.error("AuthService no tiene el método initializeAuthService. Asegúrate de que esté implementado.");
         // Aquí podrías manejar el error o proveer un fallback si AuthService no se pudo inicializar.
         // Sin embargo, en este punto, AuthService *debería* tener el método según el plan anterior.
    }


    // 4. Obtener observables del AuthService
    this.currentUserProfile$ = this.authService.currentUserProfile$;
    this.isAuthReady$ = this.authService.authReady$;

    // 5. Suscribirse al perfil para actualizar variables locales y DataService
    this.currentUserProfile$.subscribe(profile => {
      console.log('AppComponent: Current User Profile:', profile);
      this.userId = profile?.uid ?? null;
      this.userRole = profile?.role ?? null; // Almacena el rol si es necesario para el template

      // Inicializa DataService una vez que el perfil está disponible
      if (profile) {
        // Usa la base del path, DataService añadirá la parte específica del usuario si es necesario
         const basePath = this.getBaseDataPath();
         this.dataService.initializeFirestore(this.db, basePath); // Modificado para pasar solo db y base path

        // Si el usuario es docente, actualiza el grado enseñado en DataService
        if (profile.role === 'docente' && profile.assignedGrade !== undefined) {
          if (typeof this.dataService.setTeacherGrade === 'function') {
               this.dataService.setTeacherGrade(profile.assignedGrade);
               console.log(`AppComponent: Grado ${profile.assignedGrade} asignado al DataService.`);
          } else {
               console.warn("DataService no tiene el método setTeacherGrade.");
          }

        }
      } else {
        // Manejar caso de no perfil (usuario deslogueado)
        // Podrías necesitar limpiar datos en DataService o redirigir
        console.log('AppComponent: No hay perfil de usuario.');
      }
    });

    // Debugging: Suscríbete para ver cuándo está lista la autenticación
    this.isAuthReady$.subscribe(ready => console.log('AppComponent: Auth Ready:', ready));
  }

  ngOnInit(): void {
    // La lógica de onAuthStateChanged ahora reside principalmente en AuthService.
    // ngOnInit puede quedar vacío o usarse para otras inicializaciones del componente.
    console.log("AppComponent ngOnInit");
  }

  // Método para obtener la base del path (sin la parte del usuario)
  private getBaseDataPath(): string {
     const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-simpade-app';
     // Path base donde podrían estar las colecciones globales o la estructura /users/
     return `artifacts/${appId}`;
     // DataService internamente construirá paths como `${basePath}/users/${userId}/students`
     // o `${basePath}/all_students` dependiendo del rol.
   }


  // Método para cerrar sesión
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('AppComponent: Logout exitoso.');
        // Opcional: Redirigir a la página de login
        // this.router.navigate(['/login']);
      },
      error: (err) => console.error('AppComponent: Error en logout:', err)
    });
  }

  // generateUUID ya no es necesario aquí si AuthService lo maneja internamente para mocks/fallbacks
  // private generateUUID(): string { ... }

  // privateDataPath ya no es necesario aquí si DataService construye sus propios paths
  // public get privateDataPath(): string { ... }
}