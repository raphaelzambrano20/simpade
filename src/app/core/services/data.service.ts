import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, combineLatest, from } from 'rxjs';
import { map, shareReplay, switchMap, catchError } from 'rxjs/operators';
import {
    Firestore,
    collection,
    addDoc,
    query,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    where,
    getDoc
} from 'firebase/firestore';

import { Student, SimulationResult, NewStudentForm, Attendance, Grade, Observation, StudentFeedback, UserProfile } from '../models/simpade.model';
import { AuthService } from './auth.service';

interface FirestoreState {
    db: Firestore;
    basePath: string;
    isMockMode: boolean;
}

export type SchoolContext = 'Bajo' | 'Medio' | 'Alto';

@Injectable({
    providedIn: 'root'
})
export class DataService {

    private firestoreReady$ = new BehaviorSubject<FirestoreState | null>(null);
    private gradeTaught$ = new BehaviorSubject<number | null>(null);
    private schoolContext$ = new BehaviorSubject<SchoolContext>('Medio');
    private currentUserProfile: UserProfile | null = null;
    private mockStudents: Student[] = this.generateInitialMockStudents();
    private mockDataStream$ = new BehaviorSubject<Student[]>(this.mockStudents);
    private BASE_DESERTION_RATE = 10.0;

    constructor(private authService: AuthService) {
        this.authService.currentUserProfile$.subscribe(profile => {
            this.currentUserProfile = profile;
        });
    }

    initializeFirestore(db: Firestore, basePath: string): void {
        const isMockMode = !this.authService.isFirebaseConnected();
        this.firestoreReady$.next({ db, basePath, isMockMode });
    }

    setTeacherGrade(grade: number): void {
        this.gradeTaught$.next(grade);
    }

    getTeacherGrade(): Observable<number | null> {
        return this.gradeTaught$.asObservable();
    }

    private classifyRisk(academicAverage: number, absencesLastMonth: number): 'Alto' | 'Medio' | 'Bajo' {
        if (academicAverage < 2.8 || absencesLastMonth >= 5) return 'Alto';
        if (academicAverage < 3.8 || absencesLastMonth >= 2) return 'Medio';
        return 'Bajo';
    }

    private calculateSystemDesertionRate(students: Student[], context: SchoolContext): number {
        if (students.length === 0) return this.BASE_DESERTION_RATE;
        const summary = students.reduce((acc, s) => {
            if (s.riskFactor === 'Alto') acc.alto++;
            else if (s.riskFactor === 'Medio') acc.medio++;
            return acc;
        }, { alto: 0, medio: 0 });
        const riskIncrease = (summary.alto * 0.5) + (summary.medio * 0.2);
        let contextPenalty = 0;
        if (context === 'Alto') contextPenalty = 3.0;
        else if (context === 'Medio') contextPenalty = 1.0;
        return parseFloat(Math.min(25, this.BASE_DESERTION_RATE + riskIncrease + contextPenalty).toFixed(2));
    }

