import {
  ClassGroup,
  Student,
  PublicStudentInfo,
  TeacherUser,
  Course,
  TypingTest,
  TestEvaluation,
  StudentTestStatus,
  ClassEvaluationsSummary,
  QCM,
  QCMQuestion,
  QCMSubmission,
  StudentQCMStatus,
  QCMEvaluationSummary,
  AttendanceStatus,
  AttendanceRecord,
  AttendanceSession,
  StudentAttendanceSummary,
  ClassDisciplineStats,
  SessionStatus,
  StudentTodayAttendance
} from './types';

const API_BASE = '/api';

/**
 * Safely fetches and parses JSON responses from the intranet API.
 * Never throws "Unexpected token '<', <html>..." even if the server returns HTML.
 */
async function safeFetchJson<T>(
  url: string,
  init?: RequestInit,
  defaultErrorMessage = 'Erreur de communication avec le serveur'
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err: any) {
    throw new Error('Connexion au serveur intranet impossible. Vérifiez que le serveur local est actif.');
  }

  const contentType = res.headers.get('content-type') || '';
  let payload: any = null;

  if (contentType.includes('application/json')) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  } else {
    // Non-JSON response (HTML page or error page)
    await res.text().catch(() => '');
    if (!res.ok) {
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('intranet:session_expired', {
              detail: { message: 'Votre session de 30 minutes est expirée. Veuillez vous reconnecter.' }
            })
          );
        }
        throw new Error('Session expirée (durée maximale : 30 minutes). Veuillez vous reconnecter.');
      }
      if (res.status === 403) {
        throw new Error('Accès refusé ou privilèges insuffisants.');
      }
      if (res.status === 404) {
        throw new Error('Ressource introuvable sur le serveur intranet.');
      }
      if (res.status >= 500) {
        throw new Error('Le serveur intranet est temporairement indisponible.');
      }
      throw new Error(defaultErrorMessage);
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('intranet:session_expired', {
            detail: { message: payload?.error || 'Votre session de 30 minutes est expirée. Veuillez vous reconnecter.' }
          })
        );
      }
      throw new Error(payload?.error || 'Session expirée (durée maximale : 30 minutes). Veuillez vous reconnecter.');
    }
    if (res.status === 403) {
      throw new Error(payload?.error || 'Accès refusé pour cette opération.');
    }
    const message = payload?.error || defaultErrorMessage;
    throw new Error(message);
  }

  return payload as T;
}

