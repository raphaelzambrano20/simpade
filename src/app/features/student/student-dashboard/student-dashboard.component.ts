import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../../core/services/data.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="dashboard-container">
      <h2>Mi Estado en SIMPADE</h2>
      <p>Aquí puedes consultar tu progreso y dejar tus comentarios para mejorar la convivencia.</p>

      <div class="status-section">
        <h3>Tu Información (Simulada)</h3>
        <p><strong>Riesgo Actual:</strong> <span class="risk-badge risk-medium">Medio</span></p>
        <p><strong>Últimas Ausencias:</strong> 2</p>
        <p><strong>Promedio General:</strong> 3.7</p>
      </div>

      <div class="feedback-section">
        <h3>¿Cómo te sientes? ¡Tu opinión importa!</h3>
        <form [formGroup]="feedbackForm" (ngSubmit)="sendFeedback()">
          <div class="form-group">
            <label>¿Cómo te sientes en el colegio?</label>
            <select formControlName="feeling" class="form-control">
              <option>Bien</option>
              <option>Regular</option>
              <option>Mal</option>
            </select>
          </div>
           <div class="form-group">
            <label>Categoría</label>
            <select formControlName="category" class="form-control">
              <option value="convivencia">Convivencia</option>
              <option value="academico">Académico</option>
              <option value="instalaciones">Instalaciones</option>
            </select>
          </div>
          <div class="form-group">
            <label>¿Qué te gustaría mejorar?</label>
            <textarea formControlName="suggestion" rows="4" class="form-control"></textarea>
          </div>
          <button type="submit" class="btn-submit" [disabled]="feedbackForm.invalid">Enviar Comentario</button>
        </form>
      </div>
    </div>
  `
})
export class StudentDashboardComponent {
  feedbackForm: FormGroup;

  constructor(private fb: FormBuilder, private dataService: DataService, private authService: AuthService) {
    this.feedbackForm = this.fb.group({
      feeling: ['Bien', Validators.required],
      category: ['convivencia', Validators.required],
      suggestion: ['', Validators.required]
    });
  }

  sendFeedback(): void {
    if (this.feedbackForm.invalid) return;
    this.dataService.addStudentFeedback(this.feedbackForm.value).subscribe(() => {
      alert('¡Gracias! Hemos recibido tus comentarios.');
      this.feedbackForm.reset({ feeling: 'Bien', category: 'convivencia' });
    });
  }
}
