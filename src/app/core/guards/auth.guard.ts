// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

// Guard para verificar si el usuario está autenticado
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUserProfile$.pipe(
    take(1), // Toma solo el primer valor emitido para decidir
    map(user => !!user), // Convierte el perfil de usuario (o null) a boolean
    tap(isLoggedIn => {
      if (!isLoggedIn) {
        console.log('Auth Guard: No logueado, redirigiendo a /login');
        router.navigate(['/login']); // Redirige a la página de login si no está autenticado
      }
    })
  );
};

// Guard específico para roles (ejemplo para 'docente')
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state): Observable<boolean> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.currentUserProfile$.pipe(
      take(1),
      map(userProfile => {
        // Verifica si el usuario existe y su rol está permitido
        const hasPermission = !!userProfile && allowedRoles.includes(userProfile.role);
        if (!hasPermission) {
          console.log(`Role Guard: Rol '${userProfile?.role}' no permitido para esta ruta. Redirigiendo...`);
          // Redirigir a una página de 'no autorizado' o al dashboard principal
          router.navigate(['/dashboard']); // O a '/unauthorized'
          return false;
        }
        return true;
      })
    );
  };
};