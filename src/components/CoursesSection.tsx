import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  FileText,
  Table,
  Code2,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  X,
  Eye,
  AlertCircle,
  Copy,
  Check,
  Pencil,
  Paperclip,
  Download,
  FileCode,
  FileSpreadsheet,
  FileImage,
  FileCheck,
  Sparkles,
  School,
  Layers
} from 'lucide-react';
import { Course, ClassGroup } from '../types';
import { api } from '../api';
import { formatPythonCode } from '../utils/pythonFormatter';

interface CoursesSectionProps {
  classId: string;
  token: string;
  isTeacher?: boolean;
  classes?: ClassGroup[];
}

export const CoursesSection: React.FC<CoursesSectionProps> = ({
  classId,
  token,
  isTeacher = false,
  classes = []
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [searchTerm, setSearchTerm] = useState('');

  // Course Reading Modal
  const [readingCourse, setReadingCourse] = useState<Course | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // New Course Modal (Teacher only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Word' | 'Excel' | 'Python' | 'Général'>('Word');
  const [newDescription, setNewDescription] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newResourceLink, setNewResourceLink] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([classId]);
  
  // File upload state for new course
  const [attachedFileUrl, setAttachedFileUrl] = useState<string | undefined>(undefined);
  const [attachedFileName, setAttachedFileName] = useState<string | undefined>(undefined);
  const [attachedFileType, setAttachedFileType] = useState<string | undefined>(undefined);
  const [attachedFileSize, setAttachedFileSize] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Course Modal
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'Word' | 'Excel' | 'Python' | 'Général'>('Word');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editResourceLink, setEditResourceLink] = useState('');
  const [editClassIds, setEditClassIds] = useState<string[]>([]);
  const [editFileUrl, setEditFileUrl] = useState<string | undefined>(undefined);
  const [editFileName, setEditFileName] = useState<string | undefined>(undefined);
  const [editFileType, setEditFileType] = useState<string | undefined>(undefined);
  const [editFileSize, setEditFileSize] = useState<number | undefined>(undefined);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete course state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCourses(token, classId);
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les cours');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchCourses();
      setSelectedClassIds([classId]);
    }
  }, [classId]);

  const handleFileUpload = (file: File, isEdit: boolean = false) => {
    // Check file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. La taille maximale autorisée est de 25 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (isEdit) {
        setEditFileUrl(result);
        setEditFileName(file.name);
        setEditFileType(file.type || getFallbackFileType(file.name));
        setEditFileSize(file.size);
      } else {
        setAttachedFileUrl(result);
        setAttachedFileName(file.name);
        setAttachedFileType(file.type || getFallbackFileType(file.name));
        setAttachedFileSize(file.size);
      }
    };
    reader.readAsDataURL(file);
  };

  const getFallbackFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'xlsx':
      case 'xls': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'py': return 'text/x-python';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'docx':
      case 'doc': return 'application/msword';
      default: return 'application/octet-stream';
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setAddError('Le titre et le contenu du cours sont obligatoires.');
      return;
    }

    setIsSubmitting(true);
    setAddError(null);
    try {
      await api.teacherCreateCourse(token, classId, {
        title: newTitle.trim(),
        category: newCategory,
        description: newDescription.trim(),
        content: newContent.trim(),
        resourceLink: newResourceLink.trim(),
        classIds: selectedClassIds.length > 0 ? selectedClassIds : [classId],
        fileUrl: attachedFileUrl,
        fileName: attachedFileName,
        fileType: attachedFileType,
        fileSize: attachedFileSize
      });

      setShowAddModal(false);
      setNewTitle('');
      setNewCategory('Word');
      setNewDescription('');
      setNewContent('');
      setNewResourceLink('');
      setAttachedFileUrl(undefined);
      setAttachedFileName(undefined);
      setAttachedFileType(undefined);
      setAttachedFileSize(undefined);
      setSelectedClassIds([classId]);
      await fetchCourses();
    } catch (err: any) {
      setAddError(err.message || 'Erreur lors de la création du cours');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setEditTitle(course.title);
    setEditCategory(course.category);
    setEditDescription(course.description || '');
    setEditContent(course.content);
    setEditResourceLink(course.resourceLink || '');
    setEditClassIds(course.classIds && course.classIds.length > 0 ? course.classIds : [course.classId || classId]);
    setEditFileUrl(course.fileUrl);
    setEditFileName(course.fileName);
    setEditFileType(course.fileType);
    setEditFileSize(course.fileSize);
    setEditError(null);
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editTitle.trim() || !editContent.trim()) {
      setEditError('Le titre et le contenu du cours sont obligatoires.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);
    try {
      await api.teacherUpdateCourse(token, editingCourse.id, {
        title: editTitle.trim(),
        category: editCategory,
        description: editDescription.trim(),
        content: editContent.trim(),
        resourceLink: editResourceLink.trim(),
        classIds: editClassIds.length > 0 ? editClassIds : [classId],
        fileUrl: editFileUrl,
        fileName: editFileName,
        fileType: editFileType,
        fileSize: editFileSize
      });

      setEditingCourse(null);
      await fetchCourses();
    } catch (err: any) {
      setEditError(err.message || 'Erreur lors de la mise à jour du cours');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce support de cours ?')) {
      return;
    }
    setDeletingId(courseId);
    try {
      await api.teacherDeleteCourse(token, courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      if (readingCourse?.id === courseId) {
        setReadingCourse(null);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const filteredCourses = courses.filter((c) => {
    const matchesCategory = selectedCategory === 'Tous' || c.category === selectedCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.fileName && c.fileName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Word':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <FileText className="w-3.5 h-3.5" />
            Word / Traitement de texte
          </span>
        );
      case 'Excel':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Table className="w-3.5 h-3.5" />
            Excel / Tableur
          </span>
        );
      case 'Python':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Code2 className="w-3.5 h-3.5" />
            Python / Programmation
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <BookOpen className="w-3.5 h-3.5" />
            Général
          </span>
        );
    }
  };

  const getFileBadge = (fileName?: string, fileType?: string) => {
    if (!fileName) return null;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || fileType?.includes('pdf')) {
      return { label: 'PDF', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: <FileText className="w-3.5 h-3.5 text-rose-600" /> };
    }
    if (ext === 'xlsx' || ext === 'xls' || fileType?.includes('sheet')) {
      return { label: 'Excel', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> };
    }
    if (ext === 'py' || fileType?.includes('python')) {
      return { label: 'Python Script', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: <FileCode className="w-3.5 h-3.5 text-amber-600" /> };
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext || '') || fileType?.includes('image')) {
      return { label: 'Image', bg: 'bg-sky-100 text-sky-800 border-sky-200', icon: <FileImage className="w-3.5 h-3.5 text-sky-600" /> };
    }
    return { label: ext ? ext.toUpperCase() : 'Document', bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: <Paperclip className="w-3.5 h-3.5 text-slate-600" /> };
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Supports & Fiches de Cours</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Documents (PDF, Excel, Scripts Python, Images), fiches synthétiques et ressources pédagogiques.
          </p>
        </div>

        {isTeacher && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Publier un nouveau cours</span>
          </button>
        )}
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['Tous', 'Word', 'Excel', 'Python', 'Général'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher un cours ou fichier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Course List / Cards */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Chargement des cours de la classe...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Aucun cours trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || selectedCategory !== 'Tous'
              ? 'Aucun cours ne correspond à vos critères de recherche.'
              : isTeacher
              ? 'Aucun cours n’a encore été publié pour cette classe. Cliquez sur « Publier un nouveau cours » pour commencer.'
              : 'Aucun cours n’est encore disponible pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => {
            const fileBadge = getFileBadge(course.fileName, course.fileType);
            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {getCategoryBadge(course.category)}
                    {isTeacher && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(course)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Éditer ce cours et ses classes"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          disabled={deletingId === course.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Supprimer ce cours"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  {/* Attached File Pill if any */}
                  {course.fileName && fileBadge && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {fileBadge.icon}
                        <span className="font-semibold text-slate-800 truncate max-w-[150px]">{course.fileName}</span>
                        {course.fileSize && (
                          <span className="text-[10px] text-slate-400">({formatBytes(course.fileSize)})</span>
                        )}
                      </div>
                      {course.fileUrl && (
                        <a
                          href={course.fileUrl}
                          download={course.fileName}
                          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                          title="Télécharger le fichier joint"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Multi-classes indication for teacher */}
                  {isTeacher && course.classIds && course.classIds.length > 1 && (
                    <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                      <Layers className="w-3 h-3" />
                      <span>Associé à {course.classIds.length} classes</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {new Date(course.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>

                  <button
                    onClick={() => setReadingCourse(course)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Consulter le cours</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reader Modal */}
      {readingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                {getCategoryBadge(readingCourse.category)}
                <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{readingCourse.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyContent(readingCourse.content)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors cursor-pointer"
                  title="Copier le contenu du cours"
                >
                  {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopied ? 'Copié !' : 'Copier'}</span>
                </button>
                <button
                  onClick={() => setReadingCourse(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
              {readingCourse.description && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs sm:text-sm text-indigo-900 leading-relaxed font-medium">
                  {readingCourse.description}
                </div>
              )}

              {/* Attached file section */}
              {readingCourse.fileName && readingCourse.fileUrl && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white shadow-xs border border-slate-200">
                      {getFileBadge(readingCourse.fileName, readingCourse.fileType)?.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{readingCourse.fileName}</h4>
                      <p className="text-[11px] text-slate-500">
                        {getFileBadge(readingCourse.fileName, readingCourse.fileType)?.label}
                        {readingCourse.fileSize ? ` • ${formatBytes(readingCourse.fileSize)}` : ''}
                      </p>
                    </div>
                  </div>

                  <a
                    href={readingCourse.fileUrl}
                    download={readingCourse.fileName}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger le document</span>
                  </a>
                </div>
              )}

              {/* Image preview if image */}
              {readingCourse.fileUrl && (readingCourse.fileType?.startsWith('image/') || /\.(png|jpe?g|svg|webp)$/i.test(readingCourse.fileName || '')) && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 p-2 text-center">
                  <img
                    src={readingCourse.fileUrl}
                    alt={readingCourse.fileName || 'Document visuel'}
                    className="max-h-96 mx-auto rounded-xl object-contain shadow-sm"
                  />
                </div>
              )}

              {/* Text / Code Content */}
              <div className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans bg-white p-4 rounded-2xl border border-slate-100">
                {readingCourse.content}
              </div>

              {readingCourse.resourceLink && (
                <div className="pt-4 border-t border-slate-100">
                  <a
                    href={readingCourse.resourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ouvrir la ressource externe associée</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setReadingCourse(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal (Teacher Only) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Publier un nouveau cours</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {addError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Titre du cours *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Python : Les boucles for et while"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Thème / Matière *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="Word">Word</option>
                    <option value="Excel">Excel</option>
                    <option value="Python">Python</option>
                    <option value="Général">Général</option>
                  </select>
                </div>
              </div>

              {/* Multi-class Association */}
              {classes.length > 0 && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Associer ce cours aux classes :</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {classes.map((c) => {
                      const isSelected = selectedClassIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (selectedClassIds.length > 1) {
                                setSelectedClassIds(selectedClassIds.filter((id) => id !== c.id));
                              }
                            } else {
                              setSelectedClassIds([...selectedClassIds, c.id]);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description brève (optionnelle)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: Résumé en quelques lignes des notions clés"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* File Upload Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Document ou fichier joint (PDF, Excel, Python, Image...)</span>
                  </label>
                  {attachedFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFileUrl(undefined);
                        setAttachedFileName(undefined);
                        setAttachedFileType(undefined);
                        setAttachedFileSize(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold"
                    >
                      Supprimer le fichier
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.py,.png,.jpg,.jpeg,.svg,.docx,.doc,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, false);
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />

                {attachedFileName && (
                  <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-xs">
                    {getFileBadge(attachedFileName, attachedFileType)?.icon}
                    <span className="font-semibold text-slate-800 truncate">{attachedFileName}</span>
                    <span className="text-slate-400">({formatBytes(attachedFileSize)})</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contenu du cours (texte, formules, syntaxe de code) *
                  </label>
                  {newCategory === 'Python' && (
                    <button
                      type="button"
                      onClick={() => {
                        const formatted = formatPythonCode(newContent);
                        setNewContent(formatted);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors"
                      title="Mettre en forme le code Python aux normes PEP 8"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Formater Python (PEP 8)</span>
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Tapez ici le contenu du cours, règles typographiques, exemples ou code Python..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lien ressource externe (optionnel)
                </label>
                <input
                  type="url"
                  value={newResourceLink}
                  onChange={(e) => setNewResourceLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Publication en cours...' : 'Publier le cours'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal (Teacher Only) */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <span>Modifier le support de cours</span>
              </h3>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCourse} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Titre du cours *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Thème / Matière *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="Word">Word</option>
                    <option value="Excel">Excel</option>
                    <option value="Python">Python</option>
                    <option value="Général">Général</option>
                  </select>
                </div>
              </div>

              {/* Multi-class Association */}
              {classes.length > 0 && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Classes associées à ce cours :</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {classes.map((c) => {
                      const isSelected = editClassIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (editClassIds.length > 1) {
                                setEditClassIds(editClassIds.filter((id) => id !== c.id));
                              }
                            } else {
                              setEditClassIds([...editClassIds, c.id]);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description brève (optionnelle)
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Edit Attached File */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Document ou fichier joint (PDF, Excel, Python, Image...)</span>
                  </label>
                  {editFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditFileUrl(undefined);
                        setEditFileName(undefined);
                        setEditFileType(undefined);
                        setEditFileSize(undefined);
                        if (editFileInputRef.current) editFileInputRef.current.value = '';
                      }}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold"
                    >
                      Supprimer le fichier
                    </button>
                  )}
                </div>

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.py,.png,.jpg,.jpeg,.svg,.docx,.doc,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, true);
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />

                {editFileName && (
                  <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center gap-2 text-xs">
                    {getFileBadge(editFileName, editFileType)?.icon}
                    <span className="font-semibold text-slate-800 truncate">{editFileName}</span>
                    <span className="text-slate-400">({formatBytes(editFileSize)})</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contenu du cours *
                  </label>
                  {editCategory === 'Python' && (
                    <button
                      type="button"
                      onClick={() => {
                        const formatted = formatPythonCode(editContent);
                        setEditContent(formatted);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors"
                      title="Mettre en forme le code Python aux normes PEP 8"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Formater Python (PEP 8)</span>
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={6}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lien ressource externe (optionnel)
                </label>
                <input
                  type="url"
                  value={editResourceLink}
                  onChange={(e) => setEditResourceLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Mise à jour...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
