export interface ClassGroup {
  id: string;
  name: string;
  level: string;
  academicYear: string;
  room?: string;
  description?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  classId: string;
  className?: string;
  level?: string;
  academicYear?: string;
  room?: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  birthDate?: string;
  email?: string;
  password?: string; // Visible to teacher, hidden in public APIs
  hasChangedPassword: boolean;
  isRepeating?: boolean; // Nouveau (false) ou Redoublant (true)
  notes?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface PublicStudentInfo {
  id: string;
  classId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  studentNumber: string;
  isRepeating?: boolean;
}


export interface TeacherUser {
  username: string;
  fullName: string;
  email: string;
  role: 'teacher';
}

export interface AuthStudentSession {
  token: string;
  student: Student;
  classInfo: ClassGroup;
  loginTime?: number;
  expiresAt?: number;
  durationMinutes?: number;
}

export interface AuthTeacherSession {
  token: string;
  teacher: TeacherUser;
  loginTime?: number;
  expiresAt?: number;
  durationMinutes?: number;
}

export interface SessionStatus {
  valid: boolean;
  role?: 'teacher' | 'student';
  id?: string;
  name?: string;
  createdAt?: number;
  expiresAt?: number;
  remainingSeconds?: number;
  remainingMinutes?: number;
  durationMinutes?: number;
  error?: string;
}

export interface Course {
  id: string;
  classId: string;
  classIds?: string[];
  title: string;
  category: 'Word' | 'Excel' | 'Python' | 'Général';
  description?: string;
  content: string;
  resourceLink?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
}

export interface TypingTest {
  id: string;
  classId: string;
  classIds?: string[];
  title: string;
  theme: 'Word' | 'Excel' | 'Python' | 'Général';
  level: number;
  timeLimitSeconds: number;
  targetText: string;
  minAccuracyPercent: number;
  minWpm: number;
  description?: string;
  createdAt: string;
}

export interface TestEvaluation {
  id: string;
  testId: string;
  studentId: string;
  classId: string;
  wpm: number;
  cpm: number;
  accuracy: number;
  mistakesCount: number;
  timeSpentSeconds: number;
  passed: boolean;
  score: number; // Note sur 20
  completedAt: string;
  studentName?: string;
  testTitle?: string;
  testLevel?: number;
  testTheme?: string;
}

export interface StudentTestStatus {
  test: TypingTest;
  isUnlocked: boolean;
  bestEvaluation?: TestEvaluation;
}

export interface ClassEvaluationsSummary {
  totalSubmissions: number;
  passedCount: number;
  passRate: number;
  averageWpm: number;
  averageAccuracy: number;
  averageScore: number;
  evaluations: TestEvaluation[];
  studentSummaries: Array<{
    student: Student;
    totalTestsAttempted: number;
    testsPassedCount: number;
    averageScore: number;
    bestWpm: number;
    evaluations: TestEvaluation[];
  }>;
}

export interface QCMQuestion {
  id: string;
  qcmId: string;
  questionOrder: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  points: number;
  explanation?: string;
}

export interface QCM {
  id: string;
  classId: string;
  classIds?: string[];
  title: string;
  description?: string;
  category: 'Word' | 'Excel' | 'Python' | 'Général';
  durationMinutes: number; // 0 = non chronométré
  totalPoints: number;
  isActive: boolean;
  createdAt: string;
  questionCount?: number;
  submissionsCount?: number;
  questions?: QCMQuestion[];
}

export interface QCMSubmission {
  id: string;
  qcmId: string;
  studentId: string;
  classId: string;
  totalScore: number;
  maxScore: number;
  score20: number;
  answersJson: Record<string, { chosen: 'A' | 'B' | 'C' | 'D' | ''; isCorrect: boolean; pointsEarned: number }>;
  timeSpentSeconds: number;
  completedAt: string;
  studentName?: string;
  qcmTitle?: string;
  isPractice?: boolean;
  officialScore20?: number;
}

export interface StudentQCMStatus {
  qcm: QCM;
  isCompleted: boolean;
  submission?: QCMSubmission;
}

export interface QCMEvaluationSummary {
  qcm: QCM;
  totalSubmissions: number;
  averageScore20: number;
  highestScore20: number;
  lowestScore20: number;
  submissions: Array<QCMSubmission & { studentName: string; studentNumber: string }>;
  questionStats: Array<{
    questionId: string;
    questionOrder: number;
    questionText: string;
    totalAnswers: number;
    correctAnswers: number;
    successRate: number;
  }>;
}

// ==========================================
// ATTENDANCE / PRÉSENCES TYPES
// ==========================================
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceDisciplineOption {
  id: string;
  label: string;
  score: number; // ex: -1, -3, +1
  category?: 'negative' | 'positive' | 'neutral';
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
  optionsJson?: string;
  score?: number;
  options?: AttendanceDisciplineOption[];
  updatedAt: string;
  studentName?: string;
  studentNumber?: string;
  isRepeating?: boolean;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  notes?: string;
  createdAt: string;
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
  excusedCount?: number;
  records?: AttendanceRecord[];
}

export interface StudentAttendanceSummary {
  studentId: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  isRepeating: boolean;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  presenceRate?: number;
  disciplineScore?: number;
  noNotebookCount?: number;
  excludedCount?: number;
}

export interface ClassDisciplineStats {
  totalSessions: number;
  totalNoNotebook: number;
  totalExcluded: number;
  totalUnprepared: number;
  totalChatter: number;
  totalMissingMaterial: number;
  totalPositive: number;
  averageScore: number;
  studentStats: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
    isRepeating: boolean;
    cumulativeScore: number;
    noNotebookCount: number;
    excludedCount: number;
    unpreparedCount: number;
    chatterCount: number;
    missingMaterialCount: number;
    positiveCount: number;
    lastObservation?: string;
  }>;
}

