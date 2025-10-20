// --- Modelo de Perfil de Usuario ---
export interface UserProfile {
    uid: string;
    email: string | null;
    name?: string;
    role: 'docente' | 'estudiante' | 'lider' | 'pendiente'; // 'pendiente' para usuarios recién registrados
    assignedGrade?: number; // Para docentes
    studentId?: string; // Para estudiantes (número de identificación único, ej: T.I.)
}


// --- Modelo Principal del Estudiante ---
export interface Student {
    id: string; // ID del documento en Firestore
    studentId: string; // Número de identificación del estudiante
    name: string;
    grade: number;
    riskFactor: 'Alto' | 'Medio' | 'Bajo';
    academicAverage: number;
    economicStatus: 'Vulnerable' | 'Estable';
    absencesLastMonth: number;
    ownerId: string; // UID del docente que lo registró
}

// --- Modelo para el formulario de creación de Estudiante ---
export interface NewStudentForm {
    name: string;
    studentId: string; // Se añade el ID del estudiante
    grade: number;
    academicAverage: number;
    absencesLastMonth: number;
    economicStatus?: 'Vulnerable' | 'Estable';
}


// --- Modelos para Novedades y Feedback ---

export interface Attendance {
    id: string; // ID del documento
    studentId: string;
    date: Date;
    status: 'presente' | 'ausente' | 'justificado';
    subjectId?: string; // Opcional, si se registra por materia
    recordedById: string; // UID del docente que registra
}

export interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    gradeValue: number;
    period: number; // Ej: 1, 2, 3, 4
    description?: string;
    recordedById: string;
}

export interface Observation {
    id: string;
    studentId: string;
    date: Date;
    text: string;
    category: 'academica' | 'comportamiento' | 'familiar' | 'positiva';
    recordedById: string;
}

export interface StudentFeedback {
    id: string;
    studentId: string; // ID de negocio del estudiante
    studentAuthId: string; // UID de autenticación del estudiante
    date: Date;
    feeling: string; // 'Bien', 'Regular', 'Mal', etc.
    suggestion: string;
    category: 'convivencia' | 'academico' | 'instalaciones' | 'otro';
}


// --- Modelo para el Simulador ---
export interface SimulationResult {
    initialRate: number;
    simulatedRate: number;
    cost: number;
    reduction: number;
}

