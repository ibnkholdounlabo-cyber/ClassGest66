import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import {
  ClassGroup,
  Student,
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
  ClassDisciplineStats
} from '../src/types.js';
import { generateSimplePassword } from './password.js';
import { parseQcmImportText } from '../src/utils/qcmParser.js';

interface DatabaseSchema {
  classes: ClassGroup[];
  students: Student[];
  teacher: {
    username: string;
    passwordHash: string;
    fullName: string;
    email: string;
  };
}

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');

const SQLITE_FILE = process.env.SQLITE_FILE
  ? path.resolve(process.env.SQLITE_FILE)
  : (process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(DATA_DIR, 'school.sqlite'));

const LEGACY_JSON_FILE = path.join(DATA_DIR, 'intranet.json');

const INITIAL_DATA: DatabaseSchema = {
  teacher: {
    username: 'prof',
    passwordHash: 'prof1234',
    fullName: 'Prof. M. Laurent',
    email: 'm.laurent@college-intranet.fr'
  },
  classes: [
    {
      id: 'cls-6b',
      name: '6ème B',
      level: 'Sixième - Collège',
      academicYear: '2024-2025',
      room: 'Salle 104',
      description: 'Classe de 6ème B - Groupe Principal',
      createdAt: new Date().toISOString()
    },
    {
      id: 'cls-3a',
      name: '3ème A',
      level: 'Troisième - Collège',
      academicYear: '2024-2025',
      room: 'Salle 208',
      description: 'Classe de 3ème A - Préparation Brevet',
      createdAt: new Date().toISOString()
    }
  ],
  students: [
    {
      id: 'std-6b-01',
      classId: 'cls-6b',
      firstName: 'Lucas',
      lastName: 'Dupont',
      studentNumber: 'ELV-6B-01',
      birthDate: '2012-05-14',
      email: 'lucas.dupont@eleve.intranet.fr',
      password: 'soleil42',
      hasChangedPassword: false,
      notes: 'Délégué suppléant',
      createdAt: new Date().toISOString()
    },
    {
      id: 'std-6b-02',
      classId: 'cls-6b',
      firstName: 'Emma',
      lastName: 'Martin',
      studentNumber: 'ELV-6B-02',
      birthDate: '2012-11-20',
      email: 'emma.martin@eleve.intranet.fr',
      password: 'panda18',
      hasChangedPassword: true,
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'std-6b-03',
      classId: 'cls-6b',
      firstName: 'Yanis',
      lastName: 'Benali',
      studentNumber: 'ELV-6B-03',
      birthDate: '2012-03-08',
      email: 'yanis.benali@eleve.intranet.fr',
      password: 'etoile77',
      hasChangedPassword: false,
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'std-6b-04',
      classId: 'cls-6b',
      firstName: 'Chloé',
      lastName: 'Leroy',
      studentNumber: 'ELV-6B-04',
      birthDate: '2012-09-27',
      email: 'chloe.leroy@eleve.intranet.fr',
      password: 'renard35',
      hasChangedPassword: false,
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'std-6b-05',
      classId: 'cls-6b',
      firstName: 'Thomas',
      lastName: 'Moreau',
      studentNumber: 'ELV-6B-05',
      birthDate: '2012-07-02',
      email: 'thomas.moreau@eleve.intranet.fr',
      password: 'dauphin61',
      hasChangedPassword: false,
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'std-3a-01',
      classId: 'cls-3a',
      firstName: 'Sarah',
      lastName: 'Bernard',
      studentNumber: 'ELV-3A-01',
      birthDate: '2009-02-18',
      email: 'sarah.bernard@eleve.intranet.fr',
      password: 'robot24',
      hasChangedPassword: false,
      notes: 'Option Latin',
      createdAt: new Date().toISOString()
    },
    {
      id: 'std-3a-02',
      classId: 'cls-3a',
      firstName: 'Alexandre',
      lastName: 'Dubois',
      studentNumber: 'ELV-3A-02',
      birthDate: '2009-10-12',
      email: 'alexandre.dubois@eleve.intranet.fr',
      password: 'comete89',
      hasChangedPassword: false,
      notes: 'Option Arts Plastiques',
      createdAt: new Date().toISOString()
    },
    {
      id: 'std-3a-03',
      classId: 'cls-3a',
      firstName: 'Manon',
      lastName: 'Rousseau',
      studentNumber: 'ELV-3A-03',
      birthDate: '2009-06-30',
      email: 'manon.rousseau@eleve.intranet.fr',
      password: 'bleu55',
      hasChangedPassword: false,
      notes: '',
      createdAt: new Date().toISOString()
    }
  ]
};

class SQLiteStorage {
  private db: DatabaseSync;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Protection anti-perte de données : créer une sauvegarde automatique de la base existante
    this.createStartupBackup();

