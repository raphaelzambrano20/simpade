import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router'; // Necesario para la navegación en las tarjetas
import { DataService } from '../../core/services/data.service';
import { Student } from '../../core/models/simpade.model';
import { Observable, map } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-teacher-tools',
  standalone: true,
  // 🛑 Importamos RouterLink para la navegación en las tarjetas
  imports: [CommonModule, FormsModule, DatePipe, RouterLink],
  templateUrl: './teachertools.component.html',
  styleUrls: ['./teachertools.component.css']
})
export class TeacherToolsComponent implements OnInit {

  students$: Observable<Student[]>;
  highRiskStudents$: Observable<Student[]>;

  // Variables para la simulación de alertas
  selectedStudentId: string = '';
  alertMessage: string = 'Revisar ausencias en el último mes.';

  alertLogs: { studentName: string, date: Date, message: string }[] = [];
  reportGenerated: boolean = false;

  // Variables de estado del Hub Docente
  showActionPanel: 'alerts' | 'reports' | 'hub' = 'hub'; // Controla qué panel está activo

  constructor(private dataService: DataService) {
    this.students$ = this.dataService.getStudents();

    // Filtramos estudiantes de Alto Riesgo
    this.highRiskStudents$ = this.students$.pipe(
      map(students => students.filter(s => s.riskFactor === 'Alto'))
    );
  }

  ngOnInit(): void {
    this.highRiskStudents$.subscribe(students => {
      if (students.length > 0) {
        this.selectedStudentId = students[0].id;
      }
    });
  }

  // Lógica de simulación para el panel de alertas (para usar en el HTML)
  sendAlert(students: Student[]): void {
    if (!this.selectedStudentId) return;

    const student = students.find(s => s.id === this.selectedStudentId);
    if (student) {
      this.alertLogs.unshift({
        studentName: student.name,
        date: new Date(),
        message: this.alertMessage
      });
      this.alertMessage = 'Revisar ausencias en el último mes.';
    }
  }

  // Lógica de simulación de reportes
  generateReport(): void {
    this.reportGenerated = true;
    setTimeout(() => {
      this.reportGenerated = false;
    }, 3000);
  }

  // 🛑 Alterna el panel
  showPanel(panel: 'alerts' | 'reports' | 'hub'): void {
      this.showActionPanel = panel;
  }
}
