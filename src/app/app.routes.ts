import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard'; // Importa los guards

export const routes: Routes = [
  // --- Rutas Públicas (Login/Registro) ---
  {
    // Ruta para iniciar sesión (no requiere autenticación)
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component') // Asegúrate de crear este componente
      .then(c => c.LoginComponent)
  },
  {
    // Ruta para registrar nuevos usuarios (docente, estudiante, líder)
    path: 'register-user',
    loadComponent: () => import('./features/auth/register-user/register-user.component') // Asegúrate de crear este componente
      .then(c => c.RegisterUserComponent)
    // Podrías añadir un guard aquí si solo el 'líder' puede registrar usuarios
    // canActivate: [authGuard, roleGuard(['lider'])]
  },

  // --- Rutas Protegidas ---
  {
    path: '',
    redirectTo: 'dashboard', // Redirige a dashboard por defecto si está logueado
    pathMatch: 'full'
  },
  {
    // Dashboard principal (podría ser el del líder o uno general)
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard/dashboard.component')
      .then(c => c.DashboardComponent),
    canActivate: [authGuard, roleGuard(['lider', 'docente'])] // Requiere estar logueado y ser líder o docente
  },
  {
    // Listado de estudiantes (monitoreo)
    path: 'monitoring',
    loadComponent: () => import('./features/monitoring/student-list/student-list.component')
      .then(c => c.StudentListComponent),
    canActivate: [authGuard, roleGuard(['docente', 'lider'])] // Requiere ser docente o líder
  },
  {
    // Detalle de un estudiante específico
    path: 'monitoring/:id',
    loadComponent: () => import('./features/monitoring/student-detail/student-detail.component') // Nota: estaba en not-found, quizás moverlo
      .then(c => c.StudentDetailComponent),
    canActivate: [authGuard, roleGuard(['docente', 'lider'])] // Requiere ser docente o líder
  },
  {
    // Herramientas específicas del docente
    path: 'tools',
    loadComponent: () => import('./components/teachertools/teachertools.component')
      .then(c => c.TeacherToolsComponent),
    canActivate: [authGuard, roleGuard(['docente'])] // Solo para docentes
  },
  {
    // Registro de NUEVOS ESTUDIANTES (por parte del docente)
    path: 'register-student', // Cambiado de 'register' para evitar confusión con registro de usuarios
    loadComponent: () => import('./features/register/register/register.component')
      .then(c => c.RegisterComponent),
    canActivate: [authGuard, roleGuard(['docente'])] // Solo para docentes
  },
  {
    // Simulador/Análisis predictivo
    path: 'analysis',
    loadComponent: () => import('./features/analysis/predictive-simulator/predictive-simulator.component')
      .then(c => c.PredictiveSimulatorComponent),
    canActivate: [authGuard, roleGuard(['docente', 'lider'])] // Para docentes y líderes
  },
  {
     // Dashboard/Consulta del estudiante
     path: 'student-dashboard',
     loadComponent: () => import('./features/student/student-dashboard/student-dashboard.component') // Asegúrate de crear este componente
       .then(c => c.StudentDashboardComponent),
     canActivate: [authGuard, roleGuard(['estudiante'])] // Solo para estudiantes
   },
   {
      // Formulario de feedback del estudiante
      path: 'student-feedback',
      loadComponent: () => import('./features/student/student-feedback/student-feedback.component') // Asegúrate de crear este componente
        .then(c => c.StudentFeedbackComponent),
      canActivate: [authGuard, roleGuard(['estudiante'])] // Solo para estudiantes
    },
  // --- Ruta de Error 404 ---
  {
    path: '**', // Captura cualquier ruta no definida
    loadComponent: () => import('./components/not-found/not-found.component')
      .then(c => c.NotFoundComponent)
    // No necesita guard, cualquiera puede llegar a una ruta inexistente
  }
];