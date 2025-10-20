import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../../core/services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container" *ngIf="userProfile$ | async as profile">
      <h2>Dashboard del Docente</h2>
      <h3>Bienvenido, {{ profile.name }}</h3>
      <p>Desde aquí puedes gestionar a tus estudiantes, registrar novedades y analizar su progreso.</p>
      
      <div class="actions-grid">
        <a routerLink="/monitoring" class="action-card">
          <i class="fas fa-users"></i>
          <span>Ver mis Estudiantes</span>
        </a>
        <a routerLink="/register-student" class="action-card">
          <i class="fas fa-user-plus"></i>
          <span>Registrar Estudiante</span>
        </a>
        <a routerLink="/analysis" class="action-card">
          <i class="fas fa-chart-line"></i>
          <span>Simulador Predictivo</span>
        </a>
        <a routerLink="/tools" class="action-card">
          <i class="fas fa-bell"></i>
          <span>Alertas y Reportes</span>
        </a>
      </div>
    </div>
  `
})
export class TeacherDashboardComponent {
  userProfile$: Observable<UserProfile | null>;

  constructor(private authService: AuthService) {
    this.userProfile$ = this.authService.currentUserProfile$;
  }
}
