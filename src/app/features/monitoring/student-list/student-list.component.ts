import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { Student } from '../../../core/models/simpade.model';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subscription, take } from 'rxjs';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit, OnDestroy {
  students: Student[] = [];
  filteredStudents: Student[] = [];

  teacherGrade: number | null = 0; // Puede ser null inicialmente

  selectedRisk: string = 'Todos';
  riskOptions = ['Todos', 'Alto', 'Medio', 'Bajo'];

  private studentsSubscription: Subscription | undefined;

  private MAX_ABSENCES = 10;

  constructor(private dataService: DataService, private router: Router) { }

  ngOnInit(): void {
    this.dataService.getTeacherGrade().pipe(take(1)).subscribe((grade: number | null) => { // <-- SE AÑADIÓ EL TIPO
        this.teacherGrade = grade;
    });

    this.studentsSubscription = this.dataService.getStudents().subscribe(data => {
      this.students = data.sort((a, b) => {
        if (a.riskFactor === 'Alto' && b.riskFactor !== 'Alto') return -1;
        if (a.riskFactor !== 'Alto' && b.riskFactor === 'Alto') return 1;
        return 0;
      });
      this.applyFilter();
    });
  }

  ngOnDestroy(): void {
      this.studentsSubscription?.unsubscribe();
  }

  applyFilter(): void {
    if (this.selectedRisk === 'Todos') {
      this.filteredStudents = this.students;
    } else {
      this.filteredStudents = this.students.filter(
        student => student.riskFactor === this.selectedRisk
      );
    }
  }

  goToDetail(id: string): void {
    this.router.navigate(['/monitoring', id]);
  }

  getGpaRiskScore(gpa: number): number {
    const MAX_GPA = 5.0;
    const riskPercentage = ((MAX_GPA - gpa) / MAX_GPA) * 100;
    return Math.min(100, Math.max(0, Math.round(riskPercentage)));
  }

  getAbsencesRiskScore(absences: number): number {
    const riskPercentage = (absences / this.MAX_ABSENCES) * 100;
    return Math.min(100, Math.max(0, Math.round(riskPercentage)));
  }
}
