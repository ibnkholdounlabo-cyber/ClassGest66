export type EducationalLevel = '1' | '2' | '3' | '4';
export type EducationalSection = 'Lettres' | 'Économie' | 'Sciences' | 'Technique' | 'Mathématiques' | 'Commun' | 'Informatique';
export type ResourceType = 'cours' | 'exercice' | 'examen';

export interface AttachedFile {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  level: string; // '1' | '2' | '3' | '4' or descriptive string
  section?: string; // 'Lettres' | 'Économie' | 'Sciences' | 'Technique' | 'Mathématiques' | 'Commun' | 'Informatique'
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
  educationalLevel?: string;
  section?: string;
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
  resourceType?: ResourceType; // 'cours' | 'exercice' | 'examen'
  level?: string; // '1' | '2' | '3' | '4'
  section?: string; // 'Lettres' | 'Économie' | 'Sciences' | 'Technique' | 'Mathématiques' | 'Commun' | 'Informatique'
  attachedFiles?: AttachedFile[];
  createdAt: string;
}

export interface TypingTest {
  id: string;
  classId: string;
  classIds?: string[];
  title: string;
  theme: 'Word' | 'Excel' | 'Python' | 'Général';
  level: number;
  educationalLevel?: string; // '1' | '2' | '3' | '4'
  section?: string;
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
  level?: string; // '1' | '2' | '3' | '4'
  section?: string; // 'Lettres' | 'Économie' | 'Sciences' | 'Technique' | 'Mathématiques' | 'Commun' | 'Informatique'
  createdAt: string;
  questionCount?: number;
  submissionsCount?: number;
  questions?: QCMQuestion[];
}

export interface QCMAttempt {
  id: string;
  qcmId: string;
  qcmTitle: string;
  studentId: string;
  studentName?: string;
  classId: string;
  className?: string;
  level?: string;
  section?: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  successRate: number; // % (0 - 100)
  totalScore: number;
  maxScore: number;
  score20: number; // Note sur 20
  timeSpentSeconds: number;
  completedAt: string; // ISO date-time
  answersJson?: Record<string, { chosen: 'A' | 'B' | 'C' | 'D' | ''; isCorrect: boolean; pointsEarned: number }>;
}

export interface QCMQuestionAnalysis {
  questionId: string;
  questionOrder: number;
  questionText: string;
  qcmId: string;
  qcmTitle: string;
  category?: string;
  level?: string;
  section?: string;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  successRate: number; // %
  failureRate: number; // %
  difficultyLevel: 'facile' | 'moyen' | 'difficile';
  optionCounts?: Record<string, number>;
}

export interface QCMGlobalStats {
  totalAttempts: number;
  averageScore20: number;
  averageSuccessRate: number;
  totalQcms: number;
  questionsAnalysis: QCMQuestionAnalysis[];
  attempts: QCMAttempt[];
}

export interface QCMSubmission {
  id: string;
  qcmId: string;
  studentId: string;
  classId: string;
  className?: string;
  totalScore: number;
  maxScore: number;
  score20: number;
  answersJson: Record<string, { chosen: 'A' | 'B' | 'C' | 'D' | ''; isCorrect: boolean; pointsEarned: number }>;
  timeSpentSeconds: number;
  completedAt: string;
  studentName?: string;
  studentNumber?: string;
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
  submissions: Array<QCMSubmission & { studentName: string; studentNumber: string; className?: string }>;
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
  markedByStudentAt?: string;
  activityFileUrl?: string;
  activityFileName?: string;
  activityFileType?: string;
  activityFileSize?: number;
  activityUploadedAt?: string;
  updatedAt: string;
  studentName?: string;
  studentNumber?: string;
  isRepeating?: boolean;
}

