import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Printer,
  Shield,
  Users,
  Calendar,
  Key,
  HardDrive,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  Trophy,
  HelpCircle,
  X
} from 'lucide-react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('git-deploy');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const sections: ManualSection[] = [
    {
      id: 'git-deploy',
      title: '1. Déploiement Git & Persistance',
      icon: <HardDrive className="w-4 h-4 text-indigo-600" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
            <h4 className="font-bold flex items-center gap-2 text-sm text-emerald-950 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Vos données locales ne sont JAMAIS écrasées par Git
            </h4>
            <p className="text-xs text-emerald-800">
              La base SQLite réside dans <code>./data/school.sqlite</code> (ou selon <code>DATA_DIR</code> et <code>SQLITE_FILE</code>). Ce dossier est expressément exclu dans le fichier <code>.gitignore</code>.
            </p>
          </div>

          <h4 className="font-bold text-slate-900 text-sm">Commandes de mise à jour sur votre serveur local</h4>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
{`# Télécharger la dernière version du code
git pull origin main

# Mettre à jour les packages si nécessaire
npm install

# Recompiler et relancer le serveur local
npm run build
npm start`}
          </pre>
          <p className="text-xs text-slate-600">
            Même après un <code>git pull</code> ou une nouvelle compilation, tous vos élèves, classes, cours, QCM et présences restent intégralement préservés.
          </p>
        </div>
      )
    },
    {
      id: 'teacher-access',
      title: '2. Connexion Professeur (/prof)',
      icon: <Lock className="w-4 h-4 text-sky-600" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Accès masqué et protégé pour les enseignants
            </h4>
            <p className="text-xs text-slate-600">
              Pour des raisons de simplicité et de sécurité, <strong>aucun bouton de connexion enseignant n'est visible sur la page d'accueil des élèves</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-slate-900">Comment se connecter ?</h5>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
              <li>Ouvrez votre navigateur sur l'adresse du serveur local.</li>
              <li>Dans la barre d'adresse, ajoutez simplement <code className="text-indigo-600 font-bold">/prof</code> à la fin de l'URL (ex: <code className="bg-slate-100 px-1.5 py-0.5 rounded">http://localhost:3000/prof</code>).</li>
              <li>Identifiants par défaut :
                <ul className="list-disc pl-4 mt-1 font-mono text-xs">
                  <li>Identifiant : <strong>prof</strong></li>
                  <li>Mot de passe : <strong>prof1234</strong></li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'students-management',
      title: '3. Gestion des Élèves & Mots de passe',
      icon: <Users className="w-4 h-4 text-amber-600" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <h4 className="font-bold text-slate-900 text-sm">Ajout & Import de classes</h4>
          <p className="text-xs text-slate-600">
            Vous pouvez créer des classes (ex: 6ème B, 2nde 1), puis y ajouter des élèves individuellement ou en masse via le bouton <strong>« Importer une liste d’élèves »</strong> (copier-coller de vos listes tableur ou texte).
          </p>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <h5 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-600" /> Mots de passe simples mémorisables
            </h5>
            <p className="text-xs text-amber-800">
              Chaque élève reçoit un mot de passe simple automatique facile à taper (ex: <code>soleil34</code>, <code>tigre42</code>). Vous pouvez régénérer ou personnaliser n'importe quel mot de passe à tout moment.
            </p>
          </div>

          <h4 className="font-bold text-slate-900 text-sm">Impression des fiches élèves</h4>
          <p className="text-xs text-slate-600">
            Le bouton <strong>« Imprimer fiches élèves »</strong> génère des étiquettes ou fiches de connexion avec identifiant INE et mot de passe à découper et distribuer.
          </p>
        </div>
      )
    },
    {
      id: 'student-repeating',
      title: '4. Statut Nouveau / Redoublant',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
            <h4 className="font-bold text-indigo-950 text-sm">Contrôle exclusif par le professeur</h4>
            <p className="text-xs text-indigo-800">
              Dans la liste des élèves, une case à cocher interactive permet d'alterner entre <strong>Nouveau</strong> (vert) et <strong>Redoublant</strong> (ambre).
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-slate-900">Règle de confidentialité élève :</h5>
            <p className="text-xs text-slate-600">
              <strong>L'élève ne peut en aucun cas modifier ses informations personnelles</strong>. Lorsqu'il consulte son profil, ses nom, prénom, identifiant, classe et statut sont affichés en lecture seule avec la mention explicite qu'ils sont validés par l'enseignant.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'attendance-calendar',
      title: '5. Calendrier & Feuilles de Présence',
      icon: <Calendar className="w-4 h-4 text-rose-600" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <h4 className="font-bold text-slate-900 text-sm">Module Présences & Appel</h4>
          <p className="text-xs text-slate-600">
            Accessible depuis l'onglet <strong>« Présences & Appel »</strong> de chaque classe :
          </p>

          <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600">
            <li>
              <strong>Créer une séance d'appel :</strong> définissez l'intitulé (cours, TP, évaluation...), la date, l'horaire et la salle.
            </li>
            <li>
              <strong>Pointer l'appel :</strong> bouton rapide <em>« Tout le monde présent »</em>, ou marquage individuel (Présent, Absent, Retard avec minutes, Excusé avec motif).
            </li>
            <li>
              <strong>Bilan & Assiduité :</strong> calcul immédiat du taux de présence de la classe et fiche individuelle de chaque élève.
            </li>
            <li>
              <strong>Impression :</strong> exportez et imprimez la feuille de présence officielle pour vos archives scolaires.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'courses-tests-qcms',
      title: '6. Cours, Tests Clavier & QCM',
      icon: <Trophy className="w-4 h-4 text-purple-600" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-indigo-700 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> Cours & Fiches
              </span>
              <p className="text-[11px] text-slate-600">
                Publiez des fiches de révision et documents consultables par vos élèves.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-indigo-700 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Frappe Clavier
              </span>
              <p className="text-[11px] text-slate-600">
                Évaluez la vitesse (MPM) et la précision de frappe au clavier avec relevé des scores.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-indigo-700 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Questionnaires QCM
              </span>
              <p className="text-[11px] text-slate-600">
                Créez ou importez des quiz autocorrigés avec calcul instantané de la note sur 20.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'backup-restore',
      title: '7. Sauvegarde & Restauration',
      icon: <HardDrive className="w-4 h-4 text-teal-600" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <h4 className="font-bold text-slate-900 text-sm">Gestion des copies de sécurité</h4>
          <p className="text-xs text-slate-600">
            Depuis le bouton <strong>« Sauvegardes & Données »</strong> :
          </p>

          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>
              <strong>Télécharger une sauvegarde JSON :</strong> exporte en un fichier toutes vos classes, élèves, cours, tests, QCM et présences.
            </li>
            <li>
              <strong>Restauration :</strong> rechargez ce fichier sur n'importe quel ordinateur pour retrouver l'intégralité de vos données.
            </li>
            <li>
              <strong>Sauvegarde physique du fichier SQLite :</strong> vous pouvez également copier directement le fichier <code>./data/school.sqlite</code> sur une clé USB.
            </li>
          </ul>
        </div>
      )
    }
  ];

  const filteredSections = sections.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSection = sections.find(s => s.id === activeSectionId) || sections[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Manuel d'Utilisation de l'Intranet</h3>
              <p className="text-xs text-slate-400">Guide complet d'exploitation, persistance des données et gestion scolaire</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Imprimer le manuel"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher dans le manuel (git, présence, redoublant, mot de passe...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Fichier source : <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">MANUEL_UTILISATION.md</code>
          </span>
        </div>

        {/* Content Body: Sidebar + Active Section */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="sm:w-64 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50/50 p-3 space-y-1 overflow-y-auto max-h-48 sm:max-h-full">
            {filteredSections.map(sec => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeSectionId === sec.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <span className={activeSectionId === sec.id ? 'text-white' : ''}>
                  {sec.icon}
                </span>
                <span className="truncate">{sec.title}</span>
              </button>
            ))}
          </div>

          {/* Section details */}
          <div className="flex-1 p-6 overflow-y-auto bg-white space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              {currentSection.icon}
              <h3 className="font-bold text-slate-900 text-base">{currentSection.title}</h3>
            </div>
            {currentSection.content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="text-slate-500">
            Intranet Scolaire • Déploiement local sécurisé
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fermer le manuel
          </button>
        </div>
      </div>
    </div>
  );
};
