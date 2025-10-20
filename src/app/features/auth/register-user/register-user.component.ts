import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-user.component.html',
  styleUrl: '../login/login.component.css' // Reutiliza el CSS de login
})
export class RegisterUserComponent {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['docente', Validators.required] // Por defecto se registra como docente
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const { name, email, password, role } = this.registerForm.value;

    this.authService.register(email, password, name, role).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = '¡Registro exitoso! Redirigiendo al inicio de sesión...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'El correo electrónico ya está en uso o la contraseña es muy débil.';
        console.error(err);
      }
    });
  }
}
