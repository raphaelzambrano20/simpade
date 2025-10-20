import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  economicStatusOptions = ['Vulnerable', 'Estable'];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      // Se añade el campo para el número de identificación del estudiante
      studentId: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      grade: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      academicAverage: [4.0, [Validators.required, Validators.min(0), Validators.max(5)]],
      absencesLastMonth: [0, [Validators.required, Validators.min(0)]],
      economicStatus: ['Estable', Validators.required]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Por favor, complete todos los campos requeridos correctamente.';
      return;
    }
    
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.dataService.saveNewUser(this.registerForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedUser) => {
          this.successMessage = `¡Registro exitoso de ${savedUser.name}! Redirigiendo a la lista...`;
          this.registerForm.reset({
              academicAverage: 4.0,
              absencesLastMonth: 0,
              economicStatus: 'Estable'
          });
          // Redirige a la lista de monitoreo para ver al nuevo estudiante
          setTimeout(() => this.router.navigate(['/monitoring']), 2000);
        },
        error: (error: any) => {
          this.errorMessage = error.message || 'Error desconocido al guardar el registro.';
          console.error("Error al registrar estudiante:", error);
          this.loading = false; // Asegura que el loading se detenga en caso de error
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  // Helper para acceder fácilmente a los controles del formulario en el HTML
  get f() { return this.registerForm.controls; }
}