    getStudents(): Observable<Student[]> {
        return combineLatest([this.firestoreReady$, this.gradeTaught$, this.authService.currentUserProfile$]).pipe(
            switchMap(([state, gradeTaught, profile]) => {
                if (!state || !profile) return of([]);
                const { db, basePath, isMockMode } = state;
                const { role, uid } = profile;

                if (isMockMode) {
                    return this.mockDataStream$.pipe(map(students => {
                        if (role === 'docente') return students.filter(s => s.grade === gradeTaught && s.ownerId === uid);
                        if (role === 'lider') return students;
                        return [];
                    }));
                }

                let collectionPath: string;
                let q;

                if (role === 'lider') {
                    collectionPath = `${basePath}/public/data/students`;
                    q = query(collection(db, collectionPath));
                } else if (role === 'docente') {
                    collectionPath = `${basePath}/users/${uid}/students`;
                     if (gradeTaught === null) return of([]);
                    q = query(collection(db, collectionPath), where('grade', '==', gradeTaught));
                } else {
                    return of([]);
                }

                return new Observable<Student[]>(observer => {
                    const unsubscribe = onSnapshot(q, (snapshot) => {
                        observer.next(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Student)));
                    }, error => observer.error(error));
                    return () => unsubscribe();
                });
            }),
            shareReplay(1)
        );
    }
    
    /**
     * CORREGIDO: Lógica completa para obtener un estudiante por su ID.
     */
    getStudentById(id: string): Observable<Student | null> {
        return this.firestoreReady$.pipe(
            switchMap(state => {
                if (!state || !this.currentUserProfile) {
                    console.error("DataService no listo o sin perfil de usuario para getStudentById");
                    return of(null);
                }

                const { db, basePath, isMockMode } = state;
                const { role, uid } = this.currentUserProfile;

                if (isMockMode) {
                    return this.mockDataStream$.pipe(
                        map(students => students.find(s => s.id === id) || null)
                    );
                }

                // Determina la ruta correcta al documento según el rol del usuario
                const docPath = role === 'lider'
                    ? `${basePath}/public/data/students/${id}`
                    : `${basePath}/users/${uid}/students/${id}`;
                
                return from(getDoc(doc(db, docPath))).pipe(
                    map(docSnap => {
                        if (docSnap.exists()) {
                            return { id: docSnap.id, ...docSnap.data() } as Student;
                        } else {
                            console.warn(`Estudiante con id ${id} no encontrado en la ruta ${docPath}`);
                            return null;
                        }
                    }),
                    catchError(err => {
                        console.error("Error al obtener estudiante por ID:", err);
                        return of(null);
                    })
                );
            })
        );
    }

    saveNewUser(newStudentData: NewStudentForm): Observable<Student> {
        const state = this.firestoreReady$.getValue();
        if (!state || !this.currentUserProfile || this.currentUserProfile.role !== 'docente') {
            return throwError(() => new Error('Servicio no inicializado o el usuario no es un docente.'));
        }

        const teacherId = this.currentUserProfile.uid;
        const riskFactor = this.classifyRisk(newStudentData.academicAverage, newStudentData.absencesLastMonth);
        
        const dataToSave: Omit<Student, 'id'> = {
            name: newStudentData.name,
            studentId: newStudentData.studentId,
            grade: newStudentData.grade,
            academicAverage: newStudentData.academicAverage,
            absencesLastMonth: newStudentData.absencesLastMonth,
            economicStatus: newStudentData.economicStatus || 'Estable',
            riskFactor,
            ownerId: teacherId,
        };

        if (state.isMockMode) {
            return this.simulateSaveNewUser(dataToSave, teacherId);
        }

        const studentCollectionPath = `${state.basePath}/users/${teacherId}/students`;
        const promise = this.saveNewUserToFirestore(dataToSave, studentCollectionPath, state.db);
        return from(promise).pipe(catchError(this.handleError));
    }

    /**
     * CORREGIDO: Lógica completa para actualizar un estudiante.
     */
    updateStudent(student: Student): Observable<void> {
        const state = this.firestoreReady$.getValue();
        if (!state || !this.currentUserProfile) {
            return throwError(() => new Error('No autorizado o servicio no listo.'));
        }
        const { db, basePath, isMockMode } = state;
        const { role, uid } = this.currentUserProfile;

        if (isMockMode) {
            const index = this.mockStudents.findIndex(s => s.id === student.id);
            if (index > -1) {
                this.mockStudents[index] = student;
                this.mockDataStream$.next([...this.mockStudents]);
            }
            return of(undefined);
        }

        // Un docente solo puede actualizar estudiantes en su propia colección.
        // Un líder podría actualizar en la colección pública (si las reglas lo permiten).
        const docPath = role === 'lider'
            ? `${basePath}/public/data/students/${student.id}`
            : `${basePath}/users/${uid}/students/${student.id}`;
        
        const { id, ...data } = student;
        return from(updateDoc(doc(db, docPath), data));
    }

    /**
     * CORREGIDO: Lógica completa para eliminar un estudiante.
     */
    deleteStudent(id: string): Observable<void> {
        const state = this.firestoreReady$.getValue();
        if (!state || !this.currentUserProfile) {
            return throwError(() => new Error('No autorizado o servicio no listo.'));
        }
        const { db, basePath, isMockMode } = state;
        const { role, uid } = this.currentUserProfile;

        if (isMockMode) {
            this.mockStudents = this.mockStudents.filter(s => s.id !== id);
            this.mockDataStream$.next([...this.mockStudents]);
            return of(undefined);
        }

        const docPath = role === 'lider'
            ? `${basePath}/public/data/students/${id}`
            : `${basePath}/users/${uid}/students/${id}`;
            
        return from(deleteDoc(doc(db, docPath)));
    }
    
    getDesertionRate(): Observable<number> {
        const studentsForRate$ = this.getStudents();
        return combineLatest([studentsForRate$, this.schoolContext$]).pipe(
            map(([students, context]) => this.calculateSystemDesertionRate(students, context)),
            shareReplay(1)
        );
    }

    runSimulation(studentsForTutoring: number, parentWorkshops: number, psychologyHours: number): Observable<SimulationResult> {
        let rateReduction = (studentsForTutoring / 20) * 0.2 + (parentWorkshops / 5) * 0.1 + (psychologyHours / 40) * 0.15;
        return this.getDesertionRate().pipe(
            map((currentRate: number) => {
                const simulatedRate = parseFloat(Math.max(0, currentRate - rateReduction).toFixed(2));
                const reduction = parseFloat((currentRate - simulatedRate).toFixed(2));
                const totalCost = (studentsForTutoring * 5) + (parentWorkshops * 20) + (psychologyHours * 10);
                return { initialRate: currentRate, simulatedRate, cost: totalCost, reduction };
            })
        );
    }
    
    private async saveNewUserToFirestore(data: Omit<Student, 'id'>, collectionPath: string, db: Firestore): Promise<Student> {
      const docRef = await addDoc(collection(db, collectionPath), data);
      return { ...data, id: docRef.id };
    }

    private handleError(error: any): Observable<never> {
        console.error('DataService Error:', error);
        return throwError(() => new Error('Ocurrió un error en la operación de datos.'));
    }

    private generateInitialMockStudents(): Student[] {
        return [
            { id: 'mock-101', studentId: '12345', name: 'Ana Gutiérrez (MOCK)', grade: 10, riskFactor: 'Alto', academicAverage: 2.7, economicStatus: 'Vulnerable', absencesLastMonth: 5, ownerId: 'mock-teacher-uid' },
            { id: 'mock-102', studentId: '67890', name: 'Pedro López (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.5, economicStatus: 'Estable', absencesLastMonth: 2, ownerId: 'mock-teacher-uid' },
            { id: 'mock-103', studentId: '54321', name: 'Marta Díaz (MOCK)', grade: 9, riskFactor: 'Bajo', academicAverage: 4.5, economicStatus: 'Estable', absencesLastMonth: 0, ownerId: 'another-teacher-uid' },
            { id: 'mock-101', studentId: '12345', name: 'Ana Gutiérrez (MOCK)', grade: 10, riskFactor: 'Alto', academicAverage: 2.7, economicStatus: 'Vulnerable', absencesLastMonth: 5, ownerId: 'mock-teacher-uid' },
            { id: 'mock-102', studentId: '67890', name: 'Pedro López (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.5, economicStatus: 'Estable', absencesLastMonth: 2, ownerId: 'mock-teacher-uid' },
            { id: 'mock-103', studentId: '11223', name: 'Laura Martínez (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.2, economicStatus: 'Estable', absencesLastMonth: 1, ownerId: 'mock-teacher-uid' },
            { id: 'mock-104', studentId: '33445', name: 'Carlos Ramírez (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.4, economicStatus: 'Vulnerable', absencesLastMonth: 6, ownerId: 'mock-teacher-uid' },
            { id: 'mock-105', studentId: '55667', name: 'Sofía Herrera (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.1, economicStatus: 'Estable', absencesLastMonth: 3, ownerId: 'mock-teacher-uid' },
            { id: 'mock-106', studentId: '77889', name: 'Julián Pérez (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.5, economicStatus: 'Estable', absencesLastMonth: 0, ownerId: 'mock-teacher-uid' },
            { id: 'mock-107', studentId: '99001', name: 'Daniela Torres (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.6, economicStatus: 'Vulnerable', absencesLastMonth: 7, ownerId: 'mock-teacher-uid' },
            { id: 'mock-108', studentId: '22334', name: 'Andrés Gómez (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.3, economicStatus: 'Estable', absencesLastMonth: 2, ownerId: 'mock-teacher-uid' },
            { id: 'mock-109', studentId: '44556', name: 'Camila Díaz (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.0, economicStatus: 'Estable', absencesLastMonth: 1, ownerId: 'mock-teacher-uid' },
            { id: 'mock-110', studentId: '66778', name: 'Mateo Castro (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.3, economicStatus: 'Vulnerable', absencesLastMonth: 8, ownerId: 'mock-teacher-uid' },
            { id: 'mock-111', studentId: '88990', name: 'Valentina Rojas (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.4, economicStatus: 'Estable', absencesLastMonth: 3, ownerId: 'mock-teacher-uid' },
            { id: 'mock-112', studentId: '99012', name: 'Sebastián Cárdenas (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.3, economicStatus: 'Estable', absencesLastMonth: 1, ownerId: 'mock-teacher-uid' },
            { id: 'mock-113', studentId: '10113', name: 'Mariana Suárez (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.5, economicStatus: 'Vulnerable', absencesLastMonth: 6, ownerId: 'mock-teacher-uid' },
            { id: 'mock-114', studentId: '20224', name: 'Felipe Vargas (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.2, economicStatus: 'Estable', absencesLastMonth: 2, ownerId: 'mock-teacher-uid' },
            { id: 'mock-115', studentId: '30335', name: 'Isabella León (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.6, economicStatus: 'Estable', absencesLastMonth: 0, ownerId: 'mock-teacher-uid' },
            { id: 'mock-116', studentId: '40446', name: 'Tomás Herrera (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.8, economicStatus: 'Vulnerable', absencesLastMonth: 5, ownerId: 'mock-teacher-uid' },
            { id: 'mock-117', studentId: '50557', name: 'Natalia Ruiz (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.6, economicStatus: 'Estable', absencesLastMonth: 2, ownerId: 'mock-teacher-uid' },
            { id: 'mock-118', studentId: '60668', name: 'David Jiménez (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.4, economicStatus: 'Estable', absencesLastMonth: 1, ownerId: 'mock-teacher-uid' },
            { id: 'mock-119', studentId: '70779', name: 'Lucía Méndez (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.2, economicStatus: 'Vulnerable', absencesLastMonth: 9, ownerId: 'mock-teacher-uid' },
            { id: 'mock-120', studentId: '80880', name: 'Samuel Ortiz (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.0, economicStatus: 'Estable', absencesLastMonth: 4, ownerId: 'mock-teacher-uid' },
            { id: 'mock-121', studentId: '90991', name: 'Paula Castaño (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.1, economicStatus: 'Estable', absencesLastMonth: 1, ownerId: 'mock-teacher-uid' },
            { id: 'mock-122', studentId: '11114', name: 'Juan Esteban Gil (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.9, economicStatus: 'Vulnerable', absencesLastMonth: 7, ownerId: 'mock-teacher-uid' },
            { id: 'mock-123', studentId: '12125', name: 'Emily Rodríguez (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.3, economicStatus: 'Estable', absencesLastMonth: 3, ownerId: 'mock-teacher-uid' },
            { id: 'mock-124', studentId: '13136', name: 'Gabriel Salazar (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.7, economicStatus: 'Estable', absencesLastMonth: 0, ownerId: 'mock-teacher-uid' },
            { id: 'mock-125', studentId: '14147', name: 'Sara Molina (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.1, economicStatus: 'Vulnerable', absencesLastMonth: 10, ownerId: 'mock-teacher-uid' },
            { id: 'mock-126', studentId: '15158', name: 'Miguel Ángel Ruiz (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.7, economicStatus: 'Estable', absencesLastMonth: 2, ownerId: 'mock-teacher-uid' },
            { id: 'mock-127', studentId: '16169', name: 'Adriana Páez (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.5, economicStatus: 'Estable', absencesLastMonth: 1, ownerId: 'mock-teacher-uid' },
            { id: 'mock-128', studentId: '17170', name: 'Diego Torres (MOCK)', grade: 9, riskFactor: 'Alto', academicAverage: 2.5, economicStatus: 'Vulnerable', absencesLastMonth: 8, ownerId: 'mock-teacher-uid' },
            { id: 'mock-129', studentId: '18181', name: 'Camila Pineda (MOCK)', grade: 10, riskFactor: 'Medio', academicAverage: 3.2, economicStatus: 'Estable', absencesLastMonth: 3, ownerId: 'mock-teacher-uid' },
            { id: 'mock-130', studentId: '19192', name: 'Nicolás Peña (MOCK)', grade: 11, riskFactor: 'Bajo', academicAverage: 4.6, economicStatus: 'Estable', absencesLastMonth: 0, ownerId: 'mock-teacher-uid' }


        ];
    }
    
    private simulateSaveNewUser(data: Omit<Student, 'id'>, userId: string): Observable<Student> {
        const newStudent: Student = { ...data, id: `mock-${Date.now()}`, ownerId: userId };
        this.mockStudents = [...this.mockStudents, newStudent];
        this.mockDataStream$.next(this.mockStudents);
        return of(newStudent);
    }
    
    getSchoolContext(): Observable<SchoolContext> { return this.schoolContext$.asObservable(); }
    setSchoolContext(context: SchoolContext): void { this.schoolContext$.next(context); }

    // Métodos placeholder para novedades
    addAttendance(data: Omit<Attendance, 'id'>): Observable<void> { console.log('Guardando asistencia:', data); return of(undefined); }
    addGrade(data: Omit<Grade, 'id'>): Observable<void> { console.log('Guardando nota:', data); return of(undefined); }
    addObservation(data: Omit<Observation, 'id'>): Observable<void> { console.log('Guardando observación:', data); return of(undefined); }
    addStudentFeedback(data: Omit<StudentFeedback, 'id'>): Observable<void> { console.log('Guardando feedback:', data); return of(undefined); }
}