    this.db = new DatabaseSync(SQLITE_FILE);
    this.initDatabase();
  }

  private createStartupBackup() {
    try {
      if (fs.existsSync(SQLITE_FILE)) {
        const stats = fs.statSync(SQLITE_FILE);
        if (stats.size > 0) {
          const backupsDir = path.join(DATA_DIR, 'backups');
          if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
          }

          // 1. Sauvegarde miroir immédiate
          const latestBackupPath = path.join(backupsDir, 'school-auto-backup.sqlite');
          fs.copyFileSync(SQLITE_FILE, latestBackupPath);

          // 2. Sauvegarde horodatée
          const dateStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
          const timestampBackupPath = path.join(backupsDir, `school-backup-${dateStr}.sqlite`);
          fs.copyFileSync(SQLITE_FILE, timestampBackupPath);

          // Nettoyer les sauvegardes plus anciennes pour conserver les 5 plus récentes
          const files = fs.readdirSync(backupsDir)
            .filter(f => f.startsWith('school-backup-') && f.endsWith('.sqlite'))
            .sort()
            .reverse();
          if (files.length > 5) {
            for (let i = 5; i < files.length; i++) {
              try {
                fs.unlinkSync(path.join(backupsDir, files[i]));
              } catch {}
            }
          }
        }
      }
    } catch (backupErr) {
      console.warn('[Storage] Information sur la sauvegarde de démarrage:', backupErr);
    }
  }

  private initDatabase() {
    // Enable WAL and foreign keys
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS teachers (
        username TEXT PRIMARY KEY,
        passwordHash TEXT NOT NULL,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        level TEXT NOT NULL,
        academicYear TEXT NOT NULL,
        room TEXT DEFAULT '',
        description TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        studentNumber TEXT,
        birthDate TEXT DEFAULT '',
        email TEXT DEFAULT '',
        password TEXT NOT NULL,
        hasChangedPassword INTEGER NOT NULL DEFAULT 0,
        isRepeating INTEGER NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        lastLogin TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT DEFAULT '',
        content TEXT NOT NULL,
        resourceLink TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tests (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        title TEXT NOT NULL,
        theme TEXT NOT NULL,
        level INTEGER NOT NULL,
        timeLimitSeconds INTEGER NOT NULL,
        targetText TEXT NOT NULL,
        minAccuracyPercent INTEGER NOT NULL DEFAULT 80,
        minWpm INTEGER NOT NULL DEFAULT 15,
        description TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS test_evaluations (
        id TEXT PRIMARY KEY,
        testId TEXT NOT NULL,
        studentId TEXT NOT NULL,
        classId TEXT NOT NULL,
        wpm INTEGER NOT NULL,
        cpm INTEGER NOT NULL,
        accuracy INTEGER NOT NULL,
        mistakesCount INTEGER NOT NULL,
        timeSpentSeconds INTEGER NOT NULL,
        passed INTEGER NOT NULL DEFAULT 0,
        score INTEGER NOT NULL,
        completedAt TEXT NOT NULL,
        FOREIGN KEY (testId) REFERENCES tests(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS qcms (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        category TEXT DEFAULT 'Général',
        durationMinutes INTEGER DEFAULT 0,
        totalPoints REAL DEFAULT 20,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS qcm_questions (
        id TEXT PRIMARY KEY,
        qcmId TEXT NOT NULL,
        questionOrder INTEGER NOT NULL,
        questionText TEXT NOT NULL,
        optionA TEXT NOT NULL,
        optionB TEXT NOT NULL,
        optionC TEXT NOT NULL,
        optionD TEXT NOT NULL,
        correctOption TEXT NOT NULL,
        points REAL NOT NULL DEFAULT 1,
        explanation TEXT DEFAULT '',
        FOREIGN KEY (qcmId) REFERENCES qcms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS qcm_submissions (
        id TEXT PRIMARY KEY,
        qcmId TEXT NOT NULL,
        studentId TEXT NOT NULL,
        classId TEXT NOT NULL,
        totalScore REAL NOT NULL,
        maxScore REAL NOT NULL,
        score20 REAL NOT NULL,
        answersJson TEXT NOT NULL,
        timeSpentSeconds INTEGER NOT NULL DEFAULT 0,
        completedAt TEXT NOT NULL,
        FOREIGN KEY (qcmId) REFERENCES qcms(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS qcm_classes (
        qcmId TEXT NOT NULL,
        classId TEXT NOT NULL,
        PRIMARY KEY (qcmId, classId),
        FOREIGN KEY (qcmId) REFERENCES qcms(id) ON DELETE CASCADE,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS course_classes (
        courseId TEXT NOT NULL,
        classId TEXT NOT NULL,
        PRIMARY KEY (courseId, classId),
        FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS test_classes (
        testId TEXT NOT NULL,
        classId TEXT NOT NULL,
        PRIMARY KEY (testId, classId),
        FOREIGN KEY (testId) REFERENCES tests(id) ON DELETE CASCADE,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT DEFAULT '',
        endTime TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        studentId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'present',
        notes TEXT DEFAULT '',
        optionsJson TEXT DEFAULT '[]',
        score INTEGER DEFAULT 0,
        markedByStudentAt TEXT DEFAULT '',
        activityFileUrl TEXT DEFAULT '',
        activityFileName TEXT DEFAULT '',
        activityFileType TEXT DEFAULT '',
        activityFileSize INTEGER DEFAULT 0,
        activityUploadedAt TEXT DEFAULT '',
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE (sessionId, studentId)
      );

      CREATE INDEX IF NOT EXISTS idx_students_classId ON students(classId);
      CREATE INDEX IF NOT EXISTS idx_courses_classId ON courses(classId);
      CREATE INDEX IF NOT EXISTS idx_tests_classId ON tests(classId);
      CREATE INDEX IF NOT EXISTS idx_evals_studentId ON test_evaluations(studentId);
      CREATE INDEX IF NOT EXISTS idx_evals_classId ON test_evaluations(classId);
      CREATE INDEX IF NOT EXISTS idx_qcms_classId ON qcms(classId);
      CREATE INDEX IF NOT EXISTS idx_qcm_questions_qcmId ON qcm_questions(qcmId);
      CREATE INDEX IF NOT EXISTS idx_qcm_subs_qcmId ON qcm_submissions(qcmId);
      CREATE INDEX IF NOT EXISTS idx_qcm_subs_studentId ON qcm_submissions(studentId);
      CREATE INDEX IF NOT EXISTS idx_qcm_classes_qcmId ON qcm_classes(qcmId);
      CREATE INDEX IF NOT EXISTS idx_qcm_classes_classId ON qcm_classes(classId);
      CREATE INDEX IF NOT EXISTS idx_course_classes_courseId ON course_classes(courseId);
      CREATE INDEX IF NOT EXISTS idx_course_classes_classId ON course_classes(classId);
      CREATE INDEX IF NOT EXISTS idx_test_classes_testId ON test_classes(testId);
      CREATE INDEX IF NOT EXISTS idx_test_classes_classId ON test_classes(classId);
      CREATE INDEX IF NOT EXISTS idx_att_sess_classId ON attendance_sessions(classId);
      CREATE INDEX IF NOT EXISTS idx_att_rec_sessionId ON attendance_records(sessionId);
      CREATE INDEX IF NOT EXISTS idx_att_rec_studentId ON attendance_records(studentId);
    `);

    // Ensure backwards compatibility / migrations
    try {
      this.db.exec(`INSERT OR IGNORE INTO qcm_classes (qcmId, classId) SELECT id, classId FROM qcms WHERE classId IS NOT NULL;`);
    } catch (migErr) {
      console.warn('Migration qcm_classes:', migErr);
    }

    try {
      this.db.exec(`INSERT OR IGNORE INTO course_classes (courseId, classId) SELECT id, classId FROM courses WHERE classId IS NOT NULL;`);
    } catch (migErr) {
      console.warn('Migration course_classes:', migErr);
    }

    try {
      this.db.exec(`INSERT OR IGNORE INTO test_classes (testId, classId) SELECT id, classId FROM tests WHERE classId IS NOT NULL;`);
    } catch (migErr) {
      console.warn('Migration test_classes:', migErr);
    }

    try {
      this.db.exec('ALTER TABLE students ADD COLUMN isRepeating INTEGER NOT NULL DEFAULT 0;');
    } catch {}

    try {
      this.db.exec("ALTER TABLE courses ADD COLUMN fileUrl TEXT DEFAULT '';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE courses ADD COLUMN fileName TEXT DEFAULT '';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE courses ADD COLUMN fileType TEXT DEFAULT '';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE courses ADD COLUMN fileSize INTEGER DEFAULT 0;");
    } catch {}

    try {
      this.db.exec("ALTER TABLE attendance_records ADD COLUMN optionsJson TEXT DEFAULT '[]';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE attendance_records ADD COLUMN score INTEGER DEFAULT 0;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE attendance_records ADD COLUMN markedByStudentAt TEXT DEFAULT '';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE attendance_records ADD COLUMN activityFileUrl TEXT DEFAULT '';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE attendance_records ADD COLUMN activityFileName TEXT DEFAULT '';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE attendance_records ADD COLUMN activityFileType TEXT DEFAULT '';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE attendance_records ADD COLUMN activityFileSize INTEGER DEFAULT 0;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE attendance_records ADD COLUMN activityUploadedAt TEXT DEFAULT '';");
    } catch {}

    // Vérification : uniquement si la base de données est complètement vierge (0 classe)
    // Cela garantit qu'un redémarrage ou un nouveau déploiement Git ne modifie JAMAIS vos données existantes !
    const classCountRow = this.db.prepare('SELECT COUNT(*) as count FROM classes').get() as { count: number };
    if (!classCountRow || classCountRow.count === 0) {
      this.seedInitialData();
      // Créer les cours et tests par défaut UNIQUEMENT lors du tout premier démarrage sur base vierge
      this.seedDefaultCoursesAndTests();
    }
  }

  private seedInitialData() {
    let sourceData = INITIAL_DATA;

    if (fs.existsSync(LEGACY_JSON_FILE)) {
      try {
        const content = fs.readFileSync(LEGACY_JSON_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed.classes && parsed.students) {
          sourceData = parsed;
        }
      } catch (err) {
        console.warn('Could not read legacy json file, using default seed:', err);
      }
    }

    const insertTeacher = this.db.prepare(`
      INSERT OR REPLACE INTO teachers (username, passwordHash, fullName, email)
      VALUES (?, ?, ?, ?)
    `);
    insertTeacher.run(
      sourceData.teacher.username,
      sourceData.teacher.passwordHash,
      sourceData.teacher.fullName,
      sourceData.teacher.email
    );

    const insertClass = this.db.prepare(`
      INSERT OR REPLACE INTO classes (id, name, level, academicYear, room, description, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const cls of sourceData.classes) {
      insertClass.run(
        cls.id,
        cls.name,
        cls.level,
        cls.academicYear,
        cls.room || '',
        cls.description || '',
        cls.createdAt || new Date().toISOString()
      );
    }

    const insertStudent = this.db.prepare(`
      INSERT OR REPLACE INTO students (
        id, classId, firstName, lastName, studentNumber, birthDate,
        email, password, hasChangedPassword, notes, lastLogin, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const std of sourceData.students) {
      insertStudent.run(
        std.id,
        std.classId,
        std.firstName,
        std.lastName,
        std.studentNumber || '',
        std.birthDate || '',
        std.email || '',
        std.password || generateSimplePassword(),
        std.hasChangedPassword ? 1 : 0,
        std.notes || '',
        std.lastLogin || null,
        std.createdAt || new Date().toISOString()
      );
    }
  }

  public seedDefaultCoursesAndTests() {
    const classes = this.db.prepare('SELECT id, name FROM classes').all() as Array<{ id: string; name: string }>;

    for (const cls of classes) {
      // Check courses
      const courseCount = (this.db.prepare('SELECT COUNT(*) as c FROM courses WHERE classId = ?').get(cls.id) as any)?.c || 0;
      if (courseCount === 0) {
        this.createDefaultCoursesForClass(cls.id);
      }

      // Check tests
      const testCount = (this.db.prepare('SELECT COUNT(*) as c FROM tests WHERE classId = ?').get(cls.id) as any)?.c || 0;
      if (testCount === 0) {
        this.createDefaultTestsForClass(cls.id);
      }

      // Check QCMs
      const qcmCount = (this.db.prepare('SELECT COUNT(*) as c FROM qcms WHERE classId = ?').get(cls.id) as any)?.c || 0;
      if (qcmCount === 0) {
        this.createDefaultQCMsForClass(cls.id);
      }
    }
  }

  private createDefaultCoursesForClass(classId: string) {
    const defaultCourses = [
      {
        title: 'Word : Les Fondamentaux du Traitement de Texte',
        category: 'Word' as const,
        description: 'Typographie française, mise en page et raccourcis de frappe rapide.',
        content: `### 1. Les Règles Typographiques Essentielles
- Mettre une **espace insécable** devant les ponctuations doubles (: ; ! ?).
- Employer les guillemets français « ... » avec espaces intérieures.
- Ne pas oublier les majuscules accentuées (É, À, Ç).

### 2. Raccourcis Clavier Incontournables
- **Ctrl + G** (ou Ctrl + B) : Mettre le texte en gras
- **Ctrl + I** : Mettre le texte en italique
- **Ctrl + U** : Souligner
- **Ctrl + E** : Centrer le paragraphe
- **Ctrl + J** : Justifier le paragraphe (alignement bilatéral)
- **Ctrl + S** : Enregistrer le document immédiatement

### 3. Structuration par les Styles
L'utilisation des styles Titre 1, Titre 2 et Normal permet d'organiser le plan de votre document et de générer automatiquement un sommaire propre.`
      },
      {
        title: 'Excel : Classeurs, Cellules et Formules de Base',
        category: 'Excel' as const,
        description: 'Comprendre la structure d\'un tableau, les adresses de cellules et les fonctions SOMME, MOYENNE et SI.',
        content: `### 1. Vocabulaire du Tableur
- Une **feuille** est composée de colonnes (lettres : A, B, C...) et de lignes (numéros : 1, 2, 3...).
- L'intersection d'une colonne et d'une ligne forme une **cellule** (ex: B4).
- Une **plage** désigne un rectangle de cellules (ex: A1:D10).

### 2. Formules Mathématiques et Statistiques
Toute formule commence obligatoirement par le signe égal \`=\` :
- \`=SOMME(A1:A20)\` : Calcule le total d'une série de nombres.
- \`=MOYENNE(B2:B15)\` : Calcule la moyenne arithmétique.
- \`=MAX(C1:C10)\` et \`=MIN(C1:C10)\` : Valeur la plus haute et la plus basse.

### 3. La Fonction Conditionnelle SI
\`\`\`excel
=SI(D2>=10; "Validé"; "À rattraper")
\`\`\`
Elle prend 3 paramètres : la condition, la valeur si VRAI, la valeur si FAUX.`
      },
      {
        title: 'Python : Variables, Conditions et Syntaxe Propre',
        category: 'Python' as const,
        description: 'Initiation à la programmation Python : types de variables, indentation et tests conditionnels.',
        content: `### 1. Variables et Types de Données
En Python, pas besoin de déclarer le type, il est déduit automatiquement :
\`\`\`python
prenom = "Lucas"          # Chaine de caractères (str)
age = 15                  # Entier (int)
moyenne = 14.75           # Flottant (float)
est_delegue = True        # Booléen (bool)
print(f"Élève: {prenom}, note: {moyenne}")
\`\`\`

### 2. L'Indentation : Règle d'Or de Python
Contrairement à d'autres langages, Python utilise **l'indentation** (4 espaces) pour délimiter les blocs de code :
\`\`\`python
if moyenne >= 16:
    print("Mention Très Bien")
elif moyenne >= 14:
    print("Mention Bien")
elif moyenne >= 10:
    print("Admis")
else:
    print("Ajourné")
\`\`\`

### 3. Les Listes et Boucles
\`\`\`python
matieres = ["Maths", "Français", "Informatique"]
for m in matieres:
    print("Matière:", m)
\`\`\``
      }
    ];

    const insertStmt = this.db.prepare(`
      INSERT INTO courses (id, classId, title, category, description, content, resourceLink, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of defaultCourses) {
      insertStmt.run(
        'crs-' + Math.random().toString(36).substring(2, 9),
        classId,
        c.title,
        c.category,
        c.description,
        c.content,
        '',
        new Date().toISOString()
      );
    }
  }

  private createDefaultTestsForClass(classId: string) {
    const defaultTests = [
      // THEME WORD
      {
        theme: 'Word' as const,
        level: 1,
        title: 'Word Niveau 1 : Ponctuation et phrases simples',
        timeLimitSeconds: 60,
        minAccuracyPercent: 80,
        minWpm: 15,
        description: 'Saisie de phrases usuelles avec ponctuation française et accents.',
        targetText: "Le traitement de texte permet de rédiger des courriers, des rapports et des devoirs scolaires avec une mise en page soignée et lisible."
      },
      {
        theme: 'Word' as const,
        level: 2,
        title: 'Word Niveau 2 : Paragraphes et typographie formelle',
        timeLimitSeconds: 90,
        minAccuracyPercent: 85,
        minWpm: 22,
        description: 'Maîtrise de la frappe fluide avec styles de titres et mise en forme soignée.',
        targetText: "Pour bien structurer un document officiel, il convient d'utiliser les styles de titre appropriés : Titre 1 pour les grands chapitres et Titre 2 pour les sections secondaires."
      },
      {
        theme: 'Word' as const,
        level: 3,
        title: 'Word Niveau 3 : Citations et typographie avancée',
        timeLimitSeconds: 120,
        minAccuracyPercent: 90,
        minWpm: 30,
        description: 'Texte long avec guillemets français, apostrophes et ponctuation double.',
        targetText: "« L'informatique n'est pas plus la science des ordinateurs que l'astronomie n'est celle des télescopes. » La maîtrise rapide et précise du clavier constitue le premier outil de travail d'un élève autonome."
      },

      // THEME EXCEL
      {
        theme: 'Excel' as const,
        level: 1,
        title: 'Excel Niveau 1 : Formules fondamentales',
        timeLimitSeconds: 60,
        minAccuracyPercent: 80,
        minWpm: 15,
        description: 'Saisie rapide des fonctions SOMME et MOYENNE avec parenthèses et deux-points.',
        targetText: "=SOMME(A1:A10) + MOYENNE(B1:B10) * 1.20"
      },
      {
        theme: 'Excel' as const,
        level: 2,
        title: 'Excel Niveau 2 : Conditions logiques et texte',
        timeLimitSeconds: 90,
        minAccuracyPercent: 85,
        minWpm: 20,
        description: 'Formules conditionnelles avec guillemets, points-virgules et concaténation.',
        targetText: '=SI(C2>=10; "Admis"; "Ajourné") & " - Note finale : " & TEXTE(C2; "0,0")'
      },
      {
        theme: 'Excel' as const,
        level: 3,
        title: 'Excel Niveau 3 : Recherche et calculs matriciels',
        timeLimitSeconds: 120,
        minAccuracyPercent: 88,
        minWpm: 25,
        description: 'Formule avancée de recherche et conditions multiples combinées.',
        targetText: '=RECHERCHEX(E2; A2:A100; C2:C100; "Introuvable"; 0; 1) + NB.SI.ENS(D2:D100; ">=10"; F2:F100; "Validé")'
      },

      // THEME PYTHON
      {
        theme: 'Python' as const,
        level: 1,
        title: 'Python Niveau 1 : Affichage et variables',
        timeLimitSeconds: 60,
        minAccuracyPercent: 80,
        minWpm: 15,
        description: 'Instructions print, chaînes de caractères et variables de base.',
        targetText: 'print("Bonjour !")\nnom = "Lucas"\nage = 15\nprint(f"Élève: {nom}, âge: {age}")'
      },
      {
        theme: 'Python' as const,
        level: 2,
        title: 'Python Niveau 2 : Listes et conditions if/else',
        timeLimitSeconds: 90,
        minAccuracyPercent: 85,
        minWpm: 20,
        description: 'Listes, calcul de moyenne et bloc conditionnel avec indentation.',
        targetText: 'notes = [12, 15, 18, 14]\nmoyenne = sum(notes) / len(notes)\nif moyenne >= 10:\n    print(f"Admis avec {moyenne:.1f}")'
      },
      {
        theme: 'Python' as const,
        level: 3,
        title: 'Python Niveau 3 : Fonctions et retour de résultat',
        timeLimitSeconds: 120,
        minAccuracyPercent: 88,
        minWpm: 25,
        description: 'Définition d\'une fonction avec paramètres et expressions ternaires.',
        targetText: 'def evaluer_eleve(nom, note):\n    statut = "Reçu" if note >= 10 else "En attente"\n    return f"{nom}: {statut} ({note}/20)"'
      }
    ];

    const insertStmt = this.db.prepare(`
      INSERT INTO tests (
        id, classId, title, theme, level, timeLimitSeconds, targetText,
        minAccuracyPercent, minWpm, description, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of defaultTests) {
      insertStmt.run(
        'tst-' + Math.random().toString(36).substring(2, 9),
        classId,
        t.title,
        t.theme,
        t.level,
        t.timeLimitSeconds,
        t.targetText,
        t.minAccuracyPercent,
        t.minWpm,
        t.description,
        new Date().toISOString()
      );
    }
  }

  private createDefaultQCMsForClass(classId: string) {
    const defaultQcms = [
      {
        title: 'QCM 1 : Bureautique & Traitement de Texte (Word & Excel)',
        category: 'Word' as const,
        description: 'Évaluation des connaissances sur les logiciels bureautiques, raccourcis et formules de calcul.',
        durationMinutes: 15,
        totalPoints: 20,
        rawQuestions: [
          'Quel raccourci clavier permet de sauvegarder rapidement un document ? | Ctrl + C | Ctrl + S | Ctrl + V | Ctrl + P | B | 4 | Le raccourci universel de sauvegarde est Ctrl+S (Save).',
          'Dans Excel, quel caractère doit obligatoirement débuter une formule ? | # | / | = | @ | C | 4 | Toute formule ou calcul débute obligatoirement par le signe =.',
          'Dans Word, quel alignement répartit le texte uniformément entre les marges ? | Aligné à gauche | Centré | Aligné à droite | Justifié | D | 4 | La justification harmonise l\'alignement sur les deux marges.',
          'Dans un tableur, que renvoie =SOMME(A1:A3) pour les valeurs 10, 5 et 15 ? | 30 | 10 | 15 | 25 | A | 4 | 10 + 5 + 15 = 30.',
          'Quel format préserve fidèlement la mise en page lors d\'un partage ? | .txt | .docx | .pdf | .exe | C | 4 | Le format PDF garantit une mise en page identique sur tous les ordinateurs.'
        ]
      },
      {
        title: 'QCM 2 : Initiation Algorithmique & Programmation Python',
        category: 'Python' as const,
        description: 'Bases de la syntaxe Python, variables, types et structures de contrôle.',
        durationMinutes: 12,
        totalPoints: 20,
        rawQuestions: [
          'En Python, quelle fonction permet d\'afficher du texte dans la console ? | echo() | print() | write() | display() | B | 4 | La fonction native d\'affichage est print().',
          'Quel type de donnée correspond à la valeur "42" avec guillemets ? | int | float | bool | str | D | 4 | Les guillemets délimitent toujours une chaîne de caractères (str).',
          'Quel opérateur teste l\'égalité stricte entre deux expressions en Python ? | = | == | === | != | B | 4 | L\'opérateur de comparaison d\'égalité est ==.',
          'Que renvoie l\'opération 7 % 3 en langage Python ? | 2 | 1 | 2.33 | 0 | B | 4 | 7 divisé par 3 fait 2 avec un reste de 1 (% est le modulo).',
          'Quelle instruction définit une fonction réutilisable en Python ? | function | fun | def | proc | C | 4 | Le mot-clé def permet d\'introduire une fonction.'
        ]
      }
    ];

    for (const q of defaultQcms) {
      const qcm = this.createQCM(classId, {
        title: q.title,
        category: q.category,
        description: q.description,
        durationMinutes: q.durationMinutes,
        totalPoints: q.totalPoints,
        isActive: true
      });

      this.importQCMQuestions(qcm.id, q.rawQuestions.join('\n'), true);
    }
  }

  private mapStudentRow(row: any, includePassword = false): Student {
    const student: Student = {
      id: String(row.id),
      classId: String(row.classId),
      className: row.className ? String(row.className) : undefined,
      firstName: String(row.firstName),
      lastName: String(row.lastName),
      studentNumber: String(row.studentNumber || ''),
      birthDate: row.birthDate ? String(row.birthDate) : '',
      email: row.email ? String(row.email) : '',
      password: includePassword ? String(row.password) : undefined,
      hasChangedPassword: Boolean(row.hasChangedPassword),
      isRepeating: Boolean(row.isRepeating),
      notes: row.notes ? String(row.notes) : '',
      lastLogin: row.lastLogin ? String(row.lastLogin) : undefined,
      createdAt: String(row.createdAt),
      level: row.level ? String(row.level) : undefined,
      academicYear: row.academicYear ? String(row.academicYear) : undefined,
      room: row.room ? String(row.room) : undefined
    };
    return student;
  }

  private mapClassRow(row: any): ClassGroup {
    return {
      id: String(row.id),
      name: String(row.name),
      level: String(row.level),
      academicYear: String(row.academicYear),
      room: row.room ? String(row.room) : '',
      description: row.description ? String(row.description) : '',
      createdAt: String(row.createdAt)
    };
  }

  // ==========================================
  // CLASSES
  // ==========================================
  public getClasses(): (ClassGroup & { studentCount: number })[] {
    const rows = this.db.prepare(`
      SELECT c.*, COUNT(s.id) as studentCount
      FROM classes c
      LEFT JOIN students s ON s.classId = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all() as any[];

    return rows.map((r) => ({
      ...this.mapClassRow(r),
      studentCount: Number(r.studentCount || 0)
    }));
  }

  public getClassById(id: string): ClassGroup | undefined {
    const row = this.db.prepare('SELECT * FROM classes WHERE id = ?').get(id) as any;
    return row ? this.mapClassRow(row) : undefined;
  }

  public createClass(name: string, level: string, academicYear: string, room?: string, description?: string): ClassGroup {
    const newClass: ClassGroup = {
      id: 'cls-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      name: name.trim(),
      level: level.trim() || 'Général',
      academicYear: academicYear.trim() || '2024-2025',
      room: room?.trim() || '',
      description: description?.trim() || '',
      createdAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO classes (id, name, level, academicYear, room, description, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newClass.id,
      newClass.name,
      newClass.level,
      newClass.academicYear,
      newClass.room || '',
      newClass.description || '',
      newClass.createdAt
    );

    // Seed default courses and tests for the newly created class
    this.createDefaultCoursesForClass(newClass.id);
    this.createDefaultTestsForClass(newClass.id);

    return newClass;
  }

  public deleteClass(id: string): boolean {
    this.db.prepare('DELETE FROM students WHERE classId = ?').run(id);
    this.db.prepare('DELETE FROM courses WHERE classId = ?').run(id);
    this.db.prepare('DELETE FROM tests WHERE classId = ?').run(id);
    this.db.prepare('DELETE FROM test_evaluations WHERE classId = ?').run(id);
    const result = this.db.prepare('DELETE FROM classes WHERE id = ?').run(id);
    return Number(result.changes) > 0;
  }

  // ==========================================
  // STUDENTS
  // ==========================================
  public getStudentsByClass(classId: string, includePassword = false): Student[] {
    const rows = this.db.prepare(`
      SELECT s.*, c.name as className
      FROM students s
      JOIN classes c ON c.id = s.classId
      WHERE s.classId = ?
      ORDER BY s.lastName COLLATE NOCASE ASC, s.firstName COLLATE NOCASE ASC
    `).all(classId) as any[];

    return rows.map((r) => this.mapStudentRow(r, includePassword));
  }

  public getAllStudents(includePassword = false): Student[] {
    const rows = this.db.prepare(`
      SELECT s.*, c.name as className
      FROM students s
      JOIN classes c ON c.id = s.classId
      ORDER BY s.lastName COLLATE NOCASE ASC, s.firstName COLLATE NOCASE ASC
    `).all() as any[];

    return rows.map((r) => this.mapStudentRow(r, includePassword));
  }

  public getStudentById(studentId: string): Student | undefined {
    const row = this.db.prepare(`
      SELECT s.*, c.name as className, c.level, c.academicYear, c.room
      FROM students s
      JOIN classes c ON c.id = s.classId
      WHERE s.id = ?
    `).get(studentId) as any;

    return row ? this.mapStudentRow(row, true) : undefined;
  }

  public createStudent(classId: string, studentData: {
    firstName: string;
    lastName: string;
    studentNumber?: string;
    birthDate?: string;
    email?: string;
    customPassword?: string;
    notes?: string;
    isRepeating?: boolean;
  }): Student {
    const classObj = this.getClassById(classId);
    if (!classObj) throw new Error('Classe introuvable');

    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM students WHERE classId = ?').get(classId) as any;
    const classStudentsCount = Number(countRow?.count || 0);

    const studentNumber = studentData.studentNumber?.trim() ||
      `ELV-${classObj.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${String(classStudentsCount + 1).padStart(2, '0')}`;

    const newStudent: Student = {
      id: 'std-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      classId,
      className: classObj.name,
      firstName: studentData.firstName.trim(),
      lastName: studentData.lastName.trim(),
      studentNumber,
      birthDate: studentData.birthDate || '',
      email: studentData.email?.trim() || `${studentData.firstName.toLowerCase().replace(/\s+/g, '.')}.${studentData.lastName.toLowerCase().replace(/\s+/g, '.')}@eleve.intranet.fr`,
      password: studentData.customPassword?.trim() || generateSimplePassword(),
      hasChangedPassword: false,
      isRepeating: Boolean(studentData.isRepeating),
      notes: studentData.notes?.trim() || '',
      createdAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO students (
        id, classId, firstName, lastName, studentNumber, birthDate,
        email, password, hasChangedPassword, isRepeating, notes, lastLogin, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newStudent.id,
      newStudent.classId,
      newStudent.firstName,
      newStudent.lastName,
      newStudent.studentNumber || '',
      newStudent.birthDate || '',
      newStudent.email || '',
      newStudent.password!,
      0,
      newStudent.isRepeating ? 1 : 0,
      newStudent.notes || '',
      null,
      newStudent.createdAt
    );

    return newStudent;
  }

  public bulkImportStudents(classId: string, rawEntries: Array<{
    firstName: string;
    lastName: string;
    birthDate?: string;
    email?: string;
    studentNumber?: string;
    notes?: string;
    isRepeating?: boolean;
  }>): { added: Student[]; total: number } {
    const classObj = this.getClassById(classId);
    if (!classObj) throw new Error('Classe introuvable');

    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM students WHERE classId = ?').get(classId) as any;
    let existingInClass = Number(countRow?.count || 0);

    const insertStmt = this.db.prepare(`
      INSERT INTO students (
        id, classId, firstName, lastName, studentNumber, birthDate,
        email, password, hasChangedPassword, isRepeating, notes, lastLogin, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const added: Student[] = [];

    for (const item of rawEntries) {
      if (!item.firstName && !item.lastName) continue;
      existingInClass++;
      const studentNumber = item.studentNumber?.trim() ||
        `ELV-${classObj.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${String(existingInClass).padStart(2, '0')}`;

      const newStudent: Student = {
        id: 'std-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        classId,
        className: classObj.name,
        firstName: (item.firstName || '').trim(),
        lastName: (item.lastName || '').trim(),
        studentNumber,
        birthDate: item.birthDate || '',
        email: item.email?.trim() || `${item.firstName.toLowerCase().replace(/\s+/g, '.')}.${item.lastName.toLowerCase().replace(/\s+/g, '.')}@eleve.intranet.fr`,
        password: generateSimplePassword(),
        hasChangedPassword: false,
        isRepeating: Boolean(item.isRepeating),
        notes: item.notes?.trim() || '',
        createdAt: new Date().toISOString()
      };

      insertStmt.run(
        newStudent.id,
        newStudent.classId,
        newStudent.firstName,
        newStudent.lastName,
        newStudent.studentNumber || '',
        newStudent.birthDate || '',
        newStudent.email || '',
        newStudent.password!,
        0,
        newStudent.isRepeating ? 1 : 0,
        newStudent.notes || '',
        null,
        newStudent.createdAt
      );

      added.push(newStudent);
    }

    return { added, total: added.length };
  }

  public updateStudentRepeatingStatus(studentId: string, isRepeating: boolean): Student {
    const existing = this.getStudentById(studentId);
    if (!existing) throw new Error('Élève introuvable');

    this.db.prepare('UPDATE students SET isRepeating = ? WHERE id = ?').run(isRepeating ? 1 : 0, studentId);
    return { ...existing, isRepeating };
  }

  public regenerateStudentPassword(studentId: string): { studentId: string; newPassword: string } {
    const existing = this.getStudentById(studentId);
    if (!existing) throw new Error('Élève introuvable');

    const newPassword = generateSimplePassword();
    this.db.prepare('UPDATE students SET password = ?, hasChangedPassword = 0 WHERE id = ?').run(newPassword, studentId);
    return { studentId, newPassword };
  }

  public updateStudentPasswordByTeacher(studentId: string, customPassword: string): boolean {
    const existing = this.getStudentById(studentId);
    if (!existing) throw new Error('Élève introuvable');

    this.db.prepare('UPDATE students SET password = ?, hasChangedPassword = 0 WHERE id = ?').run(
      customPassword.trim(),
      studentId
    );
    return true;
  }

  public updateStudent(studentId: string, data: Partial<Student> & { password?: string }): Student {
    const existing = this.getStudentById(studentId);
    if (!existing) throw new Error('Élève introuvable');

    const firstName = data.firstName !== undefined ? data.firstName.trim() : existing.firstName;
    const lastName = data.lastName !== undefined ? data.lastName.trim() : existing.lastName;
    const studentNumber = data.studentNumber !== undefined ? data.studentNumber.trim() : existing.studentNumber;
    const birthDate = data.birthDate !== undefined ? data.birthDate : existing.birthDate;
    const email = data.email !== undefined ? data.email.trim() : existing.email;
    const notes = data.notes !== undefined ? data.notes.trim() : existing.notes;
    const classId = data.classId || existing.classId;
    const isRepeating = data.isRepeating !== undefined ? (data.isRepeating ? 1 : 0) : (existing.isRepeating ? 1 : 0);

    this.db.prepare(`
      UPDATE students
      SET firstName = ?, lastName = ?, studentNumber = ?, birthDate = ?, email = ?, notes = ?, classId = ?, isRepeating = ?
      WHERE id = ?
    `).run(firstName, lastName, studentNumber || '', birthDate || '', email || '', notes || '', classId, isRepeating, studentId);

    if (data.password && data.password.trim()) {
      this.db.prepare('UPDATE students SET password = ?, hasChangedPassword = 0 WHERE id = ?').run(
        data.password.trim(),
        studentId
      );
    }

    return this.getStudentById(studentId)!;
  }

  public deleteStudent(studentId: string): boolean {
    const result = this.db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
    return Number(result.changes) > 0;
  }

  // ==========================================
  // COURSES
  // ==========================================
  private getCourseClasses(courseId: string): string[] {
    try {
      const rows = this.db.prepare('SELECT classId FROM course_classes WHERE courseId = ?').all(courseId) as any[];
      return rows.map(r => String(r.classId));
    } catch {
      return [];
    }
  }

  public getCoursesByClass(classId: string): Course[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT c.* FROM courses c
      LEFT JOIN course_classes cc ON cc.courseId = c.id
      WHERE c.classId = ? OR cc.classId = ?
      ORDER BY c.createdAt DESC
    `).all(classId, classId) as any[];

    return rows.map((r) => {
      const linkedClasses = this.getCourseClasses(String(r.id));
      const classIds = linkedClasses.length > 0 ? linkedClasses : [String(r.classId)];
      return {
        id: String(r.id),
        classId: String(r.classId),
        classIds,
        title: String(r.title),
        category: r.category as any,
        description: r.description ? String(r.description) : '',
        content: String(r.content),
        resourceLink: r.resourceLink ? String(r.resourceLink) : '',
        fileUrl: r.fileUrl ? String(r.fileUrl) : undefined,
        fileName: r.fileName ? String(r.fileName) : undefined,
        fileType: r.fileType ? String(r.fileType) : undefined,
        fileSize: r.fileSize ? Number(r.fileSize) : undefined,
        createdAt: String(r.createdAt)
      };
    });
  }

  public getCourseById(courseId: string): Course | undefined {
    const r = this.db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as any;
    if (!r) return undefined;
    const linkedClasses = this.getCourseClasses(String(r.id));
    const classIds = linkedClasses.length > 0 ? linkedClasses : [String(r.classId)];
    return {
      id: String(r.id),
      classId: String(r.classId),
      classIds,
      title: String(r.title),
      category: r.category as any,
      description: r.description ? String(r.description) : '',
      content: String(r.content),
      resourceLink: r.resourceLink ? String(r.resourceLink) : '',
      fileUrl: r.fileUrl ? String(r.fileUrl) : undefined,
      fileName: r.fileName ? String(r.fileName) : undefined,
      fileType: r.fileType ? String(r.fileType) : undefined,
      fileSize: r.fileSize ? Number(r.fileSize) : undefined,
      createdAt: String(r.createdAt)
    };
  }

  public createCourse(classId: string, data: {
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
  }): Course {
    const id = 'crs-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const createdAt = new Date().toISOString();

    const targetClasses = (Array.isArray(data.classIds) && data.classIds.length > 0)
      ? Array.from(new Set(data.classIds))
      : [classId];

    const primaryClassId = targetClasses[0] || classId;

    this.db.prepare(`
      INSERT INTO courses (
        id, classId, title, category, description, content, resourceLink,
        fileUrl, fileName, fileType, fileSize, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      primaryClassId,
      data.title.trim(),
      data.category,
      data.description?.trim() || '',
      data.content.trim(),
      data.resourceLink?.trim() || '',
      data.fileUrl || '',
      data.fileName || '',
      data.fileType || '',
      data.fileSize || 0,
      createdAt
    );

    const insertClassStmt = this.db.prepare('INSERT OR IGNORE INTO course_classes (courseId, classId) VALUES (?, ?)');
    for (const cid of targetClasses) {
      insertClassStmt.run(id, cid);
    }

    return {
      id,
      classId: primaryClassId,
      classIds: targetClasses,
      title: data.title.trim(),
      category: data.category,
      description: data.description?.trim() || '',
      content: data.content.trim(),
      resourceLink: data.resourceLink?.trim() || '',
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      createdAt
    };
  }

  public updateCourse(courseId: string, data: Partial<Course> & { classIds?: string[] }): Course {
    const existing = this.getCourseById(courseId);
    if (!existing) throw new Error('Cours introuvable');

    const title = data.title !== undefined ? data.title.trim() : existing.title;
    const category = data.category || existing.category;
    const description = data.description !== undefined ? data.description.trim() : existing.description;
    const content = data.content !== undefined ? data.content.trim() : existing.content;
    const resourceLink = data.resourceLink !== undefined ? data.resourceLink.trim() : existing.resourceLink;
    const fileUrl = data.fileUrl !== undefined ? data.fileUrl : (existing.fileUrl || '');
    const fileName = data.fileName !== undefined ? data.fileName : (existing.fileName || '');
    const fileType = data.fileType !== undefined ? data.fileType : (existing.fileType || '');
    const fileSize = data.fileSize !== undefined ? Number(data.fileSize) : (existing.fileSize || 0);

    let targetClasses = existing.classIds || [existing.classId];
    if (Array.isArray(data.classIds) && data.classIds.length > 0) {
      targetClasses = Array.from(new Set(data.classIds));
    }
    const primaryClassId = targetClasses[0] || existing.classId;

    this.db.prepare(`
      UPDATE courses
      SET title = ?, category = ?, description = ?, content = ?, resourceLink = ?,
          fileUrl = ?, fileName = ?, fileType = ?, fileSize = ?, classId = ?
      WHERE id = ?
    `).run(
      title,
      category,
      description || '',
      content,
      resourceLink || '',
      fileUrl,
      fileName,
      fileType,
      fileSize,
      primaryClassId,
      courseId
    );

    if (Array.isArray(data.classIds)) {
      this.db.prepare('DELETE FROM course_classes WHERE courseId = ?').run(courseId);
      const insertClassStmt = this.db.prepare('INSERT OR IGNORE INTO course_classes (courseId, classId) VALUES (?, ?)');
      for (const cid of targetClasses) {
        insertClassStmt.run(courseId, cid);
      }
    }

    return this.getCourseById(courseId)!;
  }

  public deleteCourse(courseId: string): boolean {
    this.db.prepare('DELETE FROM course_classes WHERE courseId = ?').run(courseId);
    const result = this.db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    return Number(result.changes) > 0;
  }

  // ==========================================
  // TESTS
  // ==========================================
  private getTestClasses(testId: string): string[] {
    try {
      const rows = this.db.prepare('SELECT classId FROM test_classes WHERE testId = ?').all(testId) as any[];
      return rows.map(r => String(r.classId));
    } catch {
      return [];
    }
  }

  public getTestsByClass(classId: string): TypingTest[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT t.* FROM tests t
      LEFT JOIN test_classes tc ON tc.testId = t.id
      WHERE t.classId = ? OR tc.classId = ?
      ORDER BY t.theme ASC, t.level ASC
    `).all(classId, classId) as any[];

    return rows.map((r) => {
      const linkedClasses = this.getTestClasses(String(r.id));
      const classIds = linkedClasses.length > 0 ? linkedClasses : [String(r.classId)];
      return {
        id: String(r.id),
        classId: String(r.classId),
        classIds,
        title: String(r.title),
        theme: r.theme as any,
        level: Number(r.level),
        timeLimitSeconds: Number(r.timeLimitSeconds),
        targetText: String(r.targetText),
        minAccuracyPercent: Number(r.minAccuracyPercent),
        minWpm: Number(r.minWpm),
        description: r.description ? String(r.description) : '',
        createdAt: String(r.createdAt)
      };
    });
  }

  public getTestById(testId: string): TypingTest | undefined {
    const r = this.db.prepare('SELECT * FROM tests WHERE id = ?').get(testId) as any;
    if (!r) return undefined;
    const linkedClasses = this.getTestClasses(String(r.id));
    const classIds = linkedClasses.length > 0 ? linkedClasses : [String(r.classId)];
    return {
      id: String(r.id),
      classId: String(r.classId),
      classIds,
      title: String(r.title),
      theme: r.theme as any,
      level: Number(r.level),
      timeLimitSeconds: Number(r.timeLimitSeconds),
      targetText: String(r.targetText),
      minAccuracyPercent: Number(r.minAccuracyPercent),
      minWpm: Number(r.minWpm),
      description: r.description ? String(r.description) : '',
      createdAt: String(r.createdAt)
    };
  }

  public createTest(classId: string, data: {
    title: string;
    theme: 'Word' | 'Excel' | 'Python' | 'Général';
    level: number;
    timeLimitSeconds: number;
    targetText: string;
    minAccuracyPercent?: number;
    minWpm?: number;
    description?: string;
    classIds?: string[];
  }): TypingTest {
    const id = 'tst-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const createdAt = new Date().toISOString();
    const minAccuracyPercent = data.minAccuracyPercent ? Number(data.minAccuracyPercent) : 80;
    const minWpm = data.minWpm ? Number(data.minWpm) : 15;

    const targetClasses = (Array.isArray(data.classIds) && data.classIds.length > 0)
      ? Array.from(new Set(data.classIds))
      : [classId];
    const primaryClassId = targetClasses[0] || classId;

    this.db.prepare(`
      INSERT INTO tests (
        id, classId, title, theme, level, timeLimitSeconds, targetText,
        minAccuracyPercent, minWpm, description, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      primaryClassId,
      data.title.trim(),
      data.theme,
      Number(data.level),
      Number(data.timeLimitSeconds),
      data.targetText.trim(),
      minAccuracyPercent,
      minWpm,
      data.description?.trim() || '',
      createdAt
    );

    const insertClassStmt = this.db.prepare('INSERT OR IGNORE INTO test_classes (testId, classId) VALUES (?, ?)');
    for (const cid of targetClasses) {
      insertClassStmt.run(id, cid);
    }

    return {
      id,
      classId: primaryClassId,
      classIds: targetClasses,
      title: data.title.trim(),
      theme: data.theme,
      level: Number(data.level),
      timeLimitSeconds: Number(data.timeLimitSeconds),
      targetText: data.targetText.trim(),
      minAccuracyPercent,
      minWpm,
      description: data.description?.trim() || '',
      createdAt
    };
  }

  public updateTest(testId: string, data: Partial<TypingTest> & { classIds?: string[] }): TypingTest {
    const existing = this.getTestById(testId);
    if (!existing) throw new Error('Test introuvable');

    const title = data.title !== undefined ? data.title.trim() : existing.title;
    const theme = data.theme || existing.theme;
    const level = data.level !== undefined ? Number(data.level) : existing.level;
    const timeLimitSeconds = data.timeLimitSeconds !== undefined ? Number(data.timeLimitSeconds) : existing.timeLimitSeconds;
    const targetText = data.targetText !== undefined ? data.targetText.trim() : existing.targetText;
    const minAccuracyPercent = data.minAccuracyPercent !== undefined ? Number(data.minAccuracyPercent) : existing.minAccuracyPercent;
    const minWpm = data.minWpm !== undefined ? Number(data.minWpm) : existing.minWpm;
    const description = data.description !== undefined ? data.description.trim() : existing.description;

    let targetClasses = existing.classIds || [existing.classId];
    if (Array.isArray(data.classIds) && data.classIds.length > 0) {
      targetClasses = Array.from(new Set(data.classIds));
    }
    const primaryClassId = targetClasses[0] || existing.classId;

    this.db.prepare(`
      UPDATE tests
      SET title = ?, theme = ?, level = ?, timeLimitSeconds = ?, targetText = ?,
          minAccuracyPercent = ?, minWpm = ?, description = ?, classId = ?
      WHERE id = ?
    `).run(
      title,
      theme,
      level,
      timeLimitSeconds,
      targetText,
      minAccuracyPercent,
      minWpm,
      description || '',
      primaryClassId,
      testId
    );

    if (Array.isArray(data.classIds)) {
      this.db.prepare('DELETE FROM test_classes WHERE testId = ?').run(testId);
      const insertClassStmt = this.db.prepare('INSERT OR IGNORE INTO test_classes (testId, classId) VALUES (?, ?)');
      for (const cid of targetClasses) {
        insertClassStmt.run(testId, cid);
      }
    }

    return this.getTestById(testId)!;
  }

  public deleteTest(testId: string): boolean {
    this.db.prepare('DELETE FROM test_classes WHERE testId = ?').run(testId);
    this.db.prepare('DELETE FROM test_evaluations WHERE testId = ?').run(testId);
    const result = this.db.prepare('DELETE FROM tests WHERE id = ?').run(testId);
    return Number(result.changes) > 0;
  }

  // ==========================================
  // PROGRESSION AND EVALUATIONS
  // ==========================================
  /**
   * Sequential unlock rule:
   * For each theme:
   * - Level 1 is always unlocked.
   * - Level N (N > 1) is unlocked if and only if Level N-1 was passed by the student.
   * - Otherwise remains locked ("inactive").
   */
  public getStudentTestsProgress(classId: string, studentId: string): StudentTestStatus[] {
    const tests = this.getTestsByClass(classId);

    // Get all evaluations for this student
    const evals = this.db.prepare(`
      SELECT * FROM test_evaluations
      WHERE studentId = ? AND classId = ?
    `).all(studentId, classId) as any[];

    // Map testId -> best evaluation (passed first, then highest score)
    const evalsByTestId = new Map<string, TestEvaluation>();
    for (const row of evals) {
      const evaluation: TestEvaluation = {
        id: String(row.id),
        testId: String(row.testId),
        studentId: String(row.studentId),
        classId: String(row.classId),
        wpm: Number(row.wpm),
        cpm: Number(row.cpm),
        accuracy: Number(row.accuracy),
        mistakesCount: Number(row.mistakesCount),
        timeSpentSeconds: Number(row.timeSpentSeconds),
        passed: Boolean(row.passed),
        score: Number(row.score),
        completedAt: String(row.completedAt)
      };

      const existing = evalsByTestId.get(evaluation.testId);
      if (!existing) {
        evalsByTestId.set(evaluation.testId, evaluation);
      } else {
        // Prefer passed evaluation, or higher score
        if (evaluation.passed && !existing.passed) {
          evalsByTestId.set(evaluation.testId, evaluation);
        } else if (evaluation.passed === existing.passed && evaluation.score > existing.score) {
          evalsByTestId.set(evaluation.testId, evaluation);
        }
      }
    }

    // Group tests by theme
    const themes = Array.from(new Set(tests.map(t => t.theme)));
    const results: StudentTestStatus[] = [];

    for (const theme of themes) {
      const themeTests = tests.filter(t => t.theme === theme).sort((a, b) => a.level - b.level);
      let canUnlockNext = true;

      for (let i = 0; i < themeTests.length; i++) {
        const test = themeTests[i];
        const bestEval = evalsByTestId.get(test.id);

        let isUnlocked = false;
        if (i === 0) {
          // Level 1 is always unlocked
          isUnlocked = true;
        } else {
          // Level N is unlocked if previous level is passed
          isUnlocked = canUnlockNext;
        }

        results.push({
          test,
          isUnlocked,
          bestEvaluation: bestEval
        });

        // For the subsequent level: can only unlock if THIS level is passed
        canUnlockNext = Boolean(bestEval && bestEval.passed);
      }
    }

    return results;
  }

  public submitTestEvaluation(studentId: string, testId: string, stats: {
    wpm: number;
    cpm: number;
    accuracy: number;
    mistakesCount: number;
    timeSpentSeconds: number;
  }): { evaluation: TestEvaluation; passed: boolean; nextLevelUnlocked: boolean } {
    const test = this.getTestById(testId);
    if (!test) throw new Error('Test introuvable');

    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    // Validation criteria:
    // Accuracy >= minAccuracy AND Wpm >= minWpm
    const passed = stats.accuracy >= test.minAccuracyPercent && stats.wpm >= test.minWpm;

    // Compute educational score out of 20
    // 50% accuracy component (10 pts) + 50% speed component (10 pts)
    const accuracyPoints = (stats.accuracy / 100) * 10;
    const speedRatio = Math.min(1.2, stats.wpm / Math.max(1, test.minWpm));
    const speedPoints = Math.min(10, speedRatio * 8 + (passed ? 2 : 0));
    const score = Math.min(20, Math.max(0, Math.round(accuracyPoints + speedPoints)));

    const id = 'evl-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const completedAt = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO test_evaluations (
        id, testId, studentId, classId, wpm, cpm, accuracy,
        mistakesCount, timeSpentSeconds, passed, score, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      testId,
      studentId,
      test.classId,
      Math.round(stats.wpm),
      Math.round(stats.cpm),
      Math.round(stats.accuracy),
      Math.round(stats.mistakesCount),
      Math.round(stats.timeSpentSeconds),
      passed ? 1 : 0,
      score,
      completedAt
    );

    const evaluation: TestEvaluation = {
      id,
      testId,
      studentId,
      classId: test.classId,
      wpm: Math.round(stats.wpm),
      cpm: Math.round(stats.cpm),
      accuracy: Math.round(stats.accuracy),
      mistakesCount: Math.round(stats.mistakesCount),
      timeSpentSeconds: Math.round(stats.timeSpentSeconds),
      passed,
      score,
      completedAt,
      studentName: `${student.firstName} ${student.lastName}`,
      testTitle: test.title,
      testLevel: test.level,
      testTheme: test.theme
    };

    return {
      evaluation,
      passed,
      nextLevelUnlocked: passed
    };
  }

  public getClassEvaluations(classId: string): ClassEvaluationsSummary {
    const students = this.getStudentsByClass(classId, false);
    const tests = this.getTestsByClass(classId);

    const evalsRows = this.db.prepare(`
      SELECT e.*, s.firstName, s.lastName, t.title as testTitle, t.level as testLevel, t.theme as testTheme
      FROM test_evaluations e
      JOIN students s ON s.id = e.studentId
      JOIN tests t ON t.id = e.testId
      WHERE e.classId = ?
      ORDER BY e.completedAt DESC
    `).all(classId) as any[];

    const evaluations: TestEvaluation[] = evalsRows.map((r) => ({
      id: String(r.id),
      testId: String(r.testId),
      studentId: String(r.studentId),
      classId: String(r.classId),
      wpm: Number(r.wpm),
      cpm: Number(r.cpm),
      accuracy: Number(r.accuracy),
      mistakesCount: Number(r.mistakesCount),
      timeSpentSeconds: Number(r.timeSpentSeconds),
      passed: Boolean(r.passed),
      score: Number(r.score),
      completedAt: String(r.completedAt),
      studentName: `${r.firstName} ${r.lastName}`,
      testTitle: String(r.testTitle),
      testLevel: Number(r.testLevel),
      testTheme: String(r.testTheme)
    }));

    const totalSubmissions = evaluations.length;
    const passedCount = evaluations.filter(e => e.passed).length;
    const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;
    const averageWpm = totalSubmissions > 0 ? Math.round(evaluations.reduce((acc, e) => acc + e.wpm, 0) / totalSubmissions) : 0;
    const averageAccuracy = totalSubmissions > 0 ? Math.round(evaluations.reduce((acc, e) => acc + e.accuracy, 0) / totalSubmissions) : 0;
    const averageScore = totalSubmissions > 0 ? Math.round((evaluations.reduce((acc, e) => acc + e.score, 0) / totalSubmissions) * 10) / 10 : 0;

    // Per-student summary
    const studentSummaries = students.map((std) => {
      const studentEvals = evaluations.filter(e => e.studentId === std.id);
      const passedTestsSet = new Set(studentEvals.filter(e => e.passed).map(e => e.testId));
      const testsPassedCount = passedTestsSet.size;
      const totalTestsAttempted = studentEvals.length;
      const avgScore = studentEvals.length > 0
        ? Math.round((studentEvals.reduce((acc, e) => acc + e.score, 0) / studentEvals.length) * 10) / 10
        : 0;
      const bestWpm = studentEvals.length > 0
        ? Math.max(...studentEvals.map(e => e.wpm))
        : 0;

      return {
        student: std,
        totalTestsAttempted,
        testsPassedCount,
        averageScore: avgScore,
        bestWpm,
        evaluations: studentEvals
      };
    });

    return {
      totalSubmissions,
      passedCount,
      passRate,
      averageWpm,
      averageAccuracy,
      averageScore,
      evaluations,
      studentSummaries
    };
  }

  // ==========================================
  // TEACHER AUTHENTICATION
  // ==========================================
  public getTeacher(): TeacherUser {
    const row = this.db.prepare('SELECT username, fullName, email FROM teachers LIMIT 1').get() as any;
    if (row) {
      return {
        username: String(row.username),
        fullName: String(row.fullName),
        email: String(row.email),
        role: 'teacher'
      };
    }
    return {
      username: 'prof',
      fullName: 'Prof. M. Laurent',
      email: 'm.laurent@college-intranet.fr',
      role: 'teacher'
    };
  }

  public authenticateTeacher(username: string, password: string): TeacherUser | null {
    const row = this.db.prepare(`
      SELECT username, fullName, email
      FROM teachers
      WHERE lower(username) = lower(?) AND passwordHash = ?
    `).get(username.trim(), password) as any;

    if (row) {
      return {
        username: String(row.username),
        fullName: String(row.fullName),
        email: String(row.email),
        role: 'teacher'
      };
    }
    return null;
  }

  // ==========================================
  // STUDENT AUTHENTICATION
  // ==========================================
  public authenticateStudent(classId: string, studentId: string, passwordAttempt: string): { student: Student; classInfo: ClassGroup } | null {
    const row = this.db.prepare(`
      SELECT s.*, c.name as className, c.level, c.academicYear, c.room, c.description, c.createdAt as classCreatedAt
      FROM students s
      JOIN classes c ON c.id = s.classId
      WHERE s.id = ? AND s.classId = ?
    `).get(studentId, classId) as any;

    if (!row) return null;

    const studentPassword = String(row.password || '');
    if (studentPassword.toLowerCase() === passwordAttempt.trim().toLowerCase()) {
      const now = new Date().toISOString();
      this.db.prepare('UPDATE students SET lastLogin = ? WHERE id = ?').run(now, studentId);

      const student = this.mapStudentRow({ ...row, lastLogin: now }, false);
      const classInfo: ClassGroup = {
        id: String(row.classId),
        name: String(row.className),
        level: String(row.level),
        academicYear: String(row.academicYear),
        room: row.room ? String(row.room) : '',
        description: row.description ? String(row.description) : '',
        createdAt: String(row.classCreatedAt)
      };

      return { student, classInfo };
    }

    return null;
  }

  public changeStudentPassword(studentId: string, oldPassword: string, newPassword: string): boolean {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    if (student.password !== oldPassword.trim()) {
      throw new Error('L’ancien mot de passe est incorrect.');
    }

    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('Le nouveau mot de passe doit comporter au moins 4 caractères.');
    }

    this.db.prepare('UPDATE students SET password = ?, hasChangedPassword = 1 WHERE id = ?').run(
      newPassword.trim(),
      studentId
    );
    return true;
  }

  public updateStudentSelfProfile(studentId: string, details: { email?: string; notes?: string }): Student {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    const email = details.email !== undefined ? details.email.trim() : student.email;
    const notes = details.notes !== undefined ? details.notes.trim() : student.notes;

    this.db.prepare('UPDATE students SET email = ?, notes = ? WHERE id = ?').run(email || '', notes || '', studentId);
    return this.getStudentById(studentId)!;
  }

  // ==========================================
  // QCM (QUIZ) MANAGEMENT & EVALUATION
  // ==========================================
  public getQCMsByClass(classId: string, forStudent = false): QCM[] {
    const query = forStudent
      ? `SELECT DISTINCT q.* FROM qcms q
         WHERE (q.classId = ? OR q.id IN (SELECT qcmId FROM qcm_classes WHERE classId = ?))
         AND q.isActive = 1
         ORDER BY q.createdAt ASC`
      : `SELECT DISTINCT q.* FROM qcms q
         WHERE (q.classId = ? OR q.id IN (SELECT qcmId FROM qcm_classes WHERE classId = ?))
         ORDER BY q.createdAt ASC`;

    const rows = this.db.prepare(query).all(classId, classId) as any[];

    return rows.map(r => {
      const qCount = (this.db.prepare('SELECT COUNT(*) as c FROM qcm_questions WHERE qcmId = ?').get(r.id) as any)?.c || 0;
      const sCount = (this.db.prepare('SELECT COUNT(*) as c FROM qcm_submissions WHERE qcmId = ?').get(r.id) as any)?.c || 0;

      const classRows = this.db.prepare('SELECT classId FROM qcm_classes WHERE qcmId = ?').all(r.id) as any[];
      let classIds = classRows.map(c => String(c.classId));
      if (classIds.length === 0 && r.classId) {
        classIds = [String(r.classId)];
      }

      return {
        id: String(r.id),
        classId: String(r.classId),
        title: String(r.title),
        description: r.description ? String(r.description) : '',
        category: r.category as any,
        durationMinutes: Number(r.durationMinutes || 0),
        totalPoints: Number(r.totalPoints || 20),
        isActive: Boolean(r.isActive),
        createdAt: String(r.createdAt),
        questionCount: qCount,
        submissionsCount: sCount,
        classIds
      };
    });
  }

  public getQCMById(qcmId: string, hideAnswers = false): QCM | null {
    const row = this.db.prepare('SELECT * FROM qcms WHERE id = ?').get(qcmId) as any;
    if (!row) return null;

    const questionsRows = this.db.prepare(`
      SELECT * FROM qcm_questions WHERE qcmId = ? ORDER BY questionOrder ASC
    `).all(qcmId) as any[];

    const questions: QCMQuestion[] = questionsRows.map(q => ({
      id: String(q.id),
      qcmId: String(q.qcmId),
      questionOrder: Number(q.questionOrder),
      questionText: String(q.questionText),
      optionA: String(q.optionA),
      optionB: String(q.optionB),
      optionC: String(q.optionC),
      optionD: String(q.optionD),
      correctOption: hideAnswers ? ('' as any) : (q.correctOption as any),
      points: Number(q.points),
      explanation: hideAnswers ? undefined : (q.explanation ? String(q.explanation) : undefined)
    }));

    const sCount = (this.db.prepare('SELECT COUNT(*) as c FROM qcm_submissions WHERE qcmId = ?').get(qcmId) as any)?.c || 0;

    const classRows = this.db.prepare('SELECT classId FROM qcm_classes WHERE qcmId = ?').all(qcmId) as any[];
    let classIds = classRows.map(c => String(c.classId));
    if (classIds.length === 0 && row.classId) {
      classIds = [String(row.classId)];
    }

    return {
      id: String(row.id),
      classId: String(row.classId),
      title: String(row.title),
      description: row.description ? String(row.description) : '',
      category: row.category as any,
      durationMinutes: Number(row.durationMinutes || 0),
      totalPoints: Number(row.totalPoints || 20),
      isActive: Boolean(row.isActive),
      createdAt: String(row.createdAt),
      questionCount: questions.length,
      submissionsCount: sCount,
      questions,
      classIds
    };
  }

  public createQCM(classId: string, data: {
    title: string;
    description?: string;
    category?: 'Word' | 'Excel' | 'Python' | 'Général';
    durationMinutes?: number;
    totalPoints?: number;
    isActive?: boolean;
    classIds?: string[];
  }): QCM {
    const id = 'qcm-' + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString();
    const duration = data.durationMinutes !== undefined ? Number(data.durationMinutes) : 0;
    const totalPoints = data.totalPoints !== undefined ? Number(data.totalPoints) : 20;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1;

    const targetClassIds = (data.classIds && data.classIds.length > 0)
      ? Array.from(new Set(data.classIds.filter(Boolean)))
      : (classId ? [classId] : []);

    let primaryClassId = targetClassIds[0] || classId;
    if (!primaryClassId) {
      const firstClass = this.db.prepare('SELECT id FROM classes LIMIT 1').get() as { id: string } | undefined;
      primaryClassId = firstClass?.id || 'all';
      if (targetClassIds.length === 0) {
        targetClassIds.push(primaryClassId);
      }
    }

    this.db.prepare(`
      INSERT INTO qcms (id, classId, title, description, category, durationMinutes, totalPoints, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      primaryClassId,
      data.title.trim(),
      data.description?.trim() || '',
      data.category || 'Général',
      duration,
      totalPoints,
      isActive,
      createdAt
    );

    const insertClassStmt = this.db.prepare('INSERT OR IGNORE INTO qcm_classes (qcmId, classId) VALUES (?, ?)');
    for (const cid of targetClassIds) {
      insertClassStmt.run(id, cid);
    }

    return this.getQCMById(id)!;
  }

  public updateQCM(qcmId: string, data: Partial<{
    title: string;
    description: string;
    category: 'Word' | 'Excel' | 'Python' | 'Général';
    durationMinutes: number;
    totalPoints: number;
    isActive: boolean;
    classIds: string[];
  }>): QCM {
    const existing = this.getQCMById(qcmId);
    if (!existing) throw new Error('QCM introuvable');

    const title = data.title !== undefined ? data.title.trim() : existing.title;
    const description = data.description !== undefined ? data.description.trim() : (existing.description || '');
    const category = data.category !== undefined ? data.category : existing.category;
    const duration = data.durationMinutes !== undefined ? Number(data.durationMinutes) : existing.durationMinutes;
    const totalPoints = data.totalPoints !== undefined ? Number(data.totalPoints) : existing.totalPoints;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : (existing.isActive ? 1 : 0);

    let newPrimaryClassId = existing.classId;

    if (data.classIds !== undefined) {
      const targetClassIds = Array.from(new Set(data.classIds.filter(Boolean)));
      if (targetClassIds.length > 0) {
        newPrimaryClassId = targetClassIds[0];
        this.db.prepare('DELETE FROM qcm_classes WHERE qcmId = ?').run(qcmId);
        const insertClassStmt = this.db.prepare('INSERT OR IGNORE INTO qcm_classes (qcmId, classId) VALUES (?, ?)');
        for (const cid of targetClassIds) {
          insertClassStmt.run(qcmId, cid);
        }
      }
    }

    this.db.prepare(`
      UPDATE qcms
      SET classId = ?, title = ?, description = ?, category = ?, durationMinutes = ?, totalPoints = ?, isActive = ?
      WHERE id = ?
    `).run(newPrimaryClassId, title, description, category, duration, totalPoints, isActive, qcmId);

    return this.getQCMById(qcmId)!;
  }

  public deleteQCM(qcmId: string): boolean {
    this.db.prepare('DELETE FROM qcm_classes WHERE qcmId = ?').run(qcmId);
    this.db.prepare('DELETE FROM qcm_submissions WHERE qcmId = ?').run(qcmId);
    this.db.prepare('DELETE FROM qcm_questions WHERE qcmId = ?').run(qcmId);
    const res = this.db.prepare('DELETE FROM qcms WHERE id = ?').run(qcmId);
    return res.changes > 0;
  }

  public importQCMQuestions(qcmId: string, rawTextOrQuestions: string | any[], replaceExisting = true): QCM {
    const qcm = this.getQCMById(qcmId);
    if (!qcm) throw new Error('QCM introuvable');

    let questionsToInsert: Array<{
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: 'A' | 'B' | 'C' | 'D';
      points: number;
      explanation?: string;
    }> = [];

    if (typeof rawTextOrQuestions === 'string') {
      const parsed = parseQcmImportText(rawTextOrQuestions);
      const valids = parsed.questions.filter(q => q.isValid);
      if (valids.length === 0) {
        throw new Error('Aucune question valide détectée. Attendu : Question? | Réponse A | Réponse B | Réponse C | Réponse D | Bonne réponse | Points');
      }
      questionsToInsert = valids;
    } else if (Array.isArray(rawTextOrQuestions)) {
      questionsToInsert = rawTextOrQuestions.filter(q => q.questionText && q.optionA && q.optionB);
    }

    if (replaceExisting) {
      this.db.prepare('DELETE FROM qcm_questions WHERE qcmId = ?').run(qcmId);
    }

    const maxOrderRow = this.db.prepare('SELECT MAX(questionOrder) as maxO FROM qcm_questions WHERE qcmId = ?').get(qcmId) as any;
    let nextOrder = (maxOrderRow?.maxO || 0) + 1;

    const insertStmt = this.db.prepare(`
      INSERT INTO qcm_questions (
        id, qcmId, questionOrder, questionText, optionA, optionB, optionC, optionD,
        correctOption, points, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const q of questionsToInsert) {
      const qId = 'qst-' + Math.random().toString(36).substring(2, 9);
      insertStmt.run(
        qId,
        qcmId,
        nextOrder++,
        q.questionText.trim(),
        q.optionA.trim(),
        q.optionB.trim(),
        q.optionC ? q.optionC.trim() : '',
        q.optionD ? q.optionD.trim() : '',
        q.correctOption || 'A',
        q.points !== undefined ? Number(q.points) : 1,
        q.explanation ? q.explanation.trim() : ''
      );
    }

    return this.getQCMById(qcmId)!;
  }

  public addQCMQuestion(qcmId: string, data: {
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    points?: number;
    explanation?: string;
  }): QCMQuestion {
    const qcm = this.getQCMById(qcmId);
    if (!qcm) throw new Error('QCM introuvable');

    const maxOrderRow = this.db.prepare('SELECT MAX(questionOrder) as maxO FROM qcm_questions WHERE qcmId = ?').get(qcmId) as any;
    const nextOrder = (maxOrderRow?.maxO || 0) + 1;
    const qId = 'qst-' + Math.random().toString(36).substring(2, 9);

    this.db.prepare(`
      INSERT INTO qcm_questions (
        id, qcmId, questionOrder, questionText, optionA, optionB, optionC, optionD,
        correctOption, points, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      qId,
      qcmId,
      nextOrder,
      data.questionText.trim(),
      data.optionA.trim(),
      data.optionB.trim(),
      data.optionC?.trim() || '',
      data.optionD?.trim() || '',
      data.correctOption || 'A',
      data.points !== undefined ? Number(data.points) : 1,
      data.explanation?.trim() || ''
    );

    const created = this.db.prepare('SELECT * FROM qcm_questions WHERE id = ?').get(qId) as any;
    return {
      id: String(created.id),
      qcmId: String(created.qcmId),
      questionOrder: Number(created.questionOrder),
      questionText: String(created.questionText),
      optionA: String(created.optionA),
      optionB: String(created.optionB),
      optionC: String(created.optionC),
      optionD: String(created.optionD),
      correctOption: created.correctOption as any,
      points: Number(created.points),
      explanation: created.explanation ? String(created.explanation) : undefined
    };
  }

  public deleteQCMQuestion(questionId: string): boolean {
    const res = this.db.prepare('DELETE FROM qcm_questions WHERE id = ?').run(questionId);
    return res.changes > 0;
  }

  public getStudentQCMsProgress(classId: string, studentId: string): StudentQCMStatus[] {
    const qcms = this.getQCMsByClass(classId, true);

    return qcms.map(qcm => {
      const subRow = this.db.prepare(`
        SELECT * FROM qcm_submissions
        WHERE qcmId = ? AND studentId = ?
        ORDER BY completedAt DESC
        LIMIT 1
      `).get(qcm.id, studentId) as any;

      let submission: QCMSubmission | undefined;
      if (subRow) {
        let answers = {};
        try {
          answers = JSON.parse(subRow.answersJson);
        } catch {}

        submission = {
          id: String(subRow.id),
          qcmId: String(subRow.qcmId),
          studentId: String(subRow.studentId),
          classId: String(subRow.classId),
          totalScore: Number(subRow.totalScore),
          maxScore: Number(subRow.maxScore),
          score20: Number(subRow.score20),
          answersJson: answers,
          timeSpentSeconds: Number(subRow.timeSpentSeconds),
          completedAt: String(subRow.completedAt)
        };
      }

      return {
        qcm,
        isCompleted: Boolean(submission),
        submission
      };
    });
  }

  public submitQCM(studentId: string, qcmId: string, answers: Record<string, string>, timeSpentSeconds: number): QCMSubmission {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    const qcm = this.getQCMById(qcmId, false);
    if (!qcm) throw new Error('QCM introuvable');
    if (!qcm.questions || qcm.questions.length === 0) throw new Error('Ce QCM ne comporte aucune question.');

    let totalScore = 0;
    let maxScore = 0;
    const detailedAnswers: Record<string, { chosen: 'A' | 'B' | 'C' | 'D' | ''; isCorrect: boolean; pointsEarned: number }> = {};

    for (const q of qcm.questions) {
      const chosen = (answers[q.id] || '').toUpperCase().trim() as 'A' | 'B' | 'C' | 'D' | '';
      const isCorrect = chosen === q.correctOption;
      const points = Number(q.points) || 1;
      maxScore += points;

      const pointsEarned = isCorrect ? points : 0;
      totalScore += pointsEarned;

      detailedAnswers[q.id] = {
        chosen,
        isCorrect,
        pointsEarned
      };
    }

    if (maxScore === 0) maxScore = 1;
    const score20 = Math.round((totalScore / maxScore) * 20 * 10) / 10;
    const completedAt = new Date().toISOString();

    // Check if a previous official submission exists for this student on this QCM
    const existingSubRow = this.db.prepare(`
      SELECT * FROM qcm_submissions
      WHERE qcmId = ? AND studentId = ?
      ORDER BY completedAt ASC
      LIMIT 1
    `).get(qcmId, studentId) as any;

    const isPractice = Boolean(existingSubRow);
    const subId = existingSubRow ? ('practice-' + Math.random().toString(36).substring(2, 9)) : ('sub-' + Math.random().toString(36).substring(2, 9));

    // ONLY the very first validation is recorded and graded in the database!
    if (!isPractice) {
      this.db.prepare(`
        INSERT INTO qcm_submissions (
          id, qcmId, studentId, classId, totalScore, maxScore, score20, answersJson, timeSpentSeconds, completedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subId,
        qcmId,
        studentId,
        student.classId,
        Math.round(totalScore * 10) / 10,
        Math.round(maxScore * 10) / 10,
        score20,
        JSON.stringify(detailedAnswers),
        Number(timeSpentSeconds) || 0,
        completedAt
      );
    }

    return {
      id: subId,
      qcmId,
      studentId,
      classId: student.classId,
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore: Math.round(maxScore * 10) / 10,
      score20,
      answersJson: detailedAnswers,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
      completedAt,
      studentName: `${student.firstName} ${student.lastName}`,
      qcmTitle: qcm.title,
      isPractice,
      officialScore20: existingSubRow ? Number(existingSubRow.score20) : score20
    };
  }

  public getQCMEvaluations(qcmId: string): QCMEvaluationSummary {
    const qcm = this.getQCMById(qcmId, false);
    if (!qcm) throw new Error('QCM introuvable');

    const subsRows = this.db.prepare(`
      SELECT qs.*, s.firstName, s.lastName, s.studentNumber
      FROM qcm_submissions qs
      JOIN students s ON s.id = qs.studentId
      WHERE qs.qcmId = ?
      ORDER BY qs.score20 DESC, qs.completedAt DESC
    `).all(qcmId) as any[];

    const submissions: Array<QCMSubmission & { studentName: string; studentNumber: string }> = subsRows.map(row => {
      let answersJson = {};
      try { answersJson = JSON.parse(row.answersJson); } catch {}
      return {
        id: String(row.id),
        qcmId: String(row.qcmId),
        studentId: String(row.studentId),
        classId: String(row.classId),
        totalScore: Number(row.totalScore),
        maxScore: Number(row.maxScore),
        score20: Number(row.score20),
        answersJson,
        timeSpentSeconds: Number(row.timeSpentSeconds),
        completedAt: String(row.completedAt),
        studentName: `${row.lastName.toUpperCase()} ${row.firstName}`,
        studentNumber: String(row.studentNumber || ''),
        qcmTitle: qcm.title
      };
    });

    const totalSubmissions = submissions.length;
    let sumScore20 = 0;
    let highestScore20 = 0;
    let lowestScore20 = totalSubmissions > 0 ? 20 : 0;

    for (const sub of submissions) {
      sumScore20 += sub.score20;
      if (sub.score20 > highestScore20) highestScore20 = sub.score20;
      if (sub.score20 < lowestScore20) lowestScore20 = sub.score20;
    }

    const averageScore20 = totalSubmissions > 0 ? Math.round((sumScore20 / totalSubmissions) * 10) / 10 : 0;

    const questionStats = (qcm.questions || []).map(q => {
      let correctAnswers = 0;
      let totalAnswers = 0;

      for (const sub of submissions) {
        const ans = sub.answersJson[q.id];
        if (ans) {
          totalAnswers++;
          if (ans.isCorrect) correctAnswers++;
        }
      }

      const successRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      return {
        questionId: q.id,
        questionOrder: q.questionOrder,
        questionText: q.questionText,
        totalAnswers,
        correctAnswers,
        successRate
      };
    });

    return {
      qcm,
      totalSubmissions,
      averageScore20,
      highestScore20,
      lowestScore20,
      submissions,
      questionStats
    };
  }

  // ==========================================
  // ATTENDANCE SESSIONS & RECORDS
  // ==========================================
  public getAttendanceSessions(classId: string): AttendanceSession[] {
    const sessions = this.db.prepare(`
      SELECT s.*,
        COUNT(r.id) as totalStudents,
        SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as presentCount,
        SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as absentCount,
        SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as lateCount,
        SUM(CASE WHEN r.status = 'excused' THEN 1 ELSE 0 END) as excusedCount
      FROM attendance_sessions s
      LEFT JOIN attendance_records r ON r.sessionId = s.id
      WHERE s.classId = ?
      GROUP BY s.id
      ORDER BY s.date DESC, s.createdAt DESC
    `).all(classId) as any[];

    return sessions.map((s) => ({
      id: String(s.id),
      classId: String(s.classId),
      title: String(s.title),
      date: String(s.date),
      startTime: s.startTime ? String(s.startTime) : '',
      endTime: s.endTime ? String(s.endTime) : '',
      notes: s.notes ? String(s.notes) : '',
      createdAt: String(s.createdAt),
      totalStudents: Number(s.totalStudents || 0),
      presentCount: Number(s.presentCount || 0),
      absentCount: Number(s.absentCount || 0),
      lateCount: Number(s.lateCount || 0),
      excusedCount: Number(s.excusedCount || 0)
    }));
  }

  public getAttendanceSessionDetails(sessionId: string): AttendanceSession | null {
    const session = this.db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) return null;

    const records = this.db.prepare(`
      SELECT
        s.id as studentId,
        s.firstName,
        s.lastName,
        s.studentNumber,
        s.isRepeating,
        COALESCE(r.id, '') as recordId,
        COALESCE(r.status, 'present') as status,
        COALESCE(r.notes, '') as recordNotes,
        COALESCE(r.optionsJson, '[]') as optionsJson,
        COALESCE(r.score, 0) as score,
        COALESCE(r.markedByStudentAt, '') as markedByStudentAt,
        COALESCE(r.activityFileUrl, '') as activityFileUrl,
        COALESCE(r.activityFileName, '') as activityFileName,
        COALESCE(r.activityFileType, '') as activityFileType,
        COALESCE(r.activityFileSize, 0) as activityFileSize,
        COALESCE(r.activityUploadedAt, '') as activityUploadedAt,
        COALESCE(r.updatedAt, '') as updatedAt
      FROM students s
      LEFT JOIN attendance_records r ON r.studentId = s.id AND r.sessionId = ?
      WHERE s.classId = ?
      ORDER BY s.lastName COLLATE NOCASE ASC, s.firstName COLLATE NOCASE ASC
    `).all(sessionId, session.classId) as any[];

    const formattedRecords: AttendanceRecord[] = records.map((r) => {
      let parsedOptions: any[] = [];
      try {
        parsedOptions = JSON.parse(r.optionsJson || '[]');
      } catch {
        parsedOptions = [];
      }
      return {
        id: r.recordId || `att-${session.id}-${r.studentId}`,
        sessionId: String(session.id),
        studentId: String(r.studentId),
        status: (r.status || 'present') as AttendanceStatus,
        notes: String(r.recordNotes || ''),
        optionsJson: String(r.optionsJson || '[]'),
        score: Number(r.score || 0),
        options: parsedOptions,
        markedByStudentAt: r.markedByStudentAt ? String(r.markedByStudentAt) : undefined,
        activityFileUrl: r.activityFileUrl ? String(r.activityFileUrl) : undefined,
        activityFileName: r.activityFileName ? String(r.activityFileName) : undefined,
        activityFileType: r.activityFileType ? String(r.activityFileType) : undefined,
        activityFileSize: Number(r.activityFileSize || 0),
        activityUploadedAt: r.activityUploadedAt ? String(r.activityUploadedAt) : undefined,
        updatedAt: r.updatedAt ? String(r.updatedAt) : new Date().toISOString(),
        studentName: `${r.firstName} ${r.lastName}`,
        studentNumber: String(r.studentNumber || ''),
        isRepeating: Boolean(r.isRepeating)
      };
    });

    const presentCount = formattedRecords.filter(r => r.status === 'present').length;
    const absentCount = formattedRecords.filter(r => r.status === 'absent').length;
    const lateCount = formattedRecords.filter(r => r.status === 'late').length;
    const excusedCount = formattedRecords.filter(r => r.status === 'excused').length;

    return {
      id: String(session.id),
      classId: String(session.classId),
      title: String(session.title),
      date: String(session.date),
      startTime: session.startTime ? String(session.startTime) : '',
      endTime: session.endTime ? String(session.endTime) : '',
      notes: session.notes ? String(session.notes) : '',
      createdAt: String(session.createdAt),
      totalStudents: formattedRecords.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      records: formattedRecords
    };
  }

  public createAttendanceSession(classId: string, data: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    initialStatus?: AttendanceStatus;
  }): AttendanceSession {
    const classObj = this.getClassById(classId);
    if (!classObj) throw new Error('Classe introuvable');

    const sessionId = 'att-sess-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const now = new Date().toISOString();
    const date = data.date ? data.date.trim() : now.substring(0, 10);
    const title = data.title ? data.title.trim() : `Séance du ${date}`;
    const initialStatus = data.initialStatus || 'present';

    this.db.prepare(`
      INSERT INTO attendance_sessions (id, classId, title, date, startTime, endTime, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      classId,
      title,
      date,
      data.startTime?.trim() || '',
      data.endTime?.trim() || '',
      data.notes?.trim() || '',
      now
    );

    const students = this.getStudentsByClass(classId);
    const insRecord = this.db.prepare(`
      INSERT OR REPLACE INTO attendance_records (id, sessionId, studentId, status, notes, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const st of students) {
      insRecord.run(
        `att-${sessionId}-${st.id}`,
        sessionId,
        st.id,
        initialStatus,
        '',
        now
      );
    }

    return this.getAttendanceSessionDetails(sessionId)!;
  }

  public updateAttendanceSessionInfo(sessionId: string, data: {
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
  }): AttendanceSession {
    const session = this.getAttendanceSessionDetails(sessionId);
    if (!session) throw new Error('Séance introuvable');

    this.db.prepare(`
      UPDATE attendance_sessions
      SET title = COALESCE(?, title),
          date = COALESCE(?, date),
          startTime = COALESCE(?, startTime),
          endTime = COALESCE(?, endTime),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      data.title?.trim() || null,
      data.date?.trim() || null,
      data.startTime !== undefined ? data.startTime.trim() : null,
      data.endTime !== undefined ? data.endTime.trim() : null,
      data.notes !== undefined ? data.notes.trim() : null,
      sessionId
    );

    return this.getAttendanceSessionDetails(sessionId)!;
  }

  public saveAttendanceRecords(sessionId: string, records: Array<{
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
    optionsJson?: string;
    score?: number;
  }>): boolean {
    const session = this.db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) throw new Error('Séance introuvable');

    const now = new Date().toISOString();
    const upsertStmt = this.db.prepare(`
      INSERT INTO attendance_records (id, sessionId, studentId, status, notes, optionsJson, score, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sessionId, studentId) DO UPDATE SET
        status = excluded.status,
        notes = excluded.notes,
        optionsJson = excluded.optionsJson,
        score = excluded.score,
        updatedAt = excluded.updatedAt
    `);

    this.db.exec('BEGIN TRANSACTION;');
    try {
      for (const rec of records) {
        upsertStmt.run(
          `att-${sessionId}-${rec.studentId}`,
          sessionId,
          rec.studentId,
          rec.status,
          rec.notes || '',
          rec.optionsJson || '[]',
          rec.score !== undefined ? Number(rec.score) : 0,
          now
        );
      }
      this.db.exec('COMMIT;');
      return true;
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  public deleteAttendanceSession(sessionId: string): boolean {
    this.db.prepare('DELETE FROM attendance_records WHERE sessionId = ?').run(sessionId);
    const res = this.db.prepare('DELETE FROM attendance_sessions WHERE id = ?').run(sessionId);
    return Number(res.changes) > 0;
  }

  public getClassAttendanceSummary(classId: string): StudentAttendanceSummary[] {
    const students = this.getStudentsByClass(classId);
    const totalSessionsRow = this.db.prepare('SELECT COUNT(*) as count FROM attendance_sessions WHERE classId = ?').get(classId) as any;
    const totalSessions = Number(totalSessionsRow?.count || 0);

    const summaries: StudentAttendanceSummary[] = [];

    const statsStmt = this.db.prepare(`
      SELECT
        COUNT(r.id) as totalRecorded,
        SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as presentCount,
        SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as absentCount,
        SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as lateCount,
        SUM(CASE WHEN r.status = 'excused' THEN 1 ELSE 0 END) as excusedCount,
        SUM(COALESCE(r.score, 0)) as totalScore,
        SUM(CASE WHEN r.optionsJson LIKE '%absence_cahier%' OR r.optionsJson LIKE '%opt-no-notebook%' THEN 1 ELSE 0 END) as noNotebookCount,
        SUM(CASE WHEN r.optionsJson LIKE '%exclu%' OR r.optionsJson LIKE '%opt-excluded%' THEN 1 ELSE 0 END) as excludedCount
      FROM attendance_records r
      JOIN attendance_sessions s ON s.id = r.sessionId
      WHERE s.classId = ? AND r.studentId = ?
    `);

    for (const st of students) {
      const row = statsStmt.get(classId, st.id) as any;
      const presentCount = Number(row?.presentCount || 0);
      const absentCount = Number(row?.absentCount || 0);
      const lateCount = Number(row?.lateCount || 0);
      const excusedCount = Number(row?.excusedCount || 0);
      const effectiveTotal = presentCount + absentCount + lateCount + excusedCount;
      const attendanceRate = effectiveTotal > 0 ? Math.round(((presentCount + (lateCount * 0.8)) / effectiveTotal) * 100) : 100;

      summaries.push({
        studentId: st.id,
        firstName: st.firstName,
        lastName: st.lastName,
        studentNumber: st.studentNumber,
        isRepeating: Boolean(st.isRepeating),
        totalSessions,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate,
        disciplineScore: Number(row?.totalScore || 0),
        noNotebookCount: Number(row?.noNotebookCount || 0),
        excludedCount: Number(row?.excludedCount || 0)
      });
    }

    return summaries;
  }

  public getClassDisciplineSummary(classId: string): ClassDisciplineStats {
    const students = this.getStudentsByClass(classId);
    const totalSessionsRow = this.db.prepare('SELECT COUNT(*) as count FROM attendance_sessions WHERE classId = ?').get(classId) as any;
    const totalSessions = Number(totalSessionsRow?.count || 0);

    let totalNoNotebook = 0;
    let totalExcluded = 0;
    let totalUnprepared = 0;
    let totalChatter = 0;
    let totalMissingMaterial = 0;
    let totalParticipation = 0;
    let totalTravailSerieux = 0;
    let totalPositive = 0;
    let totalAbsences = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let scoreSum = 0;

    const studentRecordsStmt = this.db.prepare(`
      SELECT
        r.optionsJson,
        r.score,
        r.notes,
        r.status,
        s.title as sessionTitle,
        s.date as sessionDate
      FROM attendance_records r
      JOIN attendance_sessions s ON s.id = r.sessionId
      WHERE s.classId = ? AND r.studentId = ?
      ORDER BY s.date DESC
    `);

    const studentStats: ClassDisciplineStats['studentStats'] = [];
    const studentSummaries: NonNullable<ClassDisciplineStats['studentSummaries']> = [];

    for (const st of students) {
      const records = studentRecordsStmt.all(classId, st.id) as any[];
      let cumulativeScore = 0;
      let noNotebookCount = 0;
      let excludedCount = 0;
      let unpreparedCount = 0;
      let chatterCount = 0;
      let missingMaterialCount = 0;
      let participationCount = 0;
      let travailSerieuxCount = 0;
      let positiveCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      let presentCount = 0;
      let lastObservation: string | undefined = undefined;

      for (const rec of records) {
        cumulativeScore += Number(rec.score || 0);
        if (rec.notes && rec.notes.trim() && !lastObservation) {
          lastObservation = String(rec.notes.trim());
        }

        const status = (rec.status || 'present') as AttendanceStatus;
        if (status === 'absent') {
          absentCount++;
          totalAbsences++;
        } else if (status === 'late') {
          lateCount++;
          totalLate++;
        } else if (status === 'excused') {
          excusedCount++;
          totalExcused++;
        } else if (status === 'present') {
          presentCount++;
        }

        const optStr = String(rec.optionsJson || '');
        if (optStr.includes('absence_cahier') || optStr.includes('opt-no-notebook')) {
          noNotebookCount++;
          totalNoNotebook++;
        }
        if (optStr.includes('exclu') || optStr.includes('opt-excluded')) {
          excludedCount++;
          totalExcluded++;
        }
        if (optStr.includes('oubli_materiel') || optStr.includes('opt-no-material')) {
          missingMaterialCount++;
          totalMissingMaterial++;
        }
        if (optStr.includes('travail_non_fait') || optStr.includes('opt-unprepared')) {
          unpreparedCount++;
          totalUnprepared++;
        }
        if (optStr.includes('bavardage') || optStr.includes('opt-chatter')) {
          chatterCount++;
          totalChatter++;
        }
        if (optStr.includes('participation') || optStr.includes('opt-participated')) {
          participationCount++;
          totalParticipation++;
          positiveCount++;
          totalPositive++;
        }
        if (optStr.includes('travail_serieux') || optStr.includes('opt-bonus')) {
          travailSerieuxCount++;
          totalTravailSerieux++;
          positiveCount++;
          totalPositive++;
        }
      }

      scoreSum += cumulativeScore;
      const totalEffective = presentCount + absentCount + lateCount + excusedCount;
      const attendanceRate = totalEffective > 0 ? Math.round(((presentCount + (lateCount * 0.8)) / totalEffective) * 100) : 100;
      const totalStudentAbsences = absentCount + excusedCount;

      studentStats.push({
        studentId: st.id,
        firstName: st.firstName,
        lastName: st.lastName,
        studentNumber: st.studentNumber,
        isRepeating: Boolean(st.isRepeating),
        cumulativeScore,
        absentCount,
        excusedCount,
        lateCount,
        presentCount,
        totalAbsences: totalStudentAbsences,
        attendanceRate,
        noNotebookCount,
        excludedCount,
        unpreparedCount,
        chatterCount,
        missingMaterialCount,
        positiveCount,
        lastObservation
      });

      studentSummaries.push({
        id: st.id,
        studentId: st.id,
        firstName: st.firstName,
        lastName: st.lastName,
        studentNumber: st.studentNumber,
        isRepeating: Boolean(st.isRepeating),
        totalScore: cumulativeScore,
        absentCount,
        excusedCount,
        lateCount,
        presentCount,
        totalAbsences: totalStudentAbsences,
        attendanceRate,
        optionCounts: {
          absence_cahier: noNotebookCount,
          exclu: excludedCount,
          oubli_materiel: missingMaterialCount,
          travail_non_fait: unpreparedCount,
          bavardage: chatterCount,
          participation: participationCount,
          travail_serieux: travailSerieuxCount
        },
        lastNotes: lastObservation
      });
    }

    const averageScore = students.length > 0 ? Number((scoreSum / students.length).toFixed(1)) : 0;

    return {
      totalSessions,
      totalAbsences,
      totalLate,
      totalExcused,
      totalNoNotebook,
      totalExcluded,
      totalUnprepared,
      totalChatter,
      totalMissingMaterial,
      totalPositive,
      averageScore,
      globalCounts: {
        absence_cahier: totalNoNotebook,
        exclu: totalExcluded,
        oubli_materiel: totalMissingMaterial,
        travail_non_fait: totalUnprepared,
        bavardage: totalChatter,
        participation: totalParticipation,
        travail_serieux: totalTravailSerieux,
        absences: totalAbsences,
        retards: totalLate,
        excuses: totalExcused
      },
      studentSummaries,
      studentStats
    };
  }

  public getStudentAttendanceHistory(studentId: string): {
    summary: StudentAttendanceSummary;
    history: Array<{
      sessionId: string;
      sessionTitle: string;
      sessionDate: string;
      startTime?: string;
      endTime?: string;
      status: AttendanceStatus;
      notes?: string;
    }>;
  } {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    const records = this.db.prepare(`
      SELECT
        s.id as sessionId,
        s.title as sessionTitle,
        s.date as sessionDate,
        s.startTime,
        s.endTime,
        COALESCE(r.status, 'present') as status,
        COALESCE(r.notes, '') as notes
      FROM attendance_sessions s
      LEFT JOIN attendance_records r ON r.sessionId = s.id AND r.studentId = ?
      WHERE s.classId = ?
      ORDER BY s.date DESC, s.createdAt DESC
    `).all(studentId, student.classId) as any[];

    const history = records.map((r) => ({
      sessionId: String(r.sessionId),
      sessionTitle: String(r.sessionTitle),
      sessionDate: String(r.sessionDate),
      startTime: r.startTime ? String(r.startTime) : '',
      endTime: r.endTime ? String(r.endTime) : '',
      status: (r.status || 'present') as AttendanceStatus,
      notes: r.notes ? String(r.notes) : ''
    }));

    const presentCount = history.filter(h => h.status === 'present').length;
    const absentCount = history.filter(h => h.status === 'absent').length;
    const lateCount = history.filter(h => h.status === 'late').length;
    const excusedCount = history.filter(h => h.status === 'excused').length;
    const totalSessions = history.length;
    const attendanceRate = totalSessions > 0 ? Math.round(((presentCount + (lateCount * 0.8)) / totalSessions) * 100) : 100;

    return {
      summary: {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentNumber: student.studentNumber,
        isRepeating: Boolean(student.isRepeating),
        totalSessions,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate
      },
      history
    };
  }

  public getStudentTodayAttendance(studentId: string): {
    date: string;
    session: AttendanceSession | null;
    record: AttendanceRecord | null;
    hasMarkedToday: boolean;
    markedAt?: string;
  } {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const sessionRow = this.db.prepare(`
      SELECT * FROM attendance_sessions
      WHERE classId = ? AND date = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(student.classId, today) as any;

    if (!sessionRow) {
      return {
        date: today,
        session: null,
        record: null,
        hasMarkedToday: false
      };
    }

    const sessionDetails = this.getAttendanceSessionDetails(sessionRow.id);
    const record = sessionDetails?.records?.find(r => r.studentId === studentId) || null;
    const hasMarkedToday = Boolean(record && record.markedByStudentAt);

    return {
      date: today,
      session: sessionDetails,
      record,
      hasMarkedToday,
      markedAt: record?.markedByStudentAt || undefined
    };
  }

  public markStudentPresenceToday(studentId: string): {
    success: boolean;
    session: AttendanceSession;
    record: AttendanceRecord;
    alreadyMarked: boolean;
  } {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowIso = now.toISOString();

    // Check if a session already exists for this class today
    let sessionRow = this.db.prepare(`
      SELECT * FROM attendance_sessions
      WHERE classId = ? AND date = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(student.classId, today) as any;

    if (!sessionRow) {
      const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(now);
      const title = `Séance du ${dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1)}`;
      const newSession = this.createAttendanceSession(student.classId, {
        title,
        date: today,
        notes: 'Séance initialisée',
        initialStatus: 'present'
      });
      sessionRow = { id: newSession.id };
    }

    // Check record
    const recordRow = this.db.prepare(`
      SELECT * FROM attendance_records
      WHERE sessionId = ? AND studentId = ?
    `).get(sessionRow.id, studentId) as any;

    let alreadyMarked = false;
    if (recordRow && recordRow.markedByStudentAt) {
      alreadyMarked = true;
    } else {
      this.db.prepare(`
        INSERT INTO attendance_records (id, sessionId, studentId, status, notes, optionsJson, score, markedByStudentAt, updatedAt)
        VALUES (?, ?, ?, 'present', '', '[]', 0, ?, ?)
        ON CONFLICT(sessionId, studentId) DO UPDATE SET
          status = 'present',
          markedByStudentAt = excluded.markedByStudentAt,
          updatedAt = excluded.updatedAt
      `).run(
        `att-${sessionRow.id}-${studentId}`,
        sessionRow.id,
        studentId,
        nowIso,
        nowIso
      );
    }

    const sessionDetails = this.getAttendanceSessionDetails(sessionRow.id)!;
    const record = sessionDetails.records!.find(r => r.studentId === studentId)!;

    return {
      success: true,
      session: sessionDetails,
      record,
      alreadyMarked
    };
  }

  public uploadStudentActivityFile(studentId: string, fileData: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }): {
    success: boolean;
    record: AttendanceRecord;
    session: AttendanceSession;
  } {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowIso = now.toISOString();

    let sessionRow = this.db.prepare(`
      SELECT * FROM attendance_sessions
      WHERE classId = ? AND date = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(student.classId, today) as any;

    if (!sessionRow) {
      const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(now);
      const title = `Séance du ${dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1)}`;
      const newSession = this.createAttendanceSession(student.classId, {
        title,
        date: today,
        notes: 'Séance initialisée',
        initialStatus: 'present'
      });
      sessionRow = { id: newSession.id };
    }

    this.db.prepare(`
      INSERT INTO attendance_records (
        id, sessionId, studentId, status, notes, optionsJson, score,
        activityFileUrl, activityFileName, activityFileType, activityFileSize, activityUploadedAt, updatedAt
      )
      VALUES (?, ?, ?, 'present', '', '[]', 0, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sessionId, studentId) DO UPDATE SET
        activityFileUrl = excluded.activityFileUrl,
        activityFileName = excluded.activityFileName,
        activityFileType = excluded.activityFileType,
        activityFileSize = excluded.activityFileSize,
        activityUploadedAt = excluded.activityUploadedAt,
        updatedAt = excluded.updatedAt
    `).run(
      `att-${sessionRow.id}-${studentId}`,
      sessionRow.id,
      studentId,
      fileData.fileUrl,
      fileData.fileName,
      fileData.fileType,
      fileData.fileSize,
      nowIso,
      nowIso
    );

    const sessionDetails = this.getAttendanceSessionDetails(sessionRow.id)!;
    const record = sessionDetails.records!.find(r => r.studentId === studentId)!;

    return {
      success: true,
      record,
      session: sessionDetails
    };
  }

  public deleteStudentActivityFile(studentId: string): {
    success: boolean;
    record?: AttendanceRecord;
  } {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Élève introuvable');

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowIso = now.toISOString();

    const sessionRow = this.db.prepare(`
      SELECT * FROM attendance_sessions
      WHERE classId = ? AND date = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(student.classId, today) as any;

    if (!sessionRow) {
      return { success: false };
    }

    this.db.prepare(`
      UPDATE attendance_records
      SET activityFileUrl = '', activityFileName = '', activityFileType = '', activityFileSize = 0, activityUploadedAt = '', updatedAt = ?
      WHERE sessionId = ? AND studentId = ?
    `).run(nowIso, sessionRow.id, studentId);

    const sessionDetails = this.getAttendanceSessionDetails(sessionRow.id);
    const record = sessionDetails?.records?.find(r => r.studentId === studentId);

    return { success: true, record };
  }

  // ==========================================
  // BACKUP, PROTECTION & RESTORE METHODS
  // ==========================================
  public getDatabasePath(): string {
    return SQLITE_FILE;
  }

  public getDataDirectory(): string {
    return DATA_DIR;
  }

  public getBackupStats(): {
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
    attendanceSessionsCount?: number;
    attendanceRecordsCount?: number;
    hasAutoBackup: boolean;
  } {
    let sizeBytes = 0;
    let lastMod = '';
    try {
      if (fs.existsSync(SQLITE_FILE)) {
        const stat = fs.statSync(SQLITE_FILE);
        sizeBytes = stat.size;
        lastMod = stat.mtime.toISOString();
      }
    } catch {}

    const classesCount = (this.db.prepare('SELECT COUNT(*) as c FROM classes').get() as any)?.c || 0;
    const studentsCount = (this.db.prepare('SELECT COUNT(*) as c FROM students').get() as any)?.c || 0;
    const coursesCount = (this.db.prepare('SELECT COUNT(*) as c FROM courses').get() as any)?.c || 0;
    const testsCount = (this.db.prepare('SELECT COUNT(*) as c FROM tests').get() as any)?.c || 0;
    const qcmsCount = (this.db.prepare('SELECT COUNT(*) as c FROM qcms').get() as any)?.c || 0;
    const submissionsCount = (this.db.prepare('SELECT COUNT(*) as c FROM qcm_submissions').get() as any)?.c || 0;
    const evaluationsCount = (this.db.prepare('SELECT COUNT(*) as c FROM test_evaluations').get() as any)?.c || 0;
    const attendanceSessionsCount = (this.db.prepare('SELECT COUNT(*) as c FROM attendance_sessions').get() as any)?.c || 0;
    const attendanceRecordsCount = (this.db.prepare('SELECT COUNT(*) as c FROM attendance_records').get() as any)?.c || 0;

    const backupFile = path.join(DATA_DIR, 'backups', 'school-auto-backup.sqlite');
    const hasAutoBackup = fs.existsSync(backupFile);

    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} o`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    };

    return {
      dbPath: SQLITE_FILE,
      dataDir: DATA_DIR,
      dbSizeBytes: sizeBytes,
      dbSizeFormatted: formatSize(sizeBytes),
      lastModified: lastMod || new Date().toISOString(),
      classesCount,
      studentsCount,
      coursesCount,
      testsCount,
      qcmsCount,
      submissionsCount,
      evaluationsCount,
      attendanceSessionsCount,
      attendanceRecordsCount,
      hasAutoBackup
    };
  }

  public exportFullBackup(): Record<string, any> {
    const teachers = this.db.prepare('SELECT * FROM teachers').all();
    const classes = this.db.prepare('SELECT * FROM classes').all();
    const students = this.db.prepare('SELECT * FROM students').all();
    const courses = this.db.prepare('SELECT * FROM courses').all();
    const tests = this.db.prepare('SELECT * FROM tests').all();
    const test_evaluations = this.db.prepare('SELECT * FROM test_evaluations').all();
    const qcms = this.db.prepare('SELECT * FROM qcms').all();
    const qcm_questions = this.db.prepare('SELECT * FROM qcm_questions').all();
    const qcm_submissions = this.db.prepare('SELECT * FROM qcm_submissions').all();
    const qcm_classes = this.db.prepare('SELECT * FROM qcm_classes').all();
    const attendance_sessions = this.db.prepare('SELECT * FROM attendance_sessions').all();
    const attendance_records = this.db.prepare('SELECT * FROM attendance_records').all();

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      teachers,
      classes,
      students,
      courses,
      tests,
      test_evaluations,
      qcms,
      qcm_questions,
      qcm_submissions,
      qcm_classes,
      attendance_sessions,
      attendance_records
    };
  }

  public restoreFullBackup(backupData: any): { success: boolean; message: string } {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Format de fichier de sauvegarde invalide');
    }

    // Save a safeguard backup before overwriting
    this.createStartupBackup();

    this.db.exec('BEGIN TRANSACTION;');
    try {
      if (Array.isArray(backupData.teachers) && backupData.teachers.length > 0) {
        this.db.prepare('DELETE FROM teachers').run();
        const ins = this.db.prepare('INSERT INTO teachers (username, passwordHash, fullName, email) VALUES (?, ?, ?, ?)');
        for (const t of backupData.teachers) {
          ins.run(t.username, t.passwordHash, t.fullName, t.email);
        }
      }

      if (Array.isArray(backupData.classes)) {
        this.db.prepare('DELETE FROM classes').run();
        const ins = this.db.prepare('INSERT INTO classes (id, name, level, academicYear, room, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const c of backupData.classes) {
          ins.run(c.id, c.name, c.level, c.academicYear, c.room || '', c.description || '', c.createdAt || new Date().toISOString());
        }
      }

      if (Array.isArray(backupData.students)) {
        this.db.prepare('DELETE FROM students').run();
        const ins = this.db.prepare('INSERT INTO students (id, classId, firstName, lastName, studentNumber, birthDate, email, password, hasChangedPassword, isRepeating, notes, lastLogin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const s of backupData.students) {
          ins.run(s.id, s.classId, s.firstName, s.lastName, s.studentNumber || '', s.birthDate || '', s.email || '', s.password, s.hasChangedPassword ? 1 : 0, s.isRepeating ? 1 : 0, s.notes || '', s.lastLogin || null, s.createdAt || new Date().toISOString());
        }
      }

      if (Array.isArray(backupData.courses)) {
        this.db.prepare('DELETE FROM courses').run();
        const ins = this.db.prepare('INSERT INTO courses (id, classId, title, category, description, content, resourceLink, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const c of backupData.courses) {
          ins.run(c.id, c.classId, c.title, c.category, c.description || '', c.content, c.resourceLink || '', c.createdAt || new Date().toISOString());
        }
      }

      if (Array.isArray(backupData.tests)) {
        this.db.prepare('DELETE FROM tests').run();
        const ins = this.db.prepare('INSERT INTO tests (id, classId, title, theme, level, timeLimitSeconds, targetText, minAccuracyPercent, minWpm, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const t of backupData.tests) {
          ins.run(t.id, t.classId, t.title, t.theme, Number(t.level), Number(t.timeLimitSeconds), t.targetText, Number(t.minAccuracyPercent || 80), Number(t.minWpm || 15), t.description || '', t.createdAt || new Date().toISOString());
        }
      }

      if (Array.isArray(backupData.test_evaluations)) {
        this.db.prepare('DELETE FROM test_evaluations').run();
        const ins = this.db.prepare('INSERT INTO test_evaluations (id, testId, studentId, classId, wpm, cpm, accuracy, mistakesCount, timeSpentSeconds, passed, score, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const e of backupData.test_evaluations) {
          ins.run(e.id, e.testId, e.studentId, e.classId, Number(e.wpm), Number(e.cpm), Number(e.accuracy), Number(e.mistakesCount), Number(e.timeSpentSeconds), e.passed ? 1 : 0, Number(e.score), e.completedAt);
        }
      }

      if (Array.isArray(backupData.qcms)) {
        this.db.prepare('DELETE FROM qcms').run();
        const ins = this.db.prepare('INSERT INTO qcms (id, classId, title, description, category, durationMinutes, totalPoints, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const q of backupData.qcms) {
          ins.run(q.id, q.classId, q.title, q.description || '', q.category || 'Général', Number(q.durationMinutes || 0), Number(q.totalPoints || 20), q.isActive ? 1 : 0, q.createdAt);
        }
      }

      if (Array.isArray(backupData.qcm_questions)) {
        this.db.prepare('DELETE FROM qcm_questions').run();
        const ins = this.db.prepare('INSERT INTO qcm_questions (id, qcmId, questionOrder, questionText, optionA, optionB, optionC, optionD, correctOption, points, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const q of backupData.qcm_questions) {
          ins.run(q.id, q.qcmId, Number(q.questionOrder), q.questionText, q.optionA, q.optionB, q.optionC, q.optionD, q.correctOption, Number(q.points || 1), q.explanation || '');
        }
      }

      if (Array.isArray(backupData.qcm_submissions)) {
        this.db.prepare('DELETE FROM qcm_submissions').run();
        const ins = this.db.prepare('INSERT INTO qcm_submissions (id, qcmId, studentId, classId, totalScore, maxScore, score20, answersJson, timeSpentSeconds, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const s of backupData.qcm_submissions) {
          ins.run(s.id, s.qcmId, s.studentId, s.classId, Number(s.totalScore), Number(s.maxScore), Number(s.score20), typeof s.answersJson === 'string' ? s.answersJson : JSON.stringify(s.answersJson || {}), Number(s.timeSpentSeconds || 0), s.completedAt);
        }
      }

      if (Array.isArray(backupData.qcm_classes)) {
        this.db.prepare('DELETE FROM qcm_classes').run();
        const ins = this.db.prepare('INSERT OR IGNORE INTO qcm_classes (qcmId, classId) VALUES (?, ?)');
        for (const qc of backupData.qcm_classes) {
          ins.run(qc.qcmId, qc.classId);
        }
      }

      if (Array.isArray(backupData.attendance_sessions)) {
        this.db.prepare('DELETE FROM attendance_sessions').run();
        const ins = this.db.prepare('INSERT INTO attendance_sessions (id, classId, title, date, startTime, endTime, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const as of backupData.attendance_sessions) {
          ins.run(as.id, as.classId, as.title, as.date, as.startTime || '', as.endTime || '', as.notes || '', as.createdAt || new Date().toISOString());
        }
      }

      if (Array.isArray(backupData.attendance_records)) {
        this.db.prepare('DELETE FROM attendance_records').run();
        const ins = this.db.prepare('INSERT INTO attendance_records (id, sessionId, studentId, status, notes, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
        for (const ar of backupData.attendance_records) {
          ins.run(ar.id, ar.sessionId, ar.studentId, ar.status || 'present', ar.notes || '', ar.updatedAt || new Date().toISOString());
        }
      }

      this.db.exec('COMMIT;');
      return { success: true, message: 'Sauvegarde restaurée avec succès !' };
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      throw new Error(`Échec de la restauration : ${err.message}`);
    }
  }
}

export const db = new SQLiteStorage();

