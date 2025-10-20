import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DataService } from '../../../core/services/data.service';
import { AuthService, UserProfile } from '../../../core/services/auth.service';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Student } from '../../../core/models/simpade.model';

// Interfaz para combinar la información del perfil y del estudiante
interface StudentData {
  profile: UserProfile;
  details: Student | null;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  
  studentData$: Observable<StudentData | null> | undefined;
  feedbackForm: FormGroup;

  // 🛑 MEJORA: Controla si se muestra la bienvenida o el estado
  showWelcomeScreen = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private dataService: DataService
  ) {
    this.feedbackForm = this.fb.group({
      feeling: ['Bien', Validators.required],
      category: ['Convivencia', Validators.required],
      suggestion: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Obtenemos los datos combinados del perfil de autenticación y los detalles del estudiante
    this.studentData$ = this.authService.currentUserProfile$.pipe(
      switchMap(profile => {
        if (!profile || profile.role !== 'estudiante' || !profile.studentId) {
          return of(null); // Si no es un estudiante con ID, no continuamos
        }
        
        // Buscamos los detalles del estudiante usando el studentId del perfil
        return this.dataService.getStudentById(profile.studentId).pipe(
          map(studentDetails => ({
            profile: profile,
            details: studentDetails
          }))
        );
      })
    );
  }

  // 🛑 MEJORA: Método para cambiar de la bienvenida a la vista de estado
  proceedToStatusView(): void {
    this.showWelcomeScreen = false;
  }

  submitFeedback(): void {
    if (this.feedbackForm.invalid) {
      alert('Por favor completa todos los campos del formulario de opinión.');
      return;
    }

    // Aquí llamarías al DataService para guardar el feedback
    this.dataService.addStudentFeedback(this.feedbackForm.value).subscribe({
      next: () => {
        alert('¡Gracias por tus comentarios! Tu opinión es muy valiosa.');
        this.feedbackForm.reset({
          feeling: 'Bien',
          category: 'Convivencia',
          suggestion: ''
        });
      },
      error: (err) => console.error('Error al enviar feedback:', err)
    });
  }
}

