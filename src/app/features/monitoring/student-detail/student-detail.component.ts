import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { Student } from '../../../core/models/simpade.model';
import { Observable, Subscription, switchMap, tap } from 'rxjs';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink, ReactiveFormsModule],
  templateUrl: './student-detail.component.html',
  styleUrls: ['./student-detail.component.css']
})
export class StudentDetailComponent implements OnInit, OnDestroy {

  student$: Observable<Student | null> | undefined;
  loading: boolean = false;
  errorMessage: string = '';
  showConfirmModal: boolean = false;
  studentIdToDelete: string = '';

  // --- Propiedades para Edición de Perfil ---
  isEditing: boolean = false;
  editForm!: FormGroup;
  private currentStudent: Student | null = null;
  private routeSubscription: Subscription | undefined;

  // --- Propiedades para Pestañas y Novedades ---
  activeTab: 'profile' | 'attendance' | 'grades' | 'observations' = 'profile';
  attendanceForm: FormGroup;
  gradeForm: FormGroup;
  observationForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private fb: FormBuilder
  ) {
    // Inicializar formularios para registrar novedades
    this.attendanceForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      status: ['ausente', Validators.required]
    });

    this.gradeForm = this.fb.group({
      subjectId: ['matematicas', Validators.required],
      gradeValue: [3.5, [Validators.required, Validators.min(0), Validators.max(5)]],
      period: [3, [Validators.required, Validators.min(1), Validators.max(4)]]
    });

    this.observationForm = this.fb.group({
      text: ['', Validators.required],
      category: ['academica', Validators.required]
    });
  }

  ngOnInit(): void {
    this.student$ = this.route.paramMap.pipe(
      tap(() => this.loading = true),
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          this.errorMessage = 'ID de estudiante no proporcionado.';
          this.loading = false;
          return new Observable<null>();
        }
        return this.dataService.getStudentById(id).pipe(
          tap(student => {
            this.loading = false;
            this.currentStudent = student;
            this.initEditForm(student);
          })
        );
      })
    );

    this.routeSubscription = this.student$.subscribe({
      error: (err) => {
        this.errorMessage = 'Fallo al cargar los datos del estudiante.';
        this.loading = false;
        console.error("Error al cargar estudiante:", err);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  // --- MANEJO DE PERFIL (VISTA Y EDICIÓN) ---

  private initEditForm(student: Student | null): void {
    if (!student) return;
    this.editForm = this.fb.group({
      name: [student.name, [Validators.required, Validators.minLength(3)]],
      studentId: [student.studentId, [Validators.required, Validators.pattern('^[0-9]+$')]],
      grade: [student.grade, [Validators.required, Validators.min(1), Validators.max(12)]],
      academicAverage: [student.academicAverage, [Validators.required, Validators.min(0), Validators.max(5)]],
      economicStatus: [student.economicStatus, Validators.required],
      absencesLastMonth: [student.absencesLastMonth, [Validators.required, Validators.min(0)]],
    });
  }

  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.currentStudent) {
      this.initEditForm(this.currentStudent);
    }
  }

  submitEdit(): void {
    if (this.editForm.invalid || !this.currentStudent) {
      this.errorMessage = 'Por favor, corrija los errores del formulario.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    const updatedStudent: Student = { ...this.currentStudent, ...this.editForm.value };

    this.dataService.updateStudent(updatedStudent).subscribe({
      next: () => {
        this.loading = false;
        this.isEditing = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Fallo al actualizar el perfil: ' + (err.message || 'Error de conexión.');
        console.error("Error al actualizar estudiante:", err);
      }
    });
  }

  // --- MANEJO DE PESTAÑAS Y REGISTRO DE NOVEDADES ---

  setActiveTab(tab: 'profile' | 'attendance' | 'grades' | 'observations'): void {
    this.activeTab = tab;
  }

  addAttendance(): void {
    if (this.attendanceForm.invalid || !this.currentStudent) return;
    const data = { ...this.attendanceForm.value, studentId: this.currentStudent.id };
    this.dataService.addAttendance(data).subscribe(() => {
      this.attendanceForm.reset({ date: new Date().toISOString().split('T')[0], status: 'ausente' });
    });
  }

  addGrade(): void {
    if (this.gradeForm.invalid || !this.currentStudent) return;
    const data = { ...this.gradeForm.value, studentId: this.currentStudent.id };
    this.dataService.addGrade(data).subscribe(() => {
      this.gradeForm.reset({ subjectId: 'matematicas', gradeValue: 3.5, period: 3 });
    });
  }

  addObservation(): void {
    if (this.observationForm.invalid || !this.currentStudent) return;
    const data = { ...this.observationForm.value, studentId: this.currentStudent.id };
    this.dataService.addObservation(data).subscribe(() => {
      this.observationForm.reset({ category: 'academica', text: '' });
    });
  }

  // --- MANEJO DE ELIMINACIÓN ---

  confirmDelete(studentId: string): void {
    this.studentIdToDelete = studentId;
    this.showConfirmModal = true;
  }

  deleteStudentConfirmed(): void {
    if (!this.studentIdToDelete) return;
    this.loading = true;
    this.showConfirmModal = false;

    this.dataService.deleteStudent(this.studentIdToDelete).subscribe({
      next: () => {
        console.log(`Estudiante ${this.studentIdToDelete} eliminado.`);
        this.router.navigate(['/monitoring']);
      },
      error: (err) => {
        this.errorMessage = 'Error al eliminar el estudiante: ' + (err.message || 'Error desconocido.');
        this.loading = false;
        console.error('Error de eliminación:', err);
      }
    });
  }
}

