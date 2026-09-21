import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  FileSpreadsheet,
  Printer,
  Key,
  Shield,
  Search,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  School,
  Lock,
  ArrowRight,
  BookOpen,
  Keyboard,
  Trophy,
  HelpCircle,
  Database,
  Download,
  Upload,
  HardDrive,
  Info,
  Calendar,
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Filter,
  X,
  Pencil
} from 'lucide-react';
import { api } from '../api';
import { ClassGroup, Student, TeacherUser } from '../types';
import { CoursesSection } from './CoursesSection';
import { TeacherEvaluationsSection } from './TeacherEvaluationsSection';
import { TeacherQCMSection } from './TeacherQCMSection';
import { TeacherAttendanceSection } from './TeacherAttendanceSection';
import { ManualModal } from './ManualModal';

interface TeacherDashboardProps {
  session: { teacher: TeacherUser; token: string } | null;
  onLoginSuccess: (session: { teacher: TeacherUser; token: string }) => void;
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  session,
  onLoginSuccess,
  onLogout
}) => {
  // Login form state (if not logged in)
  const [username, setUsername] = useState('prof');
  const [password, setPassword] = useState('prof1234');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Classes state
  const [classes, setClasses] = useState<Array<ClassGroup & { studentCount: number }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRubrique, setSelectedRubrique] = useState<'students' | 'courses' | 'tests' | 'qcms' | 'attendance'>('students');

  // Modals
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('Collège');
  const [newClassYear, setNewClassYear] = useState('2024-2025');
  const [newClassRoom, setNewClassRoom] = useState('');

  // Class filtering & sorting
  const [classSearch, setClassSearch] = useState('');
  const [classSort, setClassSort] = useState<'name-asc' | 'name-desc' | 'count-desc' | 'count-asc'>('name-asc');

  // Student filtering & sorting
  const [studentFilterProfile, setStudentFilterProfile] = useState<'all' | 'nouveau' | 'redoublant'>('all');
  const [studentFilterStatus, setStudentFilterStatus] = useState<'all' | 'auto' | 'changed'>('all');
  const [studentSortBy, setStudentSortBy] = useState<'name' | 'firstName' | 'studentNumber' | 'profile' | 'status'>('name');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc');

  // Print modal filtering & sorting
  const [printSearch, setPrintSearch] = useState('');
  const [printFilterProfile, setPrintFilterProfile] = useState<'all' | 'nouveau' | 'redoublant'>('all');
  const [printSort, setPrintSort] = useState<'name-asc' | 'name-desc' | 'id-asc'>('name-asc');

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentFirstname, setStudentFirstname] = useState('');
  const [studentLastname, setStudentLastname] = useState('');
  const [studentBirthDate, setStudentBirthDate] = useState('');
  const [studentCustomPassword, setStudentCustomPassword] = useState('');
  const [studentIsRepeating, setStudentIsRepeating] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importing, setImporting] = useState(false);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Notifications
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Manual password edit modal
  const [editingStudentPassword, setEditingStudentPassword] = useState<{ id: string; name: string } | null>(null);
  const [customPasswordInput, setCustomPasswordInput] = useState('');

  // Full student editing modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editStudentNumber, setEditStudentNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsRepeating, setEditIsRepeating] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // Delete entire class confirmation modal state
  const [classToDelete, setClassToDelete] = useState<{ id: string; name: string; studentCount: number } | null>(null);
  const [deletingClass, setDeletingClass] = useState(false);

  // Backup & Data protection modal state
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupStats, setBackupStats] = useState<{
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
  } | null>(null);
  const [loadingBackupStats, setLoadingBackupStats] = useState(false);
  const [restoringData, setRestoringData] = useState(false);

  // Load classes when session exists
  useEffect(() => {
    if (!session) return;
    loadTeacherClasses();
  }, [session]);

  // Load students when selectedClassId changes
  useEffect(() => {
    if (!session || !selectedClassId) {
      setStudents([]);
      return;
    }
    loadStudentsOfClass(selectedClassId);
  }, [session, selectedClassId]);

  const loadTeacherClasses = async () => {
    if (!session) return;
    try {
      setLoadingData(true);
      setActionError('');
      const list = await api.teacherGetClasses(session.token);
      setClasses(list);
      if (list.length > 0 && !selectedClassId) {
        setSelectedClassId(list[0].id);
      }
    } catch (err: any) {
      const msg = err.message || 'Erreur lors du chargement des classes';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('reconnecter')) {
        onLogout();
      } else {
        setActionError(msg);
      }
    } finally {
      setLoadingData(false);
    }
  };

  const loadStudentsOfClass = async (classId: string) => {
    if (!session) return;
    try {
      setActionError('');
      const list = await api.teacherGetStudents(session.token, classId);
      setStudents(list);
    } catch (err: any) {
      const msg = err.message || 'Erreur chargement élèves';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('reconnecter')) {
        onLogout();
      } else {
        setActionError(msg);
      }
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      setLoginLoading(true);
      const res = await api.teacherLogin(username, password);
      onLoginSuccess(res);
    } catch (err: any) {
      setLoginError(err.message || 'Identifiants invalides');
    } finally {
      setLoginLoading(false);
    }
  };

  // Create new class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newClassName.trim()) return;
    try {
      const created = await api.teacherCreateClass(session.token, {
        name: newClassName.trim(),
        level: newClassLevel,
        academicYear: newClassYear,
        room: newClassRoom
      });
      setShowNewClassModal(false);
      setNewClassName('');
      setNewClassRoom('');
      setActionSuccess(`Classe "${created.name}" créée avec succès !`);
      await loadTeacherClasses();
      setSelectedClassId(created.id);
    } catch (err: any) {
      setActionError(err.message || 'Erreur création classe');
    }
  };

  const handleOpenBackupModal = async () => {
    if (!session) return;
    setShowBackupModal(true);
    try {
      setLoadingBackupStats(true);
      const stats = await api.teacherGetBackupStatus(session.token);
      setBackupStats(stats);
    } catch (err: any) {
      console.warn('Erreur chargement statut sauvegarde:', err);
    } finally {
      setLoadingBackupStats(false);
    }
  };

  const handleDownloadSqlite = () => {
    if (!session) return;
    window.location.href = `/api/teacher/backup/download-sqlite?token=${encodeURIComponent(session.token)}`;
  };

  const handleExportJson = async () => {
    if (!session) return;
    try {
      const data = await api.teacherExportBackupJson(session.token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sauvegarde-intranet-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setActionSuccess('Export JSON de sauvegarde téléchargé avec succès.');
    } catch (err: any) {
      setActionError(`Erreur export JSON: ${err.message}`);
    }
  };

  const handleRestoreJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    if (!window.confirm('Attention : restaurer une sauvegarde va remplacer les données actuelles par celles du fichier. Voulez-vous continuer ?')) {
      e.target.value = '';
      return;
    }
    try {
      setRestoringData(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api.teacherRestoreBackupJson(session.token, parsed);
      setActionSuccess('Sauvegarde restaurée avec succès ! Les données ont été actualisées.');
      await loadTeacherClasses();
      if (selectedClassId) {
        await loadStudentsOfClass(selectedClassId);
      }
      setShowBackupModal(false);
    } catch (err: any) {
      setActionError(`Erreur lors de la restauration : ${err.message}`);
    } finally {
      setRestoringData(false);
      e.target.value = '';
    }
  };

  // Delete entire class with modal confirmation
  const confirmDeleteClass = async () => {
    if (!session || !classToDelete) return;
    try {
      setDeletingClass(true);
      await api.teacherDeleteClass(session.token, classToDelete.id);
      setActionSuccess(`La classe "${classToDelete.name}" et tous ses élèves ont été supprimés avec succès.`);
      
      const remainingClasses = classes.filter(c => c.id !== classToDelete.id);
      setClasses(remainingClasses);
      if (selectedClassId === classToDelete.id) {
        setSelectedClassId(remainingClasses.length > 0 ? remainingClasses[0].id : '');
      }
      setClassToDelete(null);
      await loadTeacherClasses();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la suppression de la classe');
    } finally {
      setDeletingClass(false);
    }
  };

  // Add individual student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedClassId || !studentFirstname.trim() || !studentLastname.trim()) return;
    try {
      const student = await api.teacherCreateStudent(session.token, selectedClassId, {
        firstName: studentFirstname.trim(),
        lastName: studentLastname.trim(),
        birthDate: studentBirthDate,
        customPassword: studentCustomPassword.trim() || undefined,
        isRepeating: studentIsRepeating
      });
      setShowAddStudentModal(false);
      setStudentFirstname('');
      setStudentLastname('');
      setStudentBirthDate('');
      setStudentCustomPassword('');
      setStudentIsRepeating(false);
      setActionSuccess(`Élève ${student.firstName} ${student.lastName} (${student.isRepeating ? 'Redoublant' : 'Nouveau'}) ajouté avec mot de passe simple: ${student.password}`);
      await loadStudentsOfClass(selectedClassId);
      await loadTeacherClasses();
    } catch (err: any) {
      setActionError(err.message || 'Erreur ajout élève');
    }
  };

  // Bulk import
  const handleImportStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedClassId || !importRawText.trim()) return;

    try {
      setImporting(true);
      // Parse raw text: accept "Nom, Prénom" or "Nom;Prénom" or "Nom Prénom" per line
      const lines = importRawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const parsedStudents: Array<{ firstName: string; lastName: string; birthDate?: string }> = [];

      for (const line of lines) {
        // Check for CSV / semicolon / tab / comma
        if (line.includes(';') || line.includes(',')) {
          const parts = line.split(/[;,]/).map(p => p.trim());
          if (parts.length >= 2) {
            // First column: Nom, Second: Prénom
            parsedStudents.push({
              lastName: parts[0],
              firstName: parts[1],
              birthDate: parts[2] || undefined
            });
          }
        } else {
          // Space separated: e.g. "Martin Lucas" or "Lucas Martin"
          const words = line.split(/\s+/);
          if (words.length >= 2) {
            parsedStudents.push({
              lastName: words[0],
              firstName: words.slice(1).join(' ')
            });
          }
        }
      }

      if (parsedStudents.length === 0) {
        throw new Error('Aucun nom d’élève valide détecté dans le texte saisi.');
      }

      const res = await api.teacherImportStudents(session.token, selectedClassId, parsedStudents);
      setShowImportModal(false);
      setImportRawText('');
      setActionSuccess(`${res.count} élèves importés avec succès avec mots de passe simples générés automatiquement !`);
      await loadStudentsOfClass(selectedClassId);
      await loadTeacherClasses();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de l’importation');
    } finally {
      setImporting(false);
    }
  };

  // Regenerate simple automatic password
  const handleRegeneratePassword = async (studentId: string, studentName: string) => {
    if (!session) return;
    try {
      const res = await api.teacherRegeneratePassword(session.token, studentId);
      setActionSuccess(`Nouveau mot de passe pour ${studentName} : ${res.newPassword}`);
      // Update locally
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, password: res.newPassword, hasChangedPassword: false } : s))
      );
    } catch (err: any) {
      setActionError(err.message || 'Erreur régénération');
    }
  };

  // Set custom password
  const handleSaveCustomPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !editingStudentPassword || !customPasswordInput.trim()) return;
    try {
      await api.teacherSetPassword(session.token, editingStudentPassword.id, customPasswordInput.trim());
      setActionSuccess(`Mot de passe personnalisé enregistré pour ${editingStudentPassword.name}`);
      setStudents(prev =>
        prev.map(s => (s.id === editingStudentPassword.id ? { ...s, password: customPasswordInput.trim(), hasChangedPassword: false } : s))
      );
      setEditingStudentPassword(null);
      setCustomPasswordInput('');
    } catch (err: any) {
      setActionError(err.message || 'Erreur modification mot de passe');
    }
  };

  // Open Full Student Edit Modal
  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditFirstName(student.firstName || '');
    setEditLastName(student.lastName || '');
    setEditBirthDate(student.birthDate || '');
    setEditStudentNumber(student.studentNumber || '');
    setEditEmail(student.email || '');
    setEditPassword(student.password || '');
    setEditIsRepeating(Boolean(student.isRepeating));
    setEditNotes(student.notes || '');
  };

  // Save Full Student Details
  const handleSaveStudentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !editingStudent) return;
    setIsSavingStudent(true);
    try {
      const updated = await api.teacherUpdateStudent(session.token, editingStudent.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        birthDate: editBirthDate.trim() || undefined,
        studentNumber: editStudentNumber.trim() || undefined,
        email: editEmail.trim() || undefined,
        password: editPassword.trim() || undefined,
        isRepeating: editIsRepeating,
        notes: editNotes.trim() || undefined
      });
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      setActionSuccess(`Fiche de l'élève ${updated.firstName} ${updated.lastName} mise à jour avec succès.`);
      setTimeout(() => setActionSuccess(''), 4000);
      setEditingStudent(null);
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la mise à jour des données de l’élève');
    } finally {
      setIsSavingStudent(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!session) return;
    if (!window.confirm(`Supprimer l'élève "${studentName}" de la classe ?`)) return;
    try {
      await api.teacherDeleteStudent(session.token, studentId);
      setActionSuccess(`Élève ${studentName} supprimé.`);
      await loadStudentsOfClass(selectedClassId);
      await loadTeacherClasses();
    } catch (err: any) {
      setActionError(err.message || 'Erreur suppression');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Filtered & Sorted Classes
  const filteredClasses = classes
    .filter(c => {
      const q = classSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.level.toLowerCase().includes(q) ||
        (c.room && c.room.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (classSort === 'name-asc') return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      if (classSort === 'name-desc') return b.name.localeCompare(a.name, 'fr', { sensitivity: 'base' });
      if (classSort === 'count-desc') return b.studentCount - a.studentCount;
      if (classSort === 'count-asc') return a.studentCount - b.studentCount;
      return 0;
    });

  // Filtered & Sorted Students
  const filteredStudents = students
    .filter(s => {
      const q = searchFilter.toLowerCase().trim();
      const matchesSearch = !q || (
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q)
      );

      const matchesProfile =
        studentFilterProfile === 'all' ||
        (studentFilterProfile === 'nouveau' && !s.isRepeating) ||
        (studentFilterProfile === 'redoublant' && s.isRepeating);

      const matchesStatus =
        studentFilterStatus === 'all' ||
        (studentFilterStatus === 'auto' && !s.hasChangedPassword) ||
        (studentFilterStatus === 'changed' && s.hasChangedPassword);

      return matchesSearch && matchesProfile && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (studentSortBy === 'name') {
        cmp = a.lastName.localeCompare(b.lastName, 'fr', { sensitivity: 'base' }) ||
              a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' });
      } else if (studentSortBy === 'firstName') {
        cmp = a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' }) ||
              a.lastName.localeCompare(b.lastName, 'fr', { sensitivity: 'base' });
      } else if (studentSortBy === 'studentNumber') {
        cmp = a.studentNumber.localeCompare(b.studentNumber, 'fr', { numeric: true });
      } else if (studentSortBy === 'profile') {
        cmp = (Number(b.isRepeating) - Number(a.isRepeating));
      } else if (studentSortBy === 'status') {
        cmp = (Number(b.hasChangedPassword) - Number(a.hasChangedPassword));
      }
      return studentSortOrder === 'asc' ? cmp : -cmp;
    });

  const toggleStudentSort = (field: 'name' | 'firstName' | 'studentNumber' | 'profile' | 'status') => {
    if (studentSortBy === field) {
      setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setStudentSortBy(field);
      setStudentSortOrder('asc');
    }
  };

  const isStudentFilterActive = searchFilter.trim() !== '' || studentFilterProfile !== 'all' || studentFilterStatus !== 'all';
  const resetStudentFilters = () => {
    setSearchFilter('');
    setStudentFilterProfile('all');
    setStudentFilterStatus('all');
  };

  // Filtered & Sorted Students for Print Tickets Modal
  const printStudents = students
    .filter(s => {
      const q = printSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q)
      );
      const matchesProfile =
        printFilterProfile === 'all' ||
        (printFilterProfile === 'nouveau' && !s.isRepeating) ||
        (printFilterProfile === 'redoublant' && s.isRepeating);

      return matchesSearch && matchesProfile;
    })
    .sort((a, b) => {
      if (printSort === 'name-asc') {
        return a.lastName.localeCompare(b.lastName, 'fr', { sensitivity: 'base' }) ||
               a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' });
      }
      if (printSort === 'name-desc') {
        return b.lastName.localeCompare(a.lastName, 'fr', { sensitivity: 'base' }) ||
               b.firstName.localeCompare(a.firstName, 'fr', { sensitivity: 'base' });
      }
      return a.studentNumber.localeCompare(b.studentNumber, 'fr', { numeric: true });
    });

  // IF NOT LOGGED IN: FALLBACK LOGIN VIEW
  if (!session) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-6 py-8 text-white text-center">
            <div className="inline-flex p-3 bg-indigo-600/30 rounded-2xl mb-3 text-indigo-400 ring-1 ring-indigo-500/30">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold">Connexion par identifiant</h1>
            <p className="text-slate-400 text-xs mt-1">Accès réservé pour l’administration des classes et élèves</p>
          </div>

          <form onSubmit={handleTeacherLogin} className="p-6 sm:p-8 space-y-5">
            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Identifiant</label>
              <input
                id="input-teacher-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe</label>
              <input
                id="input-teacher-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                required
              />
            </div>

            <button
              id="btn-teacher-login-submit"
              type="submit"
              disabled={loginLoading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? 'Connexion en cours...' : 'Se connecter'}
            </button>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
              <span>Compte démo : <strong>prof</strong> / <strong>prof1234</strong></span>
              <button
                type="button"
                onClick={() => { setUsername('prof'); setPassword('prof1234'); }}
                className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
              >
                Remplir
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // TEACHER DASHBOARD VIEW
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadTeacherClasses()}
              className="text-xs font-semibold px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition-colors cursor-pointer"
            >
              Réessayer
            </button>
            <button onClick={() => setActionError('')} className="text-rose-700 hover:text-rose-900 text-xs font-bold cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Gestion des Classes & des Élèves</h1>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200">
              {classes.length} classes
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Préparez vos listes de classes, importez les élèves et distribuez les mots de passe simples automatiques.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-open-manual-modal"
            type="button"
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            title="Consulter le manuel d'utilisation complet de l'intranet"
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Manuel d'utilisation</span>
          </button>

          <button
            id="btn-open-backup-modal"
            type="button"
            onClick={handleOpenBackupModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            title="Gérer les sauvegardes et vérifier la protection des données lors des déploiements Git"
          >
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Sauvegardes & Données</span>
          </button>

          <button
            id="btn-open-new-class"
            type="button"
            onClick={() => setShowNewClassModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une classe</span>
          </button>

          {selectedClass && (
            <>
              <button
                id="btn-open-import-modal"
                type="button"
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Importer une liste d’élèves</span>
              </button>

              <button
                id="btn-open-add-student"
                type="button"
                onClick={() => setShowAddStudentModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Ajouter un élève</span>
              </button>

              {students.length > 0 && (
                <button
                  id="btn-open-print-modal"
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Imprimer fiches élèves ({students.length})</span>
                </button>
              )}

              <button
                id="btn-open-delete-class-top"
                type="button"
                onClick={() => setClassToDelete({ id: selectedClass.id, name: selectedClass.name, studentCount: students.length })}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="Supprimer définitivement toute la classe"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Supprimer toute la classe</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Class Selector Tabs & Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Classes ({filteredClasses.length})
            </span>
            {classes.length > 2 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher classe..."
                  value={classSearch}
                  onChange={e => setClassSearch(e.target.value)}
                  className="h-8 pl-8 pr-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none w-36 sm:w-44"
                />
              </div>
            )}
          </div>

          {classes.length > 2 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Trier :</span>
              <select
                value={classSort}
                onChange={e => setClassSort(e.target.value as any)}
                className="py-1 px-2.5 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="name-asc">Nom (A → Z)</option>
                <option value="name-desc">Nom (Z → A)</option>
                <option value="count-desc">Élèves (décroissant)</option>
                <option value="count-asc">Élèves (croissant)</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {filteredClasses.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">
              Aucune classe ne correspond à la recherche "{classSearch}"
            </div>
          ) : (
            filteredClasses.map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                  selectedClassId === cls.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span>{cls.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    selectedClassId === cls.id ? 'bg-indigo-800/60 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cls.studentCount}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Selected Class Dashboard */}
      {selectedClass ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header of selected class */}
          <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">{selectedClass.name}</h2>
                <span className="text-xs text-slate-500 font-medium px-2.5 py-0.5 bg-white rounded-full border border-slate-200">
                  {selectedClass.level} • {selectedClass.academicYear}
                </span>
                {selectedClass.room && (
                  <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-white rounded-full border border-slate-200">
                    {selectedClass.room}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {students.length} élève{students.length > 1 ? 's' : ''} inscrits. Les mots de passe affichés ci-dessous sont générés automatiquement pour chaque élève.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-search-student"
                  type="text"
                  placeholder="Rechercher élève..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="h-9 pl-9 pr-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-44 sm:w-56"
                />
              </div>

              <button
                id="btn-delete-class"
                type="button"
                onClick={() => setClassToDelete({ id: selectedClass.id, name: selectedClass.name, studentCount: students.length })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                title="Supprimer toute la classe et ses élèves"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Supprimer la classe</span>
              </button>
            </div>
          </div>

          {/* Rubrique Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 bg-slate-50/70 border-b border-slate-200 overflow-x-auto">
            <button
              onClick={() => setSelectedRubrique('students')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                selectedRubrique === 'students'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Élèves & Mots de passe</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {students.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedRubrique('courses')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                selectedRubrique === 'courses'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Rubrique Cours & Fiches</span>
            </button>

            <button
              onClick={() => setSelectedRubrique('tests')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                selectedRubrique === 'tests'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Tests de Rapidité & Évaluations</span>
            </button>

            <button
              id="tab-teacher-qcms"
              onClick={() => setSelectedRubrique('qcms')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                selectedRubrique === 'qcms'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Questionnaires QCM</span>
            </button>

            <button
              id="tab-teacher-attendance"
              onClick={() => setSelectedRubrique('attendance')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                selectedRubrique === 'attendance'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Présences & Appel</span>
            </button>
          </div>

          {/* Rubrique 1: Students & Passwords */}
          {selectedRubrique === 'students' && (
            <>
              {/* Students List Table */}
          {students.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Aucun élève dans cette classe</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                Vous pouvez ajouter vos élèves un par un ou importer rapidement toute la liste via copier-coller.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Importer une liste
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Ajouter un élève
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Student Filter & Sorting Toolbar */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Filtres :</span>
                  </div>

                  {/* Profil selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">Profil :</span>
                    <select
                      value={studentFilterProfile}
                      onChange={e => setStudentFilterProfile(e.target.value as any)}
                      className="py-1 px-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">Tous profils</option>
                      <option value="nouveau">Nouveaux uniquement</option>
                      <option value="redoublant">Redoublants uniquement</option>
                    </select>
                  </div>

                  {/* Statut de compte selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">Compte :</span>
                    <select
                      value={studentFilterStatus}
                      onChange={e => setStudentFilterStatus(e.target.value as any)}
                      className="py-1 px-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">Tous les comptes</option>
                      <option value="auto">Mot de passe simple auto</option>
                      <option value="changed">Mot de passe personnalisé</option>
                    </select>
                  </div>

                  {/* Tri dropdown */}
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 text-[11px]">Trier :</span>
                    <select
                      value={`${studentSortBy}-${studentSortOrder}`}
                      onChange={e => {
                        const [field, order] = e.target.value.split('-') as [any, any];
                        setStudentSortBy(field);
                        setStudentSortOrder(order);
                      }}
                      className="py-1 px-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="name-asc">Nom (A → Z)</option>
                      <option value="name-desc">Nom (Z → A)</option>
                      <option value="firstName-asc">Prénom (A → Z)</option>
                      <option value="studentNumber-asc">Identifiant INE (croissant)</option>
                      <option value="studentNumber-desc">Identifiant INE (décroissant)</option>
                      <option value="profile-asc">Redoublants en premier</option>
                      <option value="profile-desc">Nouveaux en premier</option>
                      <option value="status-asc">Comptes personnalisés en 1er</option>
                    </select>
                  </div>

                  {isStudentFilterActive && (
                    <button
                      type="button"
                      onClick={resetStudentFilters}
                      className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Réinitialiser</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  Affichage de <strong className="text-slate-900 font-bold">{filteredStudents.length}</strong> sur <strong>{students.length}</strong> élève{students.length > 1 ? 's' : ''}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th
                        onClick={() => toggleStudentSort('name')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 select-none transition-colors"
                        title="Cliquer pour trier par Nom"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Élève (Nom & Prénom)</span>
                          {studentSortBy === 'name' ? (
                            studentSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => toggleStudentSort('profile')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 select-none transition-colors"
                        title="Cliquer pour trier par Profil"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Profil (Nouveau / Redoublant)</span>
                          {studentSortBy === 'profile' ? (
                            studentSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => toggleStudentSort('studentNumber')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 select-none transition-colors"
                        title="Cliquer pour trier par INE"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Identifiant (INE)</span>
                          {studentSortBy === 'studentNumber' ? (
                            studentSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4">Mot de passe actuel</th>
                      <th
                        onClick={() => toggleStudentSort('status')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 select-none transition-colors"
                        title="Cliquer pour trier par Statut de compte"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Statut compte</span>
                          {studentSortBy === 'status' ? (
                            studentSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700 text-sm">Aucun élève ne correspond aux critères</p>
                          <p className="text-xs text-slate-400 mt-1">Essayez de modifier ou réinitialiser vos filtres de recherche.</p>
                          <button
                            type="button"
                            onClick={resetStudentFilters}
                            className="mt-3 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            Réinitialiser les filtres
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {student.lastName.toUpperCase()} {student.firstName}
                        </div>
                        <div className="text-[11px] text-slate-500">{student.email || 'Pas de courriel'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <label
                          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none ${
                            student.isRepeating
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-xs'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-xs'
                          }`}
                          title="Coché = Redoublant, Décoché = Nouveau (seul le professeur peut cocher/modifier)"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(student.isRepeating)}
                            onChange={async (e) => {
                              const nextVal = e.target.checked;
                              try {
                                await api.teacherUpdateStudentRepeating(session!.token, student.id, nextVal);
                                setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isRepeating: nextVal } : s));
                                setActionSuccess(`Statut mis à jour pour ${student.firstName} ${student.lastName} : ${nextVal ? 'Redoublant' : 'Nouveau'}`);
                                setTimeout(() => setActionSuccess(''), 3000);
                              } catch (err: any) {
                                setActionError(err.message || 'Erreur mise à jour profil');
                              }
                            }}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <span>{student.isRepeating ? 'Redoublant' : 'Nouveau'}</span>
                        </label>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {student.studentNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 px-2.5 py-1 rounded-lg">
                          <Key className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-mono font-bold text-indigo-900 text-xs tracking-wide">
                            {student.password}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(student.password || '', student.id)}
                            title="Copier le mot de passe"
                            className="p-1 hover:text-indigo-600 text-slate-400 cursor-pointer"
                          >
                            {copiedId === student.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {student.hasChangedPassword ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Modifié par l’élève
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3" /> Mot de passe simple auto
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudent(student)}
                            title="Modifier toutes les informations de l'élève"
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 text-indigo-600" />
                            <span className="hidden sm:inline">Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRegeneratePassword(student.id, `${student.firstName} ${student.lastName}`)}
                            title="Générer un nouveau mot de passe simple automatique"
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3 text-indigo-600" />
                            <span className="hidden sm:inline">Régénérer</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudentPassword({ id: student.id, name: `${student.firstName} ${student.lastName}` });
                              setCustomPasswordInput(student.password || '');
                            }}
                            title="Définir un mot de passe personnalisé"
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Key className="w-3 h-3 text-sky-600" />
                            <span className="hidden sm:inline">MDP</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                            title="Supprimer l'élève"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )}

          {/* Rubrique 2: Courses */}
          {selectedRubrique === 'courses' && (
            <div className="p-6">
              <CoursesSection classId={selectedClass.id} token={session!.token} isTeacher={true} classes={classes} />
            </div>
          )}

          {/* Rubrique 3: Tests & Evaluations */}
          {selectedRubrique === 'tests' && (
            <div className="p-6">
              <TeacherEvaluationsSection
                classId={selectedClass.id}
                className={selectedClass.name}
                token={session!.token}
                classes={classes}
              />
            </div>
          )}

          {/* Rubrique 4: Questionnaires QCM */}
          {selectedRubrique === 'qcms' && (
            <div className="p-6">
              <TeacherQCMSection
                classId={selectedClass.id}
                className={selectedClass.name}
                token={session!.token}
                classes={classes}
              />
            </div>
          )}

          {/* Rubrique 5: Attendance / Présences & Appel */}
          {selectedRubrique === 'attendance' && (
            <div className="p-6">
              <TeacherAttendanceSection
                classId={selectedClass.id}
                className={selectedClass.name}
                token={session!.token}
                students={students}
                onRefreshStudents={() => loadStudentsOfClass(selectedClass.id)}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Aucune classe sélectionnée</h2>
          <p className="text-xs text-slate-500 mb-4">Créez votre première classe pour commencer à gérer les élèves.</p>
          <button
            type="button"
            onClick={() => setShowNewClassModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            Créer une classe
          </button>
        </div>
      )}

      {/* MODAL: NOUVELLE CLASSE */}
      {showNewClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Ajouter une nouvelle classe</h3>
              </div>
              <button onClick={() => setShowNewClassModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateClass} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom de la classe (ex: 6ème B, 3ème A...)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5ème C"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Niveau</label>
                  <input
                    type="text"
                    value={newClassLevel}
                    onChange={e => setNewClassLevel(e.target.value)}
                    placeholder="Ex: Collège"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Année scolaire</label>
                  <input
                    type="text"
                    value={newClassYear}
                    onChange={e => setNewClassYear(e.target.value)}
                    placeholder="2024-2025"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Salle principale (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Salle 104"
                  value={newClassRoom}
                  onChange={e => setNewClassRoom(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewClassModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Créer la classe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER UN ÉLÈVE */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Ajouter un élève ({selectedClass?.name})</h3>
              </div>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Lucas"
                    value={studentFirstname}
                    onChange={e => setStudentFirstname(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom de famille</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dupont"
                    value={studentLastname}
                    onChange={e => setStudentLastname(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date de naissance (optionnel)</label>
                <input
                  type="date"
                  value={studentBirthDate}
                  onChange={e => setStudentBirthDate(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mot de passe (laisser vide pour mot de passe automatique simple)
                </label>
                <input
                  type="text"
                  placeholder="Ex: tigre42 (ou laisser vide pour générer)"
                  value={studentCustomPassword}
                  onChange={e => setStudentCustomPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Si vide, le système créera un mot de passe simple automatique (ex: <code className="text-indigo-600">soleil34</code>).
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                <input
                  type="checkbox"
                  id="checkbox-add-student-repeating"
                  checked={studentIsRepeating}
                  onChange={e => setStudentIsRepeating(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="checkbox-add-student-repeating" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  Élève redoublant (coché = Redoublant, décoché = Nouveau élève)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Enregistrer l’élève
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTATION DE LISTE D'ÉLÈVES */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/40 text-indigo-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Importation d'élèves pour {selectedClass?.name}</h3>
                  <p className="text-xs text-slate-400">Génération automatique des mots de passe simples pour chaque élève</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleImportStudents} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Collez la liste de vos élèves (une ligne par élève) :
                </label>
                <textarea
                  rows={8}
                  value={importRawText}
                  onChange={e => setImportRawText(e.target.value)}
                  placeholder={`Exemples de formats acceptés :\nDupont, Lucas\nMartin, Emma\nBenali, Yanis\nLeroy, Chloé\nMoreau, Thomas\n\nOu séparés par un espace :\nDubois Alexandre\nRousseau Manon`}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs text-indigo-950">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Génération automatique de mots de passe simples</span>
                </div>
                <p className="text-[11px] text-indigo-800">
                  Chaque élève importé recevra automatiquement un identifiant unique ainsi qu'un mot de passe mémorisable (ex: <code>renard28</code>, <code>etoile64</code>). Vous pourrez ensuite imprimer la feuille de connexion pour la classe.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportRawText(
                      `Garnier, Juliette\nPetit, Antoine\nFaure, Camille\nLambert, Hugo\nFontaine, Léa`
                    );
                  }}
                  className="text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                >
                  Insérer exemple de test (5 élèves)
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={importing || !importRawText.trim()}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {importing ? 'Importation en cours...' : 'Lancer l’importation'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ÉDITION MANUELLE DE MOT DE PASSE */}
      {editingStudentPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Modifier le mot de passe</h3>
              <button onClick={() => setEditingStudentPassword(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveCustomPassword} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Définir un mot de passe spécifique pour <strong>{editingStudentPassword.name}</strong> :
              </p>
              <input
                type="text"
                required
                value={customPasswordInput}
                onChange={e => setCustomPasswordInput(e.target.value)}
                placeholder="Ex: tigre42"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudentPassword(null)}
                  className="px-3 py-1.5 text-slate-600 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFIER TOUTES LES INFORMATIONS DE L'ÉLÈVE */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Modifier l'élève : {editingStudent.firstName} {editingStudent.lastName}</h3>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveStudentDetails} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={e => setEditFirstName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={e => setEditLastName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Identifiant / N° Élève *</label>
                  <input
                    type="text"
                    required
                    value={editStudentNumber}
                    onChange={e => setEditStudentNumber(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date de naissance</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={e => setEditBirthDate(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email (optionnel)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="eleve@etablissement.fr"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mot de passe de connexion</label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Mot de passe"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editIsRepeating}
                    onChange={e => setEditIsRepeating(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800">
                    Profil de scolarité : {editIsRepeating ? 'Redoublant' : 'Nouveau (non redoublant)'}
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ce statut permet de suivre les statistiques et adapter les évaluations individualisées.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observations / Remarques pédagogiques</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Notes personnelles du professeur sur l'élève..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingStudent ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHES DE CONNEXION ÉLÈVES À IMPRIMER */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <Printer className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">Fiches de connexion individuelles — {selectedClass?.name}</h3>
                  <p className="text-xs text-slate-400">Tickets prêts à être découpés et distribués aux élèves</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la page</span>
                </button>
                <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-white px-2 py-1">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-100/50 print-area">
              {/* Print filter toolbar (hidden during actual print) */}
              <div className="no-print bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrer billets par nom / ID..."
                      value={printSearch}
                      onChange={e => setPrintSearch(e.target.value)}
                      className="h-8 pl-8 pr-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
                    />
                  </div>

                  <select
                    value={printFilterProfile}
                    onChange={e => setPrintFilterProfile(e.target.value as any)}
                    className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                  >
                    <option value="all">Tous profils</option>
                    <option value="nouveau">Nouveaux</option>
                    <option value="redoublant">Redoublants</option>
                  </select>

                  <select
                    value={printSort}
                    onChange={e => setPrintSort(e.target.value as any)}
                    className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                  >
                    <option value="name-asc">Trier : Nom (A → Z)</option>
                    <option value="name-desc">Trier : Nom (Z → A)</option>
                    <option value="id-asc">Trier : Identifiant INE</option>
                  </select>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  <strong>{printStudents.length}</strong> fiche{printStudents.length > 1 ? 's' : ''} prête{printStudents.length > 1 ? 's' : ''}
                </div>
              </div>

              {printStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                  Aucun billet ne correspond aux critères de filtre sélectionnés.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {printStudents.map(std => (
                  <div
                    key={std.id}
                    className="bg-white p-5 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm relative break-inside-avoid"
                  >
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 mb-2.5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          Intranet Scolaire • {selectedClass?.name}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base mt-1">
                          {std.lastName.toUpperCase()} {std.firstName}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-slate-500">ID: {std.studentNumber}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Mot de passe élève :</span>
                        <span className="font-mono font-bold text-sm text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                          {std.password}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 leading-tight">
                      <strong>Instructions :</strong> Rendez-vous sur l'intranet, choisissez votre classe <em>({selectedClass?.name})</em>, sélectionnez votre nom dans la liste, puis entrez ce mot de passe. Vous pourrez le modifier depuis votre profil.
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMATION SUPPRESSION TOUTE LA CLASSE */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Supprimer toute la classe ?
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Vous vous apprêtez à supprimer définitivement la classe{' '}
                <strong className="text-slate-900 font-bold">« {classToDelete.name} »</strong>
                {classToDelete.studentCount > 0 ? (
                  <> ainsi que les <strong className="text-rose-600 font-bold">{classToDelete.studentCount} élève{classToDelete.studentCount > 1 ? 's' : ''}</strong> inscrits.</>
                ) : (
                  '.'
                )}
              </p>
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs text-left mt-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>
                  Cette action est irréversible. Les accès des élèves et toutes leurs fiches seront définitivement effacés de l'intranet.
                </span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deletingClass}
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="btn-confirm-delete-class"
                type="button"
                disabled={deletingClass}
                onClick={confirmDeleteClass}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                {deletingClass ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Oui, supprimer la classe</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAUVEGARDE & PROTECTION DES DONNÉES LOCALES */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Sécurité des Données & Déploiement Local
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Protection de votre base SQLite locale contre les mises à jour Git
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Encadré vert de garantie anti-écrasement */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                      Vos données locales ne sont jamais écrasées par Git
                    </h4>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      La base SQLite (<code className="font-mono bg-white/80 px-1 py-0.5 rounded border border-emerald-200">data/school.sqlite</code>) est inscrite dans le fichier <code className="font-mono bg-white/80 px-1 py-0.5 rounded border border-emerald-200">.gitignore</code>. Lorsque vous effectuez un <strong className="font-bold">git pull</strong> ou déployez une nouvelle version du code sur votre machine locale, Git met à jour uniquement les fichiers de programmation et ne touche <strong className="font-bold">jamais</strong> à vos données.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        .gitignore actif
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Sauvegarde miroir automatique
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Aucune réinitialisation au démarrage
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistiques en direct de la base */}
              {loadingBackupStats ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Chargement des informations de la base de données...
                </div>
              ) : backupStats ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-slate-500" />
                      Fichier de données actif :
                    </span>
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 font-semibold truncate max-w-xs">
                      {backupStats.dbPath}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Taille</span>
                      <span className="text-xs font-black text-slate-900">{backupStats.dbSizeFormatted}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Classes</span>
                      <span className="text-xs font-black text-indigo-600">{backupStats.classesCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Élèves</span>
                      <span className="text-xs font-black text-indigo-600">{backupStats.studentsCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">QCMs & Tests</span>
                      <span className="text-xs font-black text-indigo-600">{backupStats.qcmsCount + backupStats.testsCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Dernière modification : {new Date(backupStats.lastModified).toLocaleString('fr-FR')}</span>
                    {backupStats.hasAutoBackup && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Copie miroir prête dans data/backups/
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Boutons d'export et téléchargement */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Actions de sauvegarde manuelle :</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadSqlite}
                    className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 text-left transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block group-hover:text-indigo-600">
                          Télécharger la base SQLite
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Format brut .sqlite prêt à l'emploi
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 text-left transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-600">
                          Exporter en format JSON
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Toutes les classes, élèves et notes
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Restauration depuis un JSON */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      Restaurer des données à partir d'un fichier JSON
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Permet de réimporter facilement vos données en cas de changement de machine.
                    </p>
                  </div>

                  <label className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Choisir fichier JSON...</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreJsonFile}
                      disabled={restoringData}
                      className="hidden"
                    />
                  </label>
                </div>
                {restoringData && (
                  <p className="text-xs text-indigo-600 font-semibold animate-pulse">
                    Restauration des données en cours, veuillez patienter...
                  </p>
                )}
              </div>

              {/* Guide de déploiement local */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-xs text-indigo-950 space-y-2">
                <h5 className="font-bold flex items-center gap-1.5 text-indigo-900">
                  <Info className="w-4 h-4 text-indigo-600" />
                  Rappel pour mettre à jour votre serveur local :
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                  <li>Sur votre terminal local, exécutez simplement : <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">git pull</code></li>
                  <li>Vos fichiers de code sont mis à jour, tandis que <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">data/school.sqlite</code> reste préservé.</li>
                  <li>Si vous souhaitez délocaliser vos données hors du répertoire de travail, renseignez <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">DATA_DIR=/chemin/persistant</code> dans votre fichier <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">.env</code>.</li>
                </ol>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUEL D'UTILISATION COMPLET */}
      <ManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
      />

    </div>
  );
};