export const api = {
  // Public
  async getPublicClasses(): Promise<Array<ClassGroup & { studentCount: number }>> {
    return safeFetchJson<Array<ClassGroup & { studentCount: number }>>(
      `${API_BASE}/public/classes`,
      undefined,
      'Impossible de charger la liste des classes'
    );
  },

  async getPublicStudents(classId: string): Promise<PublicStudentInfo[]> {
    return safeFetchJson<PublicStudentInfo[]>(
      `${API_BASE}/public/classes/${classId}/students`,
      undefined,
      'Impossible de charger la liste des élèves'
    );
  },

  // Session & Authentication
  async getSessionStatus(token: string): Promise<SessionStatus> {
    return safeFetchJson<SessionStatus>(
      `${API_BASE}/auth/session/status`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de vérifier l’état de la session'
    );
  },

  // Student Auth
  async studentLogin(classId: string, studentId: string, password: string) {
    return safeFetchJson<{
      token: string;
      profile: Student;
      classInfo: ClassGroup;
      expiresAt?: number;
      expiresIn?: number;
      durationMinutes?: number;
    }>(
      `${API_BASE}/auth/student/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, studentId, password })
      },
      'Identifiants élève invalides'
    );
  },

  async getStudentProfile(token: string): Promise<Student> {
    return safeFetchJson<Student>(
      `${API_BASE}/student/me`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur de récupération du profil élève'
    );
  },

  async studentChangePassword(token: string, oldPassword: string, newPassword: string) {
    return safeFetchJson(
      `${API_BASE}/student/change-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      },
      'Modification non autorisée'
    );
  },

  // Teacher Auth
  async teacherLogin(username: string, password: string) {
    return safeFetchJson<{
      token: string;
      teacher: TeacherUser;
      expiresAt?: number;
      expiresIn?: number;
      durationMinutes?: number;
    }>(
      `${API_BASE}/auth/teacher/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      },
      'Identifiant ou mot de passe professeur incorrect'
    );
  },

  async teacherGetClasses(token: string): Promise<Array<ClassGroup & { studentCount: number }>> {
    return safeFetchJson<Array<ClassGroup & { studentCount: number }>>(
      `${API_BASE}/teacher/classes`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger les classes'
    );
  },

  async teacherCreateClass(
    token: string,
    classData: {
      name: string;
      level: string;
      academicYear: string;
      room?: string;
      description?: string;
    }
  ): Promise<ClassGroup> {
    return safeFetchJson<ClassGroup>(
      `${API_BASE}/teacher/classes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(classData)
      },
      'Erreur lors de la création de la classe'
    );
  },

  async teacherDeleteClass(token: string, classId: string) {
    return safeFetchJson(
      `${API_BASE}/teacher/classes/${classId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur lors de la suppression de la classe'
    );
  },

  async teacherGetStudents(token: string, classId: string): Promise<Student[]> {
    return safeFetchJson<Student[]>(
      `${API_BASE}/teacher/classes/${classId}/students`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger les élèves de la classe'
    );
  },

  async teacherCreateStudent(
    token: string,
    classId: string,
    studentData: {
      firstName: string;
      lastName: string;
      studentNumber?: string;
      birthDate?: string;
      email?: string;
      customPassword?: string;
      notes?: string;
      isRepeating?: boolean;
    }
  ): Promise<Student> {
    return safeFetchJson<Student>(
      `${API_BASE}/teacher/classes/${classId}/students`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(studentData)
      },
      'Erreur lors de la création de l’élève'
    );
  },

  async teacherImportStudents(
    token: string,
    classId: string,
    students: Array<{
      firstName: string;
      lastName: string;
      birthDate?: string;
      email?: string;
      studentNumber?: string;
      notes?: string;
      isRepeating?: boolean;
    }>
  ) {
    return safeFetchJson<{ success: boolean; count: number; added: Student[] }>(
      `${API_BASE}/teacher/classes/${classId}/students/import`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ students })
      },
      'Erreur lors de l’importation des élèves'
    );
  },

  async teacherRegeneratePassword(token: string, studentId: string) {
    return safeFetchJson<{ success: boolean; studentId: string; newPassword: string }>(
      `${API_BASE}/teacher/students/${studentId}/regenerate-password`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur lors de la régénération du mot de passe'
    );
  },

  async teacherSetPassword(token: string, studentId: string, password: string) {
    return safeFetchJson(
      `${API_BASE}/teacher/students/${studentId}/set-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      },
      'Erreur lors de la mise à jour du mot de passe'
    );
  },

  async teacherUpdateStudent(
    token: string,
    studentId: string,
    data: Partial<Student> & { password?: string }
  ): Promise<Student> {
    return safeFetchJson<Student>(
      `${API_BASE}/teacher/students/${studentId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      },
      'Erreur lors de la modification des informations de l’élève'
    );
  },

  async teacherDeleteStudent(token: string, studentId: string) {
    return safeFetchJson(
      `${API_BASE}/teacher/students/${studentId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur lors de la suppression de l’élève'
    );
  },

  // ==========================================
  // COURSES (COURS)
  // ==========================================
  async getCourses(token: string, classId: string): Promise<Course[]> {
    return safeFetchJson<Course[]>(
      `${API_BASE}/classes/${classId}/courses`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger les cours'
    );
  },

  async teacherCreateCourse(
    token: string,
    classId: string,
    courseData: {
      title: string;
      category: 'Word' | 'Excel' | 'Python' | 'Général';
      description?: string;
      content: string;
      resourceLink?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      classIds?: string[];
    }
  ): Promise<Course> {
    return safeFetchJson<Course>(
      `${API_BASE}/teacher/classes/${classId}/courses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(courseData)
      },
      'Erreur lors de la publication du cours'
    );
  },

  async teacherUpdateCourse(
    token: string,
    courseId: string,
    courseData: Partial<Course> & { classIds?: string[] }
  ): Promise<Course> {
    return safeFetchJson<Course>(
      `${API_BASE}/teacher/courses/${courseId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(courseData)
      },
      'Erreur lors de la mise à jour du cours'
    );
  },

  async teacherDeleteCourse(token: string, courseId: string) {
    return safeFetchJson(
      `${API_BASE}/teacher/courses/${courseId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur lors de la suppression du cours'
    );
  },

  // ==========================================
  // TESTS DE RAPIDITÉ & ÉVALUATIONS
  // ==========================================
  async getTests(token: string, classId: string): Promise<TypingTest[]> {
    return safeFetchJson<TypingTest[]>(
      `${API_BASE}/classes/${classId}/tests`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger les tests'
    );
  },

  async teacherCreateTest(
    token: string,
    classId: string,
    testData: {
      title: string;
      theme: 'Word' | 'Excel' | 'Python' | 'Général';
      level: number;
      timeLimitSeconds: number;
      targetText: string;
      minAccuracyPercent?: number;
      minWpm?: number;
      description?: string;
      classIds?: string[];
    }
  ): Promise<TypingTest> {
    return safeFetchJson<TypingTest>(
      `${API_BASE}/teacher/classes/${classId}/tests`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(testData)
      },
      'Erreur lors de la création du test'
    );
  },

  async teacherUpdateTest(
    token: string,
    testId: string,
    testData: Partial<TypingTest> & { classIds?: string[] }
  ): Promise<TypingTest> {
    return safeFetchJson<TypingTest>(
      `${API_BASE}/teacher/tests/${testId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(testData)
      },
      'Erreur lors de la mise à jour du test'
    );
  },

  async teacherDeleteTest(token: string, testId: string) {
    return safeFetchJson(
      `${API_BASE}/teacher/tests/${testId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur lors de la suppression du test'
    );
  },

  async getStudentTestsProgress(token: string, classId: string): Promise<StudentTestStatus[]> {
    return safeFetchJson<StudentTestStatus[]>(
      `${API_BASE}/student/classes/${classId}/tests-progress`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger les tests et niveaux'
    );
  },

  async submitTestEvaluation(
    token: string,
    testId: string,
    stats: {
      wpm: number;
      cpm: number;
      accuracy: number;
      mistakesCount: number;
      timeSpentSeconds: number;
    }
  ): Promise<{ evaluation: TestEvaluation; passed: boolean; nextLevelUnlocked: boolean }> {
    return safeFetchJson<{ evaluation: TestEvaluation; passed: boolean; nextLevelUnlocked: boolean }>(
      `${API_BASE}/student/tests/${testId}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(stats)
      },
      'Erreur lors de l’enregistrement de l’évaluation'
    );
  },

  async getClassEvaluations(token: string, classId: string): Promise<ClassEvaluationsSummary> {
    return safeFetchJson<ClassEvaluationsSummary>(
      `${API_BASE}/teacher/classes/${classId}/evaluations`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger les évaluations de la classe'
    );
  },

  // ==========================================
  // QCM (QUESTIONNAIRES & QUIZ)
  // ==========================================
  async getQCMs(token: string, classId: string): Promise<QCM[]> {
    return safeFetchJson<QCM[]>(
      `${API_BASE}/classes/${classId}/qcms`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger la liste des QCM'
    );
  },

  async getQCMById(token: string, qcmId: string): Promise<QCM> {
    return safeFetchJson<QCM>(
      `${API_BASE}/qcms/${qcmId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger le QCM'
    );
  },

  async teacherCreateQCM(
    token: string,
    classId: string,
    qcmData: {
      title: string;
      description?: string;
      category?: 'Word' | 'Excel' | 'Python' | 'Général';
      durationMinutes?: number;
      totalPoints?: number;
      isActive?: boolean;
      classIds?: string[];
    }
  ): Promise<QCM> {
    return safeFetchJson<QCM>(
      `${API_BASE}/teacher/classes/${classId}/qcms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(qcmData)
      },
      'Erreur lors de la création du QCM'
    );
  },

  async teacherUpdateQCM(
    token: string,
    qcmId: string,
    qcmData: Partial<{
      title: string;
      description: string;
      category: 'Word' | 'Excel' | 'Python' | 'Général';
      durationMinutes: number;
      totalPoints: number;
      isActive: boolean;
      classIds: string[];
    }>
  ): Promise<QCM> {
    return safeFetchJson<QCM>(
      `${API_BASE}/teacher/qcms/${qcmId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(qcmData)
      },
      'Erreur lors de la mise à jour du QCM'
    );
  },

  async teacherDeleteQCM(token: string, qcmId: string) {
    return safeFetchJson(
      `${API_BASE}/teacher/qcms/${qcmId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur lors de la suppression du QCM'
    );
  },

  async teacherImportQCMQuestions(
    token: string,
    qcmId: string,
    rawText: string,
    replaceExisting = true
  ): Promise<QCM> {
    return safeFetchJson<QCM>(
      `${API_BASE}/teacher/qcms/${qcmId}/questions/import`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rawText, replaceExisting })
      },
      'Erreur lors de l’importation des questions du QCM'
    );
  },

  async teacherAddQCMQuestion(
    token: string,
    qcmId: string,
    questionData: {
      questionText: string;
      optionA: string;
      optionB: string;
      optionC?: string;
      optionD?: string;
      correctOption: 'A' | 'B' | 'C' | 'D';
      points?: number;
      explanation?: string;
    }
  ): Promise<QCMQuestion> {
    return safeFetchJson<QCMQuestion>(
      `${API_BASE}/teacher/qcms/${qcmId}/questions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(questionData)
      },
      'Erreur lors de l’ajout de la question'
    );
  },

  async teacherDeleteQCMQuestion(token: string, questionId: string) {
    return safeFetchJson(
      `${API_BASE}/teacher/qcms/questions/${questionId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur lors de la suppression de la question'
    );
  },

  async teacherGetQCMEvaluations(token: string, qcmId: string): Promise<QCMEvaluationSummary> {
    return safeFetchJson<QCMEvaluationSummary>(
      `${API_BASE}/teacher/qcms/${qcmId}/evaluations`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger les évaluations du QCM'
    );
  },

  async studentGetQCMsStatus(token: string, classId: string): Promise<StudentQCMStatus[]> {
    return safeFetchJson<StudentQCMStatus[]>(
      `${API_BASE}/student/classes/${classId}/qcms-status`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      'Impossible de charger les statuts de QCM élève'
    );
  },

  async studentSubmitQCM(
    token: string,
    qcmId: string,
    answers: Record<string, string>,
    timeSpentSeconds: number
  ): Promise<QCMSubmission> {
    return safeFetchJson<QCMSubmission>(
      `${API_BASE}/student/qcms/${qcmId}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answers, timeSpentSeconds })
      },
      'Erreur lors de la validation du QCM'
    );
  },

  async teacherGetBackupStatus(token: string): Promise<{
    dbPath: string;
    dataDir: string;
    dbSizeBytes: number;
    dbSizeFormatted: string;
    lastModified: string;
    classesCount: number;
    studentsCount: number;
    coursesCount: number;
    testsCount: number;
    qcmsCount: number;
    submissionsCount: number;
    evaluationsCount: number;
    hasAutoBackup: boolean;
  }> {
    return safeFetchJson(
      `${API_BASE}/teacher/backup/status`,
      { headers: { Authorization: `Bearer ${token}` } },
      'Impossible de récupérer le statut de la base de données'
    );
  },

  async teacherExportBackupJson(token: string): Promise<Record<string, any>> {
    return safeFetchJson(
      `${API_BASE}/teacher/backup/export-json`,
      { headers: { Authorization: `Bearer ${token}` } },
      'Erreur export JSON'
    );
  },

  async teacherRestoreBackupJson(token: string, backupData: any): Promise<{ success: boolean; message: string }> {
    return safeFetchJson(
      `${API_BASE}/teacher/backup/restore-json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(backupData)
      },
      'Erreur restauration de la sauvegarde'
    );
  },

  // Student Repeating Status (Nouveau vs Redoublant)
  async teacherUpdateStudentRepeating(token: string, studentId: string, isRepeating: boolean): Promise<Student> {
    return safeFetchJson<Student>(
      `${API_BASE}/teacher/students/${studentId}/repeating`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isRepeating })
      },
      'Erreur de mise à jour du statut élève'
    );
  },

  // Attendance (Calendrier & Feuilles de présence)
  async teacherGetAttendanceSessions(token: string, classId: string): Promise<AttendanceSession[]> {
    return safeFetchJson<AttendanceSession[]>(
      `${API_BASE}/teacher/classes/${classId}/attendance/sessions`,
      { headers: { Authorization: `Bearer ${token}` } },
      'Impossible de récupérer les séances de présence'
    );
  },

  async teacherCreateAttendanceSession(
    token: string,
    classId: string,
    data: { title?: string; date?: string; startTime?: string; endTime?: string; notes?: string; initialStatus?: AttendanceStatus }
  ): Promise<AttendanceSession> {
    return safeFetchJson<AttendanceSession>(
      `${API_BASE}/teacher/classes/${classId}/attendance/sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      },
      'Erreur lors de la création de la séance'
    );
  },

  async teacherGetAttendanceSessionDetails(
    token: string,
    sessionId: string
  ): Promise<AttendanceSession & { records: AttendanceRecord[] }> {
    return safeFetchJson<AttendanceSession & { records: AttendanceRecord[] }>(
      `${API_BASE}/teacher/attendance/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      'Impossible de charger la feuille d’appel'
    );
  },

  async teacherUpdateAttendanceSession(
    token: string,
    sessionId: string,
    data: Partial<AttendanceSession>
  ): Promise<AttendanceSession> {
    return safeFetchJson<AttendanceSession>(
      `${API_BASE}/teacher/attendance/sessions/${sessionId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      },
      'Erreur de modification de la séance'
    );
  },

  async teacherSaveAttendanceRecords(
    token: string,
    sessionId: string,
    records: Array<{
      studentId: string;
      status: AttendanceStatus;
      notes?: string;
      optionsJson?: string;
      score?: number;
    }>
  ): Promise<{ success: boolean; session: AttendanceSession & { records: AttendanceRecord[] } }> {
    return safeFetchJson<{ success: boolean; session: AttendanceSession & { records: AttendanceRecord[] } }>(
      `${API_BASE}/teacher/attendance/sessions/${sessionId}/records`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ records })
      },
      'Erreur d’enregistrement des présences'
    );
  },

  async teacherDeleteAttendanceSession(token: string, sessionId: string): Promise<{ success: boolean; message: string }> {
    return safeFetchJson<{ success: boolean; message: string }>(
      `${API_BASE}/teacher/attendance/sessions/${sessionId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur de suppression de la séance'
    );
  },

  async teacherGetClassAttendanceSummary(
    token: string,
    classId: string
  ): Promise<{ classId: string; totalSessions: number; studentSummaries: StudentAttendanceSummary[] }> {
    return safeFetchJson<{ classId: string; totalSessions: number; studentSummaries: StudentAttendanceSummary[] }>(
      `${API_BASE}/teacher/classes/${classId}/attendance/summary`,
      { headers: { Authorization: `Bearer ${token}` } },
      'Impossible de charger le récapitulatif des présences'
    );
  },

  async teacherGetDisciplineSummary(
    token: string,
    classId: string
  ): Promise<ClassDisciplineStats> {
    return safeFetchJson<ClassDisciplineStats>(
      `${API_BASE}/teacher/classes/${classId}/attendance/discipline-summary`,
      { headers: { Authorization: `Bearer ${token}` } },
      'Impossible de charger les statistiques de discipline et de comportement'
    );
  },

  async studentGetAttendance(token: string): Promise<{
    stats: {
      totalSessions: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      excusedCount: number;
      attendanceRate: number;
    };
    history: Array<AttendanceRecord & {
      sessionTitle: string;
      sessionDate: string;
      startTime?: string;
      endTime?: string;
      sessionNotes?: string;
    }>;
  }> {
    return safeFetchJson(
      `${API_BASE}/student/attendance`,
      { headers: { Authorization: `Bearer ${token}` } },
      'Impossible de charger l’historique des présences'
    );
  },

  async studentGetTodayAttendance(token: string): Promise<StudentTodayAttendance> {
    return safeFetchJson<StudentTodayAttendance>(
      `${API_BASE}/student/attendance/today`,
      { headers: { Authorization: `Bearer ${token}` } },
      'Impossible de charger l’état de présence du jour'
    );
  },

  async studentMarkPresenceToday(token: string): Promise<{
    success: boolean;
    session: AttendanceSession;
    record: AttendanceRecord;
    alreadyMarked: boolean;
  }> {
    return safeFetchJson(
      `${API_BASE}/student/attendance/mark-presence`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      },
      'Erreur lors de la confirmation de votre présence'
    );
  },

  async studentUploadActivityFile(
    token: string,
    data: {
      fileUrl: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }
  ): Promise<{ success: boolean; session: AttendanceSession; record: AttendanceRecord }> {
    return safeFetchJson(
      `${API_BASE}/student/attendance/activity-file`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      },
      'Erreur lors du dépôt du fichier d’activité'
    );
  },

  async studentDeleteActivityFile(token: string): Promise<{ success: boolean; record?: AttendanceRecord }> {
    return safeFetchJson(
      `${API_BASE}/student/attendance/activity-file`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      },
      'Erreur lors de la suppression du fichier d’activité'
    );
  }
};

