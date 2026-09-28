import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  FileCheck,
  Paperclip,
  Download,
  ExternalLink,
  Search,
  Eye,
  X,
  Copy,
  Check,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  FileCode,
  FileSpreadsheet,
  FileImage,
  AlertCircle
} from 'lucide-react';
import { Course, AttachedFile } from '../types';
import { api } from '../api';
import { formatPythonCode } from '../utils/pythonFormatter';

interface StudentEducationalSectionProps {
  resourceType: 'cours' | 'exercice' | 'examen';
  token: string;
  studentLevel?: string;
  studentSection?: string;
  className?: string;
}

export const StudentEducationalSection: React.FC<StudentEducationalSectionProps> = ({
  resourceType,
  token,
  studentLevel = '1',
  studentSection = 'Commun',
  className = ''
}) => {
  const [resources, setResources] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  // Reading / Inspect modal
  const [readingResource, setReadingResource] = useState<Course | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentEducationalResources(token, resourceType);
      setResources(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les ressources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [resourceType, token]);

  const typeConfig = {
    cours: {
      title: 'Mes Cours',
      subtitle: 'Supports théoriques et fiches de cours',
      badge: 'Cours',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: BookOpen,
      iconColor: 'text-blue-600',
      emptyMessage: 'Aucun cours disponible pour votre niveau et section actuellement.'
    },
    exercice: {
      title: 'Mes Exercices',
      subtitle: 'Activités pratiques, TP et exercices guidés',
      badge: 'Exercice',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: FileText,
      iconColor: 'text-emerald-600',
      emptyMessage: 'Aucun exercice disponible pour votre niveau et section actuellement.'
    },
    examen: {
      title: 'Mes Examens & Évaluations',
      subtitle: 'Sujets d’examens, devoirs et fichiers joints téléchargeables',
      badge: 'Examen',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: FileCheck,
      iconColor: 'text-purple-600',
      emptyMessage: 'Aucun sujet d’examen disponible pour votre niveau et section actuellement.'
    }
  }[resourceType];

  const categories = ['Tous', 'Word', 'Excel', 'Python', 'Général'];

  const filteredResources = resources.filter(res => {
    const matchCategory = selectedCategory === 'Tous' || res.category === selectedCategory;
    const matchSearch = searchTerm === '' ||
      res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res.description && res.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (res.content && res.content.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 Ko';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <Paperclip className="w-4 h-4 text-slate-500" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'py') return <FileCode className="w-4 h-4 text-amber-600" />;
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return <FileImage className="w-4 h-4 text-purple-600" />;
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  const handleCopyPython = (code: string) => {
    navigator.clipboard.writeText(code);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const IconComponent = typeConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
            <IconComponent className={`w-6 h-6 ${typeConfig.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">{typeConfig.title}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeConfig.badgeColor}`}>
                {filteredResources.length} ressource{filteredResources.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtré automatiquement pour : <span className="font-semibold text-slate-700">Niveau {studentLevel} • Section {studentSection} • {className}</span>
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content State */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 mt-3">Chargement des contenus...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <IconComponent className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">{typeConfig.emptyMessage}</p>
          <p className="text-xs text-slate-400 mt-1">Votre enseignant publiera des ressources prochainement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const hasMultipleFiles = Array.isArray(res.attachedFiles) && res.attachedFiles.length > 0;
            const singleFile = res.fileUrl ? { name: res.fileName || 'Fichier joint', url: res.fileUrl, size: res.fileSize || 0 } : null;
            const allFiles: AttachedFile[] = hasMultipleFiles
              ? res.attachedFiles!
              : (singleFile ? [{ id: '1', name: singleFile.name, url: singleFile.url, size: singleFile.size, type: '' }] : []);

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {res.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${typeConfig.badgeColor}`}>
                      {typeConfig.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {res.title}
                    </h3>
                    {res.description && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {res.description}
                      </p>
                    )}
                  </div>

                  {/* Attached Files Pill Badge */}
                  {allFiles.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {allFiles.length} fichier{allFiles.length > 1 ? 's' : ''} joint{allFiles.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {allFiles.slice(0, 2).map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            download={file.name}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-[11px] text-slate-700 hover:text-indigo-700 transition-colors border border-slate-200"
                            title="Télécharger le fichier joint"
                          >
                            <span className="truncate max-w-[180px] flex items-center gap-1.5">
                              {getFileIcon(file.name)}
                              {file.name}
                            </span>
                            <Download className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        ))}
                        {allFiles.length > 2 && (
                          <p className="text-[10px] text-slate-400 font-semibold pl-1">
                            +{allFiles.length - 2} autre{allFiles.length - 2 > 1 ? 's' : ''} fichier{allFiles.length - 2 > 1 ? 's' : ''}...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    {new Date(res.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReadingResource(res)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Consulter</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* READING / PREVIEW MODAL */}
      {readingResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  <IconComponent className={`w-5 h-5 ${typeConfig.iconColor}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      {readingResource.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${typeConfig.badgeColor}`}>
                      {typeConfig.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {readingResource.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReadingResource(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {readingResource.description && (
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-indigo-900 text-xs leading-relaxed">
                  <span className="font-bold block text-indigo-950 mb-1">Description / Consignes :</span>
                  {readingResource.description}
                </div>
              )}

              {/* Attached Files Section for Exams & Exercises */}
              {((readingResource.attachedFiles && readingResource.attachedFiles.length > 0) || readingResource.fileUrl) && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span>Fichiers joints au sujet (à consulter ou télécharger) :</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(readingResource.attachedFiles && readingResource.attachedFiles.length > 0
                      ? readingResource.attachedFiles
                      : [{ id: '1', name: readingResource.fileName || 'Fichier joint', url: readingResource.fileUrl!, size: readingResource.fileSize || 0, type: '' }]
                    ).map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 shadow-xs transition-all group"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {getFileIcon(file.name)}
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-700">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <span className="p-1.5 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 transition-colors">
                          <Download className="w-4 h-4" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Content Body */}
              {readingResource.content && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800">Contenu du document :</h4>
                    {readingResource.category === 'Python' && (
                      <button
                        type="button"
                        onClick={() => handleCopyPython(readingResource.content)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{hasCopied ? 'Code copié !' : 'Copier le code'}</span>
                      </button>
                    )}
                  </div>

                  {readingResource.category === 'Python' ? (
                    <div
                      className="p-4 bg-slate-900 rounded-2xl overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed shadow-inner"
                      dangerouslySetInnerHTML={{ __html: formatPythonCode(readingResource.content) }}
                    />
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {readingResource.content}
                    </div>
                  )}
                </div>
              )}

              {/* Resource Link */}
              {readingResource.resourceLink && (
                <div className="pt-2">
                  <a
                    href={readingResource.resourceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ouvrir la ressource externe associée</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setReadingResource(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