export interface StudentTodayAttendance {
  date: string;
  session: AttendanceSession | null;
  record: AttendanceRecord | null;
  hasMarkedToday: boolean;
  markedAt?: string;
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
  qcmStats?: {
    totalAttempts: number;
    averageScore20: number;
    successRate: number;
    passedCount: number;
    attempts: QCMAttempt[];
  };
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
  totalAbsences?: number;
  totalLate?: number;
  totalExcused?: number;
  totalNoNotebook: number;
  totalExcluded: number;
  totalUnprepared: number;
  totalChatter: number;
  totalMissingMaterial: number;
  totalPositive: number;
  averageScore: number;
  globalCounts?: {
    absence_cahier: number;
    exclu: number;
    oubli_materiel: number;
    travail_non_fait: number;
    bavardage: number;
    participation: number;
    travail_serieux: number;
    absences?: number;
    retards?: number;
    excuses?: number;
  };
  studentSummaries?: Array<{
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
    isRepeating: boolean;
    totalScore: number;
    absentCount: number;
    excusedCount: number;
    lateCount: number;
    presentCount: number;
    totalAbsences: number;
    attendanceRate: number;
    optionCounts: {
      absence_cahier: number;
      exclu: number;
      oubli_materiel: number;
      travail_non_fait: number;
      bavardage: number;
      participation: number;
      travail_serieux: number;
    };
    lastNotes?: string;
  }>;
  studentStats: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
    isRepeating: boolean;
    cumulativeScore: number;
    absentCount?: number;
    excusedCount?: number;
    lateCount?: number;
    presentCount?: number;
    totalAbsences?: number;
    attendanceRate?: number;
    noNotebookCount: number;
    excludedCount: number;
    unpreparedCount: number;
    chatterCount: number;
    missingMaterialCount: number;
    positiveCount: number;
    lastObservation?: string;
  }>;
}

export interface StudentSessionHistoryItem {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  activityFileUrl?: string;
  activityFileName?: string;
  activityFileType?: string;
  activityFileSize?: number;
  activityUploadedAt?: string;
}

export interface StudentTypingHistoryItem {
  testId: string;
  testTitle: string;
  score: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  mistakesCount: number;
  passed: boolean;
  completedAt: string;
}

export interface StudentQCMHistoryItem {
  qcmId: string;
  qcmTitle: string;
  score20: number;
  totalScore: number;
  maxScore: number;
  timeSpentSeconds: number;
  completedAt: string;
}

export interface StudentFinalReport {
  studentId: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  isRepeating: boolean;
  // Frappe (Typing)
  typingTestsCount: number;
  typingAverageScore: number;
  typingAverageWpm: number;
  typingAverageAccuracy: number;
  typingTotalScore: number;
  typingHistory: StudentTypingHistoryItem[];
  // QCM
  qcmCount: number;
  qcmAverageScore20: number;
  qcmTotalScore: number;
  qcmHistory: StudentQCMHistoryItem[];
  // Total & Combined
  totalCombinedScore: number;
  overallAverage20: number;
  // Séances & Attendance
  sessionsCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  attachedFilesCount: number;
  attachedFiles: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    uploadedAt: string;
    sessionTitle: string;
    sessionDate: string;
  }>;
  sessionsHistory: StudentSessionHistoryItem[];
}

export interface TrimesterFinalReport {
  trimester: number; // 0 for all/annual, 1, 2, 3
  name: string; // e.g. "Trimestre 1 (Sep - Déc)"
  period: string;
  totalSessions: number;
  totalTypingTests: number;
  totalQcms: number;
  classAverageTypingScore: number;
  classAverageWpm: number;
  classAverageAccuracy: number;
  classAverageQCMScore: number;
  classAverageTotalScore: number;
  classAverageOverall20: number;
  classAttendanceRate: number;
  totalAttachedFilesCount: number;
  studentReports: StudentFinalReport[];
}

export interface ClassFinalReport {
  classInfo: ClassGroup;
  generatedAt: string;
  trimesters: {
    annual: TrimesterFinalReport;
    t1: TrimesterFinalReport;
    t2: TrimesterFinalReport;
    t3: TrimesterFinalReport;
  };
}

