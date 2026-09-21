import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db } from './server/storage.js';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const TOKEN_SECRET = 'intranet_school_secure_token_secret_key_2024';
  const SESSION_DURATION_MS = 30 * 60 * 1000; // Limite stricte de durée de session : 30 minutes

  app.use(express.json());

  interface ActiveSession {
    role: 'teacher' | 'student';
    id: string;
    name: string;
    createdAt: number;
    expiresAt: number;
  }

  // In-memory cache for fast lookup with expiration timestamps
  const activeSessions = new Map<string, ActiveSession>();

  function createToken(role: 'teacher' | 'student', id: string, name: string): { token: string; expiresAt: number; expiresIn: number } {
    const now = Date.now();
    const expiresAt = now + SESSION_DURATION_MS;
    const payload = Buffer.from(JSON.stringify({ role, id, name, t: now, exp: expiresAt })).toString('base64url');
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
    const token = `tok_${role}_${payload}_${signature}`;
    activeSessions.set(token, { role, id, name, createdAt: now, expiresAt });
    return {
      token,
      expiresAt,
      expiresIn: Math.floor(SESSION_DURATION_MS / 1000)
    };
  }

  function verifyToken(token: string): ActiveSession | null {
    if (!token) return null;
    const now = Date.now();

    // Check cache
    if (activeSessions.has(token)) {
      const cached = activeSessions.get(token)!;
      if (now > cached.expiresAt) {
        activeSessions.delete(token);
        return null; // Session expirée après 30 minutes
      }
      return cached;
    }

    // Check signed token format
    if (token.startsWith('tok_')) {
      const parts = token.split('_');
      if (parts.length === 4) {
        const [, role, payload, signature] = parts;
        const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
        if (signature === expectedSignature) {
          try {
            const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
            const createdAt = typeof data.t === 'number' ? data.t : now;
            const expiresAt = typeof data.exp === 'number' ? data.exp : (createdAt + SESSION_DURATION_MS);
            // Vérification de la limite de 30 minutes
            if (now > expiresAt) {
              return null; // Session expirée
            }
            if (data.role === role) {
              const session: ActiveSession = {
                role: data.role,
                id: data.id,
                name: data.name,
                createdAt,
                expiresAt
              };
              activeSessions.set(token, session);
              return session;
            }
          } catch {
            return null;
          }
        }
      }
    }

    return null;
  }

  // Nettoyage périodique des sessions expirées toutes les 60 secondes
  setInterval(() => {
    const now = Date.now();
    for (const [key, session] of activeSessions.entries()) {
      if (now > session.expiresAt) {
        activeSessions.delete(key);
      }
    }
  }, 60 * 1000);

  // Middleware to authenticate teacher
  function requireTeacher(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    const tokenQuery = req.query.token as string | undefined;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : tokenQuery;
    if (!token) {
      return res.status(401).json({ error: 'Accès non autorisé: jeton manquant', code: 'UNAUTHORIZED' });
    }
    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({
        error: 'Session expirée (durée maximale : 30 minutes) ou invalide. Veuillez vous reconnecter.',
        code: 'SESSION_EXPIRED'
      });
    }
    if (session.role !== 'teacher') {
      return res.status(403).json({ error: 'Accès réservé aux professeurs', code: 'FORBIDDEN' });
    }
    next();
  }


  // Middleware to authenticate student
  function requireStudent(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Accès non autorisé: jeton manquant', code: 'UNAUTHORIZED' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({
        error: 'Session expirée (durée maximale : 30 minutes) ou invalide. Veuillez vous reconnecter.',
        code: 'SESSION_EXPIRED'
      });
    }
    if (session.role !== 'student') {
      return res.status(403).json({ error: 'Accès réservé à l’élève connecté', code: 'FORBIDDEN' });
    }
    (req as any).studentId = session.id;
    next();
  }

  // Middleware to authenticate either student or teacher
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Accès non autorisé: jeton manquant', code: 'UNAUTHORIZED' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({
        error: 'Session expirée (durée maximale : 30 minutes) ou invalide. Veuillez vous reconnecter.',
        code: 'SESSION_EXPIRED'
      });
    }
    (req as any).user = session;
    if (session.role === 'student') {
      (req as any).studentId = session.id;
    }
    next();
  }

  // ==========================================
  // PUBLIC / HEALTH ROUTES
  // ==========================================
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Public: List classes for student login
  app.get('/api/public/classes', (req, res) => {
    try {
      const classes = db.getClasses();
      res.json(classes.map(c => ({
        id: c.id,
        name: c.name,
        level: c.level,
        academicYear: c.academicYear,
        studentCount: c.studentCount
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public: List students for selected class in login dropdown
  app.get('/api/public/classes/:classId/students', (req, res) => {
    try {
      const { classId } = req.params;
      const students = db.getStudentsByClass(classId, false);
      const publicList = students.map(s => ({
        id: s.id,
        classId: s.classId,
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: `${s.lastName.toUpperCase()} ${s.firstName}`,
        studentNumber: s.studentNumber,
        isRepeating: Boolean(s.isRepeating)
      }));
      res.json(publicList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================
  // Teacher Login
  app.post('/api/auth/teacher/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    const teacher = db.authenticateTeacher(username, password);
    if (!teacher) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe enseignant incorrect' });
    }

    const sessionData = createToken('teacher', teacher.username, teacher.fullName);
    res.json({
      token: sessionData.token,
      expiresAt: sessionData.expiresAt,
      expiresIn: sessionData.expiresIn,
      durationMinutes: 30,
      teacher: {
        username: teacher.username,
        fullName: teacher.fullName,
        email: teacher.email
      }
    });
  });

  // Student Login (Choix de la classe, du nom dans la liste, et mot de passe)
  app.post('/api/auth/student/login', (req, res) => {
    const { classId, studentId, password } = req.body;
    if (!classId || !studentId || !password) {
      return res.status(400).json({ error: 'Classe, nom de l’élève et mot de passe requis' });
    }

    const authResult = db.authenticateStudent(classId, studentId, password);
    if (!authResult) {
      return res.status(401).json({ error: 'Mot de passe incorrect pour cet élève' });
    }

    const { student, classInfo } = authResult;
    const sessionData = createToken('student', student.id, `${student.firstName} ${student.lastName}`);

    // Return student profile without exposing full internal password hashes
    const studentProfile = {
      id: student.id,
      classId: student.classId,
      className: classInfo.name,
      level: classInfo.level,
      academicYear: classInfo.academicYear,
      room: classInfo.room,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      studentNumber: student.studentNumber,
      birthDate: student.birthDate,
      email: student.email,
      hasChangedPassword: student.hasChangedPassword,
      isRepeating: Boolean(student.isRepeating),
      lastLogin: student.lastLogin,
      createdAt: student.createdAt,
      notes: student.notes
    };

    res.json({
      token: sessionData.token,
      expiresAt: sessionData.expiresAt,
      expiresIn: sessionData.expiresIn,
      durationMinutes: 30,
      profile: studentProfile,
      classInfo
    });
  });

  // Check current session status & remaining time (Teacher or Student)
  app.get('/api/auth/session/status', (req, res) => {
    const authHeader = req.headers.authorization;
    const tokenQuery = req.query.token as string | undefined;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : tokenQuery;
    if (!token) {
      return res.status(401).json({ valid: false, error: 'Jeton de session manquant', code: 'UNAUTHORIZED' });
    }
    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({
        valid: false,
        error: 'Session expirée (durée maximale : 30 minutes). Veuillez vous reconnecter.',
        code: 'SESSION_EXPIRED'
      });
    }
    const remainingMs = Math.max(0, session.expiresAt - Date.now());
    res.json({
      valid: true,
      role: session.role,
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      remainingSeconds: Math.floor(remainingMs / 1000),
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
      durationMinutes: 30
    });
  });

  // ==========================================
  // STUDENT PORTAL ROUTES
  // ==========================================
  // Student view own profile
  app.get('/api/student/me', requireStudent, (req, res) => {
    const studentId = (req as any).studentId;
    const student = db.getStudentById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Élève non trouvé' });
    }
    const classInfo = db.getClassById(student.classId);

    res.json({
      id: student.id,
      classId: student.classId,
      className: classInfo?.name || '',
      level: classInfo?.level || '',
      academicYear: classInfo?.academicYear || '',
      room: classInfo?.room || '',
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      studentNumber: student.studentNumber,
      birthDate: student.birthDate,
      email: student.email,
      hasChangedPassword: student.hasChangedPassword,
      isRepeating: Boolean(student.isRepeating),
      lastLogin: student.lastLogin,
      createdAt: student.createdAt,
      notes: student.notes
    });
  });

  // Student change password endpoint disabled - password created by teacher cannot be changed by student
  app.post('/api/student/change-password', requireStudent, (_req, res) => {
    return res.status(403).json({
      error: "L'élève ne peut pas modifier le mot de passe défini par le professeur."
    });
  });

  // Student self-update profile disabled: l'élève ne peut pas modifier ses informations
  app.put('/api/student/me', requireStudent, (_req, res) => {
    return res.status(403).json({
      error: "L'élève ne peut pas modifier ses informations. Seul le professeur est autorisé à modifier le dossier élève."
    });
  });

  // Student view own attendance record and calendar
  app.get('/api/student/attendance', requireStudent, (req, res) => {
    const studentId = (req as any).studentId;
    try {
      const data = db.getStudentAttendanceHistory(studentId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // TEACHER ROUTES (PROTECTED)
  // ==========================================
  // List classes with details
  app.get('/api/teacher/classes', requireTeacher, (req, res) => {
    try {
      const classes = db.getClasses();
      res.json(classes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create class
  app.post('/api/teacher/classes', requireTeacher, (req, res) => {
    const { name, level, academicYear, room, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom de la classe est obligatoire (ex: 6ème B)' });
    }
    try {
      const newClass = db.createClass(name, level || 'Général', academicYear || '2024-2025', room, description);
      res.status(201).json(newClass);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete class
  app.delete('/api/teacher/classes/:id', requireTeacher, (req, res) => {
    try {
      const success = db.deleteClass(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Classe introuvable' });
      }
      res.json({ success: true, message: 'Classe et élèves associés supprimés' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // List students in a class with their simple passwords for the teacher
  app.get('/api/teacher/classes/:classId/students', requireTeacher, (req, res) => {
    try {
      const { classId } = req.params;
      const students = db.getStudentsByClass(classId, true);
      res.json(students);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create single student
  app.post('/api/teacher/classes/:classId/students', requireTeacher, (req, res) => {
    const { classId } = req.params;
    const { firstName, lastName, studentNumber, birthDate, email, customPassword, notes, isRepeating } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Nom et prénom obligatoires' });
    }
    try {
      const student = db.createStudent(classId, {
        firstName,
        lastName,
        studentNumber,
        birthDate,
        email,
        customPassword,
        notes,
        isRepeating: Boolean(isRepeating)
      });
      res.status(201).json(student);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Bulk import students into class (CSV or lines) with automatic simple passwords
  app.post('/api/teacher/classes/:classId/students/import', requireTeacher, (req, res) => {
    const { classId } = req.params;
    const { students } = req.body; // Array of { firstName, lastName, birthDate?, email?, studentNumber?, notes?, isRepeating? }
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Liste d’élèves invalide ou vide' });
    }
    try {
      const result = db.bulkImportStudents(classId, students);
      res.status(201).json({
        success: true,
        count: result.total,
        added: result.added
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Regenerate simple automatic password for student
  app.post('/api/teacher/students/:id/regenerate-password', requireTeacher, (req, res) => {
    try {
      const result = db.regenerateStudentPassword(req.params.id);
      res.json({
        success: true,
        studentId: result.studentId,
        newPassword: result.newPassword
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Set custom password for student by teacher
  app.post('/api/teacher/students/:id/set-password', requireTeacher, (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }
    try {
      db.updateStudentPasswordByTeacher(req.params.id, password);
      res.json({ success: true, message: 'Mot de passe mis à jour' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Toggle student repeating status (nouveau vs redoublant - coché par prof)
  app.put('/api/teacher/students/:id/repeating', requireTeacher, (req, res) => {
    try {
      const { isRepeating } = req.body;
      const updated = db.updateStudentRepeatingStatus(req.params.id, Boolean(isRepeating));
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update student details
  app.put('/api/teacher/students/:id', requireTeacher, (req, res) => {
    try {
      const updated = db.updateStudent(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete student
  app.delete('/api/teacher/students/:id', requireTeacher, (req, res) => {
    try {
      const success = db.deleteStudent(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Élève introuvable' });
      }
      res.json({ success: true, message: 'Élève supprimé' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ATTENDANCE ROUTES (GESTION DE PRÉSENCE)
  // ==========================================
  // List attendance sessions for a class
  app.get('/api/teacher/classes/:classId/attendance/sessions', requireTeacher, (req, res) => {
    try {
      const sessions = db.getAttendanceSessions(req.params.classId);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new attendance session for a class
  app.post('/api/teacher/classes/:classId/attendance/sessions', requireTeacher, (req, res) => {
    try {
      const { title, date, startTime, endTime, notes, initialStatus } = req.body;
      const session = db.createAttendanceSession(req.params.classId, {
        title: title || `Séance du ${date || new Date().toISOString().substring(0, 10)}`,
        date: date || new Date().toISOString().substring(0, 10),
        startTime,
        endTime,
        notes,
        initialStatus
      });
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get session details and student roll call records
  app.get('/api/teacher/attendance/sessions/:sessionId', requireTeacher, (req, res) => {
    try {
      const session = db.getAttendanceSessionDetails(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Séance introuvable' });
      }
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update session metadata (title, date, times, notes)
  app.put('/api/teacher/attendance/sessions/:sessionId', requireTeacher, (req, res) => {
    try {
      const updated = db.updateAttendanceSessionInfo(req.params.sessionId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Save student attendance marks for a session
  app.put('/api/teacher/attendance/sessions/:sessionId/records', requireTeacher, (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Format des présences invalide' });
      }
      db.saveAttendanceRecords(req.params.sessionId, records);
      const updated = db.getAttendanceSessionDetails(req.params.sessionId);
      res.json({ success: true, session: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete attendance session
  app.delete('/api/teacher/attendance/sessions/:sessionId', requireTeacher, (req, res) => {
    try {
      const success = db.deleteAttendanceSession(req.params.sessionId);
      if (!success) {
        return res.status(404).json({ error: 'Séance introuvable' });
      }
      res.json({ success: true, message: 'Séance et feuilles de présence supprimées' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get class-wide attendance summary per student
  app.get('/api/teacher/classes/:classId/attendance/summary', requireTeacher, (req, res) => {
    try {
      const summary = db.getClassAttendanceSummary(req.params.classId);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // COURSES ROUTES (COURS)
  // ==========================================
  // Get courses for a class (available to teacher or student)
  app.get('/api/classes/:classId/courses', requireAuth, (req, res) => {
    try {
      const courses = db.getCoursesByClass(req.params.classId);
      res.json(courses);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create course for a class (Teacher only)
  app.post('/api/teacher/classes/:classId/courses', requireTeacher, (req, res) => {
    const { title, category, description, content, resourceLink } = req.body;
    if (!title || !category || !content) {
      return res.status(400).json({ error: 'Titre, catégorie et contenu sont obligatoires' });
    }
    try {
      const course = db.createCourse(req.params.classId, {
        title,
        category,
        description,
        content,
        resourceLink
      });
      res.status(201).json(course);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete course (Teacher only)
  app.delete('/api/teacher/courses/:id', requireTeacher, (req, res) => {
    try {
      const success = db.deleteCourse(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Cours introuvable' });
      }
      res.json({ success: true, message: 'Cours supprimé' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // TESTS DE RAPIDITÉ CLAVIER & ÉVALUATIONS
  // ==========================================
  // Get tests for a class
  app.get('/api/classes/:classId/tests', requireAuth, (req, res) => {
    try {
      const tests = db.getTestsByClass(req.params.classId);
      res.json(tests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create test for a class (Teacher only)
  app.post('/api/teacher/classes/:classId/tests', requireTeacher, (req, res) => {
    const { title, theme, level, timeLimitSeconds, targetText, minAccuracyPercent, minWpm, description } = req.body;
    if (!title || !theme || !level || !timeLimitSeconds || !targetText) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (titre, thème, niveau, temps limite, texte cible)' });
    }
    try {
      const test = db.createTest(req.params.classId, {
        title,
        theme,
        level: Number(level),
        timeLimitSeconds: Number(timeLimitSeconds),
        targetText,
        minAccuracyPercent: minAccuracyPercent ? Number(minAccuracyPercent) : 80,
        minWpm: minWpm ? Number(minWpm) : 15,
        description
      });
      res.status(201).json(test);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete test (Teacher only)
  app.delete('/api/teacher/tests/:id', requireTeacher, (req, res) => {
    try {
      const success = db.deleteTest(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Test introuvable' });
      }
      res.json({ success: true, message: 'Test supprimé' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get student test progress with sequential unlock enforcement (Student only)
  app.get('/api/student/classes/:classId/tests-progress', requireStudent, (req, res) => {
    const studentId = (req as any).studentId;
    try {
      const progress = db.getStudentTestsProgress(req.params.classId, studentId);
      res.json(progress);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Submit test typing attempt and get evaluation (Student only)
  app.post('/api/student/tests/:testId/submit', requireStudent, (req, res) => {
    const studentId = (req as any).studentId;
    const { wpm, cpm, accuracy, mistakesCount, timeSpentSeconds } = req.body;
    if (wpm === undefined || accuracy === undefined || timeSpentSeconds === undefined) {
      return res.status(400).json({ error: 'Données de résultat de frappe incomplètes' });
    }
    try {
      const result = db.submitTestEvaluation(studentId, req.params.testId, {
        wpm: Number(wpm),
        cpm: Number(cpm || 0),
        accuracy: Number(accuracy),
        mistakesCount: Number(mistakesCount || 0),
        timeSpentSeconds: Number(timeSpentSeconds)
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get complete class evaluations (Teacher only: per student, per test, class total)
  app.get('/api/teacher/classes/:classId/evaluations', requireTeacher, (req, res) => {
    try {
      const summary = db.getClassEvaluations(req.params.classId);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // QCM (QUESTIONNAIRES & QUIZ)
  // ==========================================
  // List QCMs for a class (Auth: Teacher sees all, Student sees active ones)
  app.get('/api/classes/:classId/qcms', requireAuth, (req, res) => {
    const session = (req as any).user;
    const isStudent = session?.role === 'student';
    try {
      const qcms = db.getQCMsByClass(req.params.classId, isStudent);
      res.json(qcms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single QCM details (hide answers for student, show for teacher)
  app.get('/api/qcms/:id', requireAuth, (req, res) => {
    const session = (req as any).user;
    const hideAnswers = session?.role === 'student';
    try {
      const qcm = db.getQCMById(req.params.id, hideAnswers);
      if (!qcm) {
        return res.status(404).json({ error: 'QCM introuvable' });
      }
      res.json(qcm);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create QCM for a class (Teacher only)
  app.post('/api/teacher/classes/:classId/qcms', requireTeacher, (req, res) => {
    const { title, description, category, durationMinutes, totalPoints, isActive, classIds } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Le titre du QCM est obligatoire' });
    }
    try {
      const qcm = db.createQCM(req.params.classId, {
        title,
        description,
        category,
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : 0,
        totalPoints: totalPoints !== undefined ? Number(totalPoints) : 20,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        classIds: Array.isArray(classIds) ? classIds : undefined
      });
      res.status(201).json(qcm);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update QCM (Teacher only)
  app.put('/api/teacher/qcms/:id', requireTeacher, (req, res) => {
    try {
      const qcm = db.updateQCM(req.params.id, req.body);
      res.json(qcm);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete QCM (Teacher only)
  app.delete('/api/teacher/qcms/:id', requireTeacher, (req, res) => {
    try {
      const success = db.deleteQCM(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'QCM introuvable' });
      }
      res.json({ success: true, message: 'QCM supprimé avec succès' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Import questions into QCM: Question? | Réponse A | Réponse B | Réponse C | Réponse D | Bonne réponse | Points
  app.post('/api/teacher/qcms/:id/questions/import', requireTeacher, (req, res) => {
    const { rawText, questions, replaceExisting } = req.body;
    if (!rawText && (!questions || questions.length === 0)) {
      return res.status(400).json({ error: 'Données de questions manquantes pour l’import' });
    }
    try {
      const updatedQcm = db.importQCMQuestions(
        req.params.id,
        rawText || questions,
        replaceExisting !== undefined ? Boolean(replaceExisting) : true
      );
      res.json(updatedQcm);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Add single question manually (Teacher only)
  app.post('/api/teacher/qcms/:id/questions', requireTeacher, (req, res) => {
    const { questionText, optionA, optionB, optionC, optionD, correctOption, points, explanation } = req.body;
    if (!questionText || !optionA || !optionB || !correctOption) {
      return res.status(400).json({ error: 'Question, Options A et B, et Bonne réponse sont obligatoires' });
    }
    try {
      const question = db.addQCMQuestion(req.params.id, {
        questionText,
        optionA,
        optionB,
        optionC: optionC || '',
        optionD: optionD || '',
        correctOption,
        points: points !== undefined ? Number(points) : 1,
        explanation
      });
      res.status(201).json(question);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete single question (Teacher only)
  app.delete('/api/teacher/qcms/questions/:questionId', requireTeacher, (req, res) => {
    try {
      const success = db.deleteQCMQuestion(req.params.questionId);
      if (!success) {
        return res.status(404).json({ error: 'Question introuvable' });
      }
      res.json({ success: true, message: 'Question supprimée' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Student: Get QCMs with status (Completed, Score /20, Pending)
  app.get('/api/student/classes/:classId/qcms-status', requireStudent, (req, res) => {
    const studentId = (req as any).studentId;
    try {
      const statuses = db.getStudentQCMsProgress(req.params.classId, studentId);
      res.json(statuses);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Student: Submit answers for QCM
  app.post('/api/student/qcms/:id/submit', requireStudent, (req, res) => {
    const studentId = (req as any).studentId;
    const { answers, timeSpentSeconds } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Réponses fournies invalides' });
    }
    try {
      const submission = db.submitQCM(studentId, req.params.id, answers, Number(timeSpentSeconds || 0));
      res.json(submission);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Teacher: Get evaluations & statistics for a QCM (all student grades & question success rates)
  app.get('/api/teacher/qcms/:id/evaluations', requireTeacher, (req, res) => {
    try {
      const evals = db.getQCMEvaluations(req.params.id);
      res.json(evals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // BACKUP & DATA PROTECTION ROUTES (Teacher only)
  // ==========================================
  app.get('/api/teacher/backup/status', requireTeacher, (req, res) => {
    try {
      const stats = db.getBackupStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/teacher/backup/download-sqlite', requireTeacher, (req, res) => {
    try {
      const filePath = db.getDatabasePath();
      const dateStr = new Date().toISOString().split('T')[0];
      res.download(filePath, `sauvegarde-intranet-scolaire-${dateStr}.sqlite`);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/teacher/backup/export-json', requireTeacher, (req, res) => {
    try {
      const backup = db.exportFullBackup();
      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="sauvegarde-intranet-${dateStr}.json"`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/teacher/backup/restore-json', requireTeacher, (req, res) => {
    try {
      const result = db.restoreFullBackup(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });


  // ==========================================
  // VITE MIDDLEWARE / STATIC FALLBACK
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Intranet Scolaire démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
