import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../../core/services/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  isFirebaseConnected = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isFirebaseConnected = this.authService.isFirebaseConnected();

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        // 🛑 MEJORA: Lógica de redirección basada en el rol
        this.authService.currentUserProfile$.pipe(take(1)).subscribe(profile => {
          if (profile) {
            this.redirectUser(profile);
          } else {
            // Fallback en caso de que el perfil no se cargue a tiempo
            this.router.navigate(['/dashboard']);
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Credenciales inválidas. Por favor, inténtalo de nuevo.';
        console.error('Error de login:', err);
      }
    });
  }

  /**
   * 🛑 NUEVO: Redirige al usuario a su dashboard correspondiente según su rol.
   */
  private redirectUser(profile: UserProfile): void {
    switch (profile.role) {
      case 'lider':
      case 'docente':
        this.router.navigate(['/dashboard']);
        break;
      case 'estudiante':
        this.router.navigate(['/student-dashboard']);
        break;
      default:
        // Si el rol es 'pendiente' o desconocido, lo enviamos a una página de espera o al login
        this.errorMessage = 'Tu cuenta está pendiente de activación.';
        this.authService.logout(); // Cerramos sesión para evitar que quede en un estado inválido
        this.loading = false;
        // Opcionalmente, redirigir a una página específica: this.router.navigate(['/pending-activation']);
        break;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}

