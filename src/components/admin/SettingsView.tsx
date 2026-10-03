import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dataService, DEFAULT_INSTITUTION_SETTINGS } from '../../services/db';
import type { InstitutionSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Lock,
  Unlock,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Database,
  RefreshCw,
  AlertTriangle,
  Server,
  Layers,
  FileCheck,
  Check,
  FolderKanban,
  Download,
  FileSpreadsheet,
  FileJson,
  Eye,
  EyeOff,
  Search,
  Copy,
  Table as TableIcon,
  Code,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  ShieldCheck,
  Archive,
  Upload,
  School,
  Image as ImageIcon,
  Globe,
  Phone,
  Mail,
  Smartphone,
  Sparkles,
  MapPin,
  Laptop,
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface CollectionItem {
  id: string;
  name: string;
  firestoreCollection: string;
  description: string;
  category: string;
  badgeColor: string;
  data: any[];
}

export const SettingsView: React.FC = () => {
  const { currentUser } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  // Sync state tracking
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'error' | 'offline' | 'connecting'>(
    dataService.getSyncStatus()
  );
  const [lastSyncTime, setLastSyncTime] = useState<string>(dataService.getLastSyncTime() || new Date().toLocaleTimeString());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const restoreFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Collections Explorer state
  const [collectionSearch, setCollectionSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>('timetable_periods');
  const [dataViewMode, setDataViewMode] = useState<Record<string, 'table' | 'json'>>({});
  const [recordFilter, setRecordFilter] = useState<Record<string, string>>({});
  const [copiedCollectionId, setCopiedCollectionId] = useState<string | null>(null);

  // Academic Year State
  const [newYearInput, setNewYearInput] = useState('');
  const [yearError, setYearError] = useState<string | null>(null);
  const [yearSuccess, setYearSuccess] = useState<string | null>(null);
  const [deletingYearId, setDeletingYearId] = useState<string | null>(null);

  // Institution & Web App Branding State
  const [institutionForm, setInstitutionForm] = useState<InstitutionSettings>(dataService.getInstitutionSettings());
  const [instSaveSuccess, setInstSaveSuccess] = useState<string | null>(null);
  const [instLogoFileError, setInstLogoFileError] = useState<string | null>(null);
  const [isSavingInst, setIsSavingInst] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const appIconInputRef = useRef<HTMLInputElement | null>(null);

  // Lock status
  const isLevelLocked = dataService.isLevelAddingLocked();
  const isMarkLocked = dataService.isMarkEntryLocked();

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setRerender((v) => v + 1);
      setLastSyncTime(dataService.getLastSyncTime() || new Date().toLocaleTimeString());
    });
    return unsub;
  }, []);

  const handleToggleLevelLock = () => {
    const nextVal = !isLevelLocked;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.setLevelAddingLocked(nextVal, actor);
  };

  const handleToggleMarkLock = () => {
    const nextVal = !isMarkLocked;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.setMarkEntryLocked(nextVal, actor);
  };

  const handleSetCurrentAcademicYear = (year: string) => {
    dataService.setCurrentAcademicYear(year);
    setYearSuccess(`Active academic year set to ${year}`);
    setTimeout(() => setYearSuccess(null), 3000);
  };

  const handleAddAcademicYear = (e: React.FormEvent) => {
    e.preventDefault();
    setYearError(null);
    setYearSuccess(null);

    const clean = newYearInput.trim();
    if (!clean) {
      setYearError('Please enter an academic year (e.g., 2026-2027).');
      return;
    }

    if (!/^\d{4}-\d{4}$/.test(clean)) {
      setYearError('Format should be YYYY-YYYY (e.g., 2026-2027).');
      return;
    }

    if (state.academicYears.some((ay) => ay.year === clean)) {
      setYearError(`Academic year ${clean} already exists.`);
      return;
    }

    dataService.addAcademicYear(clean);
    setNewYearInput('');
    setYearSuccess(`Academic year ${clean} added successfully.`);
    setTimeout(() => setYearSuccess(null), 3000);
  };

  const handleDeleteYear = (id: string) => {
    const target = state.academicYears.find((ay) => ay.id === id);
    if (!target) return;
    if (target.year === state.currentAcademicYear) {
      setYearError('Cannot delete the currently active academic year.');
      return;
    }

    const success = dataService.deleteAcademicYear(id);
    if (success) {
      setYearSuccess(`Academic year ${target.year} removed.`);
      setTimeout(() => setYearSuccess(null), 3000);
    }
    setDeletingYearId(null);
  };

  // Handle image file selection (Logo, Favicon, App Icon)
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: 'logoUrl' | 'faviconUrl' | 'appIconUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setInstLogoFileError('Please select a valid image file (PNG, JPG, SVG, WebP, ICO).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setInstLogoFileError('Image file size should be less than 2MB for fast portal loading.');
      return;
    }
    setInstLogoFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setInstitutionForm((prev) => ({
        ...prev,
        [targetField]: result,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInst(true);
    setInstSaveSuccess(null);
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    await dataService.updateInstitutionSettings(institutionForm, actor);
    setIsSavingInst(false);
    setInstSaveSuccess('Institution details, logos, favicon, and app branding updated successfully!');
    setTimeout(() => setInstSaveSuccess(null), 4000);
  };

  const handleResetInstitution = () => {
    if (
      window.confirm(
        "Reset institution settings and branding back to DARUL HIDAYA DA'WA COLLEGE, MANOOR default profiles?"
      )
    ) {
      setInstitutionForm(DEFAULT_INSTITUTION_SETTINGS);
      dataService.updateInstitutionSettings(DEFAULT_INSTITUTION_SETTINGS);
      setInstSaveSuccess('Institution details reset to college default.');
      setTimeout(() => setInstSaveSuccess(null), 3000);
    }
  };

  const handleTriggerPWAInstall = () => {
    window.dispatchEvent(new CustomEvent('dhdc-trigger-pwa-install'));
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    setSyncMessage(null);
    try {
      const ok = await dataService.syncWithFirestore();
      const info = dataService.getFirebaseInfo();
      setSyncStatus(info.status);
      setLastSyncTime(info.lastSyncTime || new Date().toLocaleTimeString());
      if (ok) {
        setSyncMessage('Firestore database successfully synchronized and connected!');
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        setSyncMessage(`Sync status: ${info.error || 'Connection or daily quota issue'}`);
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(`Sync warning: ${err?.message || 'Check network connection'}`);
    }
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const res = dataService.restoreFullBackup(parsed);
        if (res.success) {
          setRestoreMessage({ type: 'success', text: res.message });
          setSyncMessage(res.message);
        } else {
          setRestoreMessage({ type: 'error', text: res.message });
        }
      } catch (err: any) {
        setRestoreMessage({ type: 'error', text: `Failed to parse JSON backup: ${err?.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Build Collections Metadata
  const allCollections: CollectionItem[] = useMemo(() => {
    return [
      {
        id: 'timetable_periods',
        name: 'Timetable Periods & Timings',
        firestoreCollection: 'timetable_periods',
        description: 'Master college period timing definitions, 24-hour start/end times, interval breaks, and period labels.',
        category: 'Schedules & Timetable',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        data: (state.timetablePeriods || []).slice().sort((a, b) => {
          if (a.startTime && b.startTime) {
            const cmp = a.startTime.localeCompare(b.startTime);
            if (cmp !== 0) return cmp;
          }
          return (a.periodNumber || 0) - (b.periodNumber || 0);
        }),
      },
      {
        id: 'timetable_slots',
        name: 'Timetable Slots & Schedule Matrix',
        firestoreCollection: 'timetable_slots',
        description: 'Day-wise weekly timetable schedule matrix, allocated classes, subjects, assigned faculty, and classrooms.',
        category: 'Schedules & Timetable',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        data: state.timetableSlots || [],
      },
      {
        id: 'classes',
        name: 'Classes & Divisions',
        firestoreCollection: 'classes',
        description: 'Academic class sections, assigned class tutors, academic year bindings, and attendance flags.',
        category: 'Academic Structure',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        data: state.classes || [],
      },
      {
        id: 'students',
        name: 'Students Directory',
        firestoreCollection: 'students',
        description: 'Registered student admissions, roll numbers, assigned class IDs, contact numbers, and parent details.',
        category: 'User Directory',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
        data: state.students || [],
      },
      {
        id: 'teachers',
        name: 'Faculty & Teachers',
        firestoreCollection: 'teachers',
        description: 'Teaching staff directory, assigned subjects, class tutor assignments, emails, and credentials.',
        category: 'User Directory',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
        data: state.teachers || [],
      },
      {
        id: 'subjects',
        name: 'Curriculum & Subjects',
        firestoreCollection: 'subjects',
        description: 'Registered subjects, course codes, pass marks, attendance tracking toggles, and split elective groups.',
        category: 'Academic Structure',
        badgeColor: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
        data: state.subjects || [],
      },
      {
        id: 'marks',
        name: 'Marks & Assessment Logs',
        firestoreCollection: 'marks',
        description: 'Individual student continuous evaluation marks, Factor 30 scores, entered grades, and timestamps.',
        category: 'Evaluations & CCE',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        data: state.marks || [],
      },
      {
        id: 'evaluation_levels',
        name: 'CCE Evaluation Levels',
        firestoreCollection: 'evaluation_levels',
        description: 'Continuous comprehensive evaluation criteria levels, maximum marks, multipliers, and display orders.',
        category: 'Evaluations & CCE',
        badgeColor: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800',
        data: state.evaluationLevels || [],
      },
      {
        id: 'attendance_records',
        name: 'Hajar Attendance Records',
        firestoreCollection: 'attendance_records',
        description: 'Daily and hourly period attendance sessions, student present/absent/late/leave statuses, and remarks.',
        category: 'Attendance & Operations',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        data: state.attendanceRecords || [],
      },
      {
        id: 'leave_applications',
        name: 'Leave Applications',
        firestoreCollection: 'leave_applications',
        description: 'Student and teacher leave requests, leave dates, medical certificates, and approval decisions.',
        category: 'Attendance & Operations',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
        data: state.leaveApplications || [],
      },
      {
        id: 'attendance_clearances',
        name: 'Attendance Clearances',
        firestoreCollection: 'attendance_clearances',
        description: 'Exam hall condonation slips and attendance duty clearances granted by tutors or administration.',
        category: 'Attendance & Operations',
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
        data: state.attendanceClearances || [],
      },
      {
        id: 'behavior_records',
        name: 'Discipline & Behavior Records',
        firestoreCollection: 'behavior_records',
        description: 'Institutional conduct entries, disciplinary warnings, merits, demerits, and student notes.',
        category: 'Student Affairs',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        data: state.behaviorRecords || [],
      },
      {
        id: 'achievements',
        name: 'Achievements & Honors',
        firestoreCollection: 'achievements',
        description: 'Student extracurricular triumphs, tournament victories, academic honors, and award certificates.',
        category: 'Student Affairs',
        badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800',
        data: state.achievements || [],
      },
      {
        id: 'complaints_feedback',
        name: 'Complaints & Feedback',
        firestoreCollection: 'complaints_feedback',
        description: 'Internal grievance submissions, feedback messages, responses, and ticket resolution logs.',
        category: 'Student Affairs',
        badgeColor: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
        data: state.complaintsFeedback || [],
      },
      {
        id: 'showcase_cards',
        name: 'Spotlight & Toppers Showcase',
        firestoreCollection: 'showcase_cards',
        description: 'Hall of fame showcase cards, featured toppers, rank holder banners, and announcements.',
        category: 'Spotlight & Showcase',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        data: state.showcaseCards || [],
      },
      {
        id: 'users',
        name: 'User Accounts & Credentials',
        firestoreCollection: 'users',
        description: 'System login accounts, usernames, assigned roles (super_admin, teacher, student), and access metadata.',
        category: 'System & Security',
        badgeColor: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
        data: (state.users || []).map((u) => ({
          ...u,
          password: u.password ? '••••••••' : '(empty)',
        })),
      },
      {
        id: 'audit_logs',
        name: 'System Audit Logs',
        firestoreCollection: 'audit_logs',
        description: 'Detailed security and activity log of all additions, edits, deletions, and actor information.',
        category: 'System & Security',
        badgeColor: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
        data: state.auditLogs || [],
      },
      {
        id: 'academic_years',
        name: 'Academic Years',
        firestoreCollection: 'academic_years',
        description: 'Registered academic calendar sessions and current active session configurations.',
        category: 'Academic Structure',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        data: state.academicYears || [],
      },
      {
        id: 'institution_settings',
        name: 'Institution & Portal Branding',
        firestoreCollection: 'institution_settings',
        description: 'Institution legal name, address, campus metadata, custom logo, favicon, and PWA web app icons.',
        category: 'System & Security',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        data: [dataService.getInstitutionSettings()],
      },
    ];
  }, [state]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allCollections.forEach((c) => set.add(c.category));
    return ['all', ...Array.from(set)];
  }, [allCollections]);

  const filteredCollections = useMemo(() => {
    return allCollections.filter((c) => {
      const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
      const matchSearch =
        !collectionSearch.trim() ||
        c.name.toLowerCase().includes(collectionSearch.toLowerCase()) ||
        c.firestoreCollection.toLowerCase().includes(collectionSearch.toLowerCase()) ||
        c.description.toLowerCase().includes(collectionSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allCollections, selectedCategory, collectionSearch]);

  const totalDocumentsCount = useMemo(() => {
    return allCollections.reduce((acc, c) => acc + (c.data?.length || 0), 0);
  }, [allCollections]);

  // Export single collection as JSON
  const handleExportJson = (collection: CollectionItem) => {
    const jsonStr = JSON.stringify(collection.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collection.firestoreCollection}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export single collection as CSV
  const handleExportCsv = (collection: CollectionItem) => {
    const data = collection.data;
    if (!data || data.length === 0) {
      alert(`Collection "${collection.firestoreCollection}" is currently empty.`);
      return;
    }

    // Extract all unique keys from objects
    const keys = Array.from(
      new Set(
        data.flatMap((item) => (typeof item === 'object' && item !== null ? Object.keys(item) : []))
      )
    );

    const headerRow = keys.map((k) => `"${k}"`).join(',');
    const rows = data.map((item) => {
      return keys
        .map((k) => {
          const val = item?.[k];
          if (val === undefined || val === null) return '""';
          if (typeof val === 'object') {
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collection.firestoreCollection}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Entire Database (All Collections Backup)
  const handleExportFullBackup = () => {
    const backupPayload: Record<string, any> = {
      backupDate: new Date().toISOString(),
      firestoreDatabaseId: 'ai-studio-studentmarkmanag-a28635d8-791b-4e42-96e4-02e2dcc4ecd6',
      projectId: 'astute-runway-96shk',
      totalCollections: allCollections.length,
      totalDocuments: totalDocumentsCount,
      collectionsSummary: Object.fromEntries(
        allCollections.map((c) => [c.firestoreCollection, c.data.length])
      ),
      collections: Object.fromEntries(
        allCollections.map((c) => [c.firestoreCollection, c.data])
      ),
    };

    const jsonStr = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portal_full_firestore_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = (collection: CollectionItem) => {
    const jsonStr = JSON.stringify(collection.data, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedCollectionId(collection.id);
      setTimeout(() => setCopiedCollectionId(null), 2500);
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure institutional locking rules, academic sessions, and live Firestore database collections
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Hidden File Input for Restoring Full Database Backup */}
          <input
            ref={restoreFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleRestoreFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => restoreFileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            title="Upload and restore all collections from a JSON backup file"
          >
            <Upload className="w-4 h-4" />
            <span>Restore From Backup JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportFullBackup}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            title="Download full JSON snapshot of all collections"
          >
            <Archive className="w-4 h-4" />
            <span>Export Entire Database (All Collections JSON)</span>
          </button>
        </div>
      </div>

      {restoreMessage && (
        <div
          className={`p-4 text-xs rounded-2xl flex items-start gap-3 border animate-fadeIn ${
            restoreMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          {restoreMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-bold block">
              {restoreMessage.type === 'success' ? 'Backup Restored Successfully' : 'Restore Failed'}
            </span>
            <span className="text-[11px] mt-0.5 block">{restoreMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setRestoreMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🏛️ Institution Profile & Branding Configuration */}
      <div id="institution-branding-settings" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Institution Identity & Web App Branding
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Active
                </span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> PWA Enabled
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Configure your official college name, campus address, custom logo, favicon, and Progressive Web App install icon.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleTriggerPWAInstall}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Test web app install prompt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Test Install App</span>
            </button>
            <button
              type="button"
              onClick={handleResetInstitution}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {instSaveSuccess && (
          <div className="p-3.5 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{instSaveSuccess}</span>
          </div>
        )}

        {instLogoFileError && (
          <div className="p-3.5 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{instLogoFileError}</span>
          </div>
        )}

        {/* Live Visual Header Preview Box */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-inner flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {institutionForm.logoUrl ? (
              <img
                src={institutionForm.logoUrl}
                alt="Logo Preview"
                className="w-12 h-12 rounded-xl object-contain bg-slate-800 p-1 border border-slate-700 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                <School className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">
                Live Branding Header Preview
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                {institutionForm.name || "DARUL HIDAYA DA'WA COLLEGE, MANOOR"}
              </h3>
              <p className="text-xs text-slate-300 truncate">
                {institutionForm.shortName || 'DHDC Portal'} • {institutionForm.address || 'Manoor, Kerala'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto shrink-0 text-xs">
            <div className="text-right hidden sm:block">
              <span className="text-slate-400 block text-[10px]">Affiliation / Reg Code</span>
              <span className="font-mono font-bold text-amber-400">{institutionForm.affiliationNumber || 'DHDC-EDU-MANOOR'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveInstitution} className="space-y-6">
          {/* Section 1: Institution Names & Taglines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <School className="w-4 h-4 text-indigo-500" />
                Institution Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={institutionForm.name}
                onChange={(e) => setInstitutionForm({ ...institutionForm, name: e.target.value })}
                placeholder="e.g. DARUL HIDAYA DA'WA COLLEGE, MANOOR"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Appears on all student report cards, printable dossiers, login header, and official certificates.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Portal Short Name / Brand Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={institutionForm.shortName}
                onChange={(e) => setInstitutionForm({ ...institutionForm, shortName: e.target.value })}
                placeholder="e.g. DHDC Portal"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Portal Subtitle / Department Tagline
              </label>
              <input
                type="text"
                value={institutionForm.subtitle || ''}
                onChange={(e) => setInstitutionForm({ ...institutionForm, subtitle: e.target.value })}
                placeholder="e.g. College Management & Academic Portal"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" />
                Campus & Postal Address
              </label>
              <textarea
                rows={2}
                value={institutionForm.address || ''}
                onChange={(e) => setInstitutionForm({ ...institutionForm, address: e.target.value })}
                placeholder="e.g. Manoor, P.O. Edappal, Malappuram Dt., Kerala 679578"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition resize-y"
              />
            </div>
          </div>

          {/* Section 2: Logo, Favicon & PWA Web App Icon */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              Visual Assets & Icons (Logo, Favicon, Web App Icon)
            </h3>

            {/* Hidden File Inputs */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'logoUrl')}
              className="hidden"
            />
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*,.ico"
              onChange={(e) => handleImageUpload(e, 'faviconUrl')}
              className="hidden"
            />
            <input
              ref={appIconInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'appIconUrl')}
              className="hidden"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Institution Logo Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Institution Logo</span>
                    <span className="text-[10px] text-slate-400">Header & Reports</span>
                  </div>
                  <div className="mt-3 flex items-center justify-center h-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden p-2">
                    {institutionForm.logoUrl ? (
                      <img
                        src={institutionForm.logoUrl}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 text-xs">
                        <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                        <span>Default Crest</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      Upload Logo
                    </button>
                    {institutionForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setInstitutionForm({ ...institutionForm, logoUrl: '' })}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={institutionForm.logoUrl || ''}
                    onChange={(e) => setInstitutionForm({ ...institutionForm, logoUrl: e.target.value })}
                    placeholder="Or enter image URL"
                    className="w-full px-2.5 py-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none font-mono truncate"
                  />
                </div>
              </div>

              {/* 2. Browser Tab Favicon Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Browser Favicon</span>
                    <span className="text-[10px] text-slate-400">Tab Icon (.ico / .svg)</span>
                  </div>
                  <div className="mt-3 flex items-center justify-center h-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden p-2">
                    {institutionForm.faviconUrl ? (
                      <img
                        src={institutionForm.faviconUrl}
                        alt="Favicon"
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 text-xs">
                        <Globe className="w-6 h-6 mb-1 text-slate-400" />
                        <span>Default Favicon</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => faviconInputRef.current?.click()}
                      className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      Upload Favicon
                    </button>
                    {institutionForm.faviconUrl && (
                      <button
                        type="button"
                        onClick={() => setInstitutionForm({ ...institutionForm, faviconUrl: '' })}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                        title="Remove Favicon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={institutionForm.faviconUrl || ''}
                    onChange={(e) => setInstitutionForm({ ...institutionForm, faviconUrl: e.target.value })}
                    placeholder="Or enter favicon URL"
                    className="w-full px-2.5 py-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none font-mono truncate"
                  />
                </div>
              </div>

              {/* 3. Progressive Web App (PWA) App Icon Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Web App (PWA) Icon</span>
                    <span className="text-[10px] text-slate-400">Mobile Home Screen</span>
                  </div>
                  <div className="mt-3 flex items-center justify-center h-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden p-2">
                    {institutionForm.appIconUrl || institutionForm.logoUrl ? (
                      <img
                        src={institutionForm.appIconUrl || institutionForm.logoUrl}
                        alt="App Icon"
                        className="w-12 h-12 rounded-xl object-contain shadow-sm border border-slate-200 dark:border-slate-700 p-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 text-xs">
                        <Smartphone className="w-6 h-6 mb-1 text-slate-400" />
                        <span>Default PWA Icon</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => appIconInputRef.current?.click()}
                      className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      Upload App Icon
                    </button>
                    {institutionForm.appIconUrl && (
                      <button
                        type="button"
                        onClick={() => setInstitutionForm({ ...institutionForm, appIconUrl: '' })}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                        title="Remove App Icon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={institutionForm.appIconUrl || ''}
                    onChange={(e) => setInstitutionForm({ ...institutionForm, appIconUrl: e.target.value })}
                    placeholder="Or enter app icon URL"
                    className="w-full px-2.5 py-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none font-mono truncate"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Contact Details & Report Card Customizations */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
              </label>
              <input
                type="text"
                value={institutionForm.phone || ''}
                onChange={(e) => setInstitutionForm({ ...institutionForm, phone: e.target.value })}
                placeholder="+91 494 268 0000"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Official Email
              </label>
              <input
                type="email"
                value={institutionForm.email || ''}
                onChange={(e) => setInstitutionForm({ ...institutionForm, email: e.target.value })}
                placeholder="dhdcmanoor@gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Website URL
              </label>
              <input
                type="text"
                value={institutionForm.website || ''}
                onChange={(e) => setInstitutionForm({ ...institutionForm, website: e.target.value })}
                placeholder="https://dhdc.in"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Affiliation / Reg Code
              </label>
              <input
                type="text"
                value={institutionForm.affiliationNumber || ''}
                onChange={(e) => setInstitutionForm({ ...institutionForm, affiliationNumber: e.target.value })}
                placeholder="DHDC-EDU-MANOOR"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>
          </div>

          {/* Section 4: Printable Report Card Note */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Report Card Header Tagline
              </label>
              <input
                type="text"
                value={institutionForm.reportCardHeader || ''}
                onChange={(e) => setInstitutionForm({ ...institutionForm, reportCardHeader: e.target.value })}
                placeholder="e.g. DARUL HIDAYA DA'WA COLLEGE, MANOOR"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Report Card Footer Note
              </label>
              <input
                type="text"
                value={institutionForm.reportCardFooter || ''}
                onChange={(e) => setInstitutionForm({ ...institutionForm, reportCardFooter: e.target.value })}
                placeholder="Continuous & Comprehensive Evaluation (CCE) Student Report Card"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Save Button Bar */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSavingInst}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isSavingInst ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Institution & Branding Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 1. Neon Serverless PostgreSQL Live Connection Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${
              syncStatus === 'error'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Neon Serverless PostgreSQL Database
                </h2>
                {syncStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Active & Connected (Prisma ORM)
                  </span>
                )}
                {syncStatus === 'syncing' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                    Syncing with Neon DB...
                  </span>
                )}
                {syncStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Database Connection Issue
                  </span>
                )}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Prisma Typed ORM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                This portal is connected to your Neon PostgreSQL database with ACID transaction support and Prisma ORM type safety.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Syncing...' : 'Refresh Live DB'}
            </button>
          </div>
        </div>

        {/* Database Diagnostic Notice Banner */}
        {dataService.getSyncError() && (
          <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800/80 text-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                  Database Connection Notice
                </h3>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  Please verify your DATABASE_URL in .env:
                  <span className="font-mono font-bold block mt-1 p-2 bg-amber-100/80 dark:bg-amber-900/80 rounded-lg text-amber-950 dark:text-amber-100 text-[11px]">
                    {dataService.getSyncError()}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {syncMessage && !dataService.getSyncError() && (
          <div className="p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Database Engine</div>
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
              Neon PostgreSQL
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">ORM: Prisma Client</div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Storage Architecture</div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Cloud Sync + Local Cache
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Timetable edits strictly retained</div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Last Sync Check</div>
            <div className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{lastSyncTime}</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Auto-reconnection enabled</div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Stored Data</div>
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {allCollections.length} Collections · {totalDocumentsCount} Docs
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">All available to view & export below</div>
          </div>
        </div>
      </div>

      {/* 2. 🗄️ Firestore Collections & Data Explorer (Requested Feature) */}
      <div id="firestore-collections-explorer" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Firestore Collections & Stored Data Explorer
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {allCollections.length} Collections
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Inspect real-time data records stored inside each collection, view document fields, and export each collection to JSON or CSV format.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportFullBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition shadow-xs cursor-pointer self-start md:self-auto shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export All Collections (Backup JSON)</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Collection */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search collections (e.g. timetable, marks, students, classes)..."
              value={collectionSearch}
              onChange={(e) => setCollectionSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'All Collections' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Collections Accordion List */}
        <div className="space-y-3.5">
          {filteredCollections.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              No collections found matching &quot;{collectionSearch}&quot; in category &quot;{selectedCategory}&quot;.
            </div>
          ) : (
            filteredCollections.map((col) => {
              const isExpanded = expandedCollectionId === col.id;
              const viewMode = dataViewMode[col.id] || 'table';
              const filterText = (recordFilter[col.id] || '').trim().toLowerCase();

              // Filter records for this collection
              const displayRecords = filterText
                ? col.data.filter((item) => {
                    const str = JSON.stringify(item).toLowerCase();
                    return str.includes(filterText);
                  })
                : col.data;

              // Extract top keys for table view
              const tableKeys = Array.from(
                new Set(
                  col.data.slice(0, 10).flatMap((item) =>
                    typeof item === 'object' && item !== null ? Object.keys(item) : []
                  )
                )
              ).slice(0, 8); // top 8 columns for clean viewing

              return (
                <div
                  key={col.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'border-indigo-300 dark:border-indigo-800/80 bg-white dark:bg-slate-850 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Collection Header Row */}
                  <div className="p-4 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {col.name}
                          </h3>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            /{col.firestoreCollection}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${col.badgeColor}`}>
                            {col.data.length} {col.data.length === 1 ? 'doc' : 'docs'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                          {col.description}
                        </p>
                      </div>
                    </div>

                    {/* Collection Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportJson(col)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                        title={`Export ${col.name} as JSON file`}
                      >
                        <FileJson className="w-3.5 h-3.5" />
                        <span>Export JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportCsv(col)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                        title={`Export ${col.name} as CSV spreadsheet`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCollectionId(isExpanded ? null : col.id)
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isExpanded
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hide Data</span>
                            <ChevronUp className="w-3 h-3 ml-0.5" />
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Data</span>
                            <ChevronDown className="w-3 h-3 ml-0.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Data Inspector Workspace */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-850 p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-900/90 rounded-b-2xl space-y-4 animate-fadeIn">
                      {/* Sub-header Toolbar inside expanded collection */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Documents in /{col.firestoreCollection} ({displayRecords.length} of {col.data.length})
                          </span>

                          {/* View Mode Switcher */}
                          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
                            <button
                              type="button"
                              onClick={() =>
                                setDataViewMode({ ...dataViewMode, [col.id]: 'table' })
                              }
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                viewMode === 'table'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                              }`}
                            >
                              <TableIcon className="w-3 h-3" />
                              <span>Table View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDataViewMode({ ...dataViewMode, [col.id]: 'json' })
                              }
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                viewMode === 'json'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                              }`}
                            >
                              <Code className="w-3 h-3" />
                              <span>Raw JSON</span>
                            </button>
                          </div>
                        </div>

                        {/* Search in collection records & Copy */}
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Filter records..."
                              value={recordFilter[col.id] || ''}
                              onChange={(e) =>
                                setRecordFilter({ ...recordFilter, [col.id]: e.target.value })
                              }
                              className="pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 w-44"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyJson(col)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                            title="Copy collection JSON to clipboard"
                          >
                            {copiedCollectionId === col.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy JSON</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Display Data */}
                      {col.data.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 italic bg-white dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                          Collection /{col.firestoreCollection} is currently empty. Data will populate as records are created in the portal.
                        </div>
                      ) : viewMode === 'table' ? (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-850 max-h-96 overflow-y-auto">
                          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3 w-10">#</th>
                                {tableKeys.map((key) => (
                                  <th key={key} className="py-2.5 px-3 whitespace-nowrap">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                              {displayRecords.map((item, idx) => (
                                <tr
                                  key={item.id || idx}
                                  className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition"
                                >
                                  <td className="py-2 px-3 text-slate-400 font-sans">{idx + 1}</td>
                                  {tableKeys.map((key) => {
                                    const val = item?.[key];
                                    let cellContent: React.ReactNode = String(val ?? '');

                                    if (val === undefined || val === null) {
                                      cellContent = <span className="text-slate-300 dark:text-slate-600 italic">null</span>;
                                    } else if (typeof val === 'boolean') {
                                      cellContent = (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            val
                                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                          }`}
                                        >
                                          {String(val)}
                                        </span>
                                      );
                                    } else if (typeof val === 'object') {
                                      cellContent = (
                                        <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-xs block font-mono">
                                          {JSON.stringify(val)}
                                        </span>
                                      );
                                    }

                                    return (
                                      <td
                                        key={key}
                                        className="py-2 px-3 max-w-[220px] truncate whitespace-nowrap"
                                        title={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                      >
                                        {cellContent}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="relative">
                          <pre className="p-4 bg-slate-900 text-slate-100 dark:bg-black rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 overflow-y-auto leading-relaxed border border-slate-800">
                            {JSON.stringify(displayRecords, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Institutional Locking System */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            Institutional Locking System
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Super admin controls to freeze syllabus configuration or lock mark entries across the entire portal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Level Adding Lock */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              isLevelLocked
                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`p-1.5 rounded-md ${
                      isLevelLocked
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isLevelLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Lock Evaluation Level Adding
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  When enabled, teachers and non-super-admin users are strictly prevented from adding, renaming, or deleting syllabus evaluation levels.
                </p>
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isLevelLocked
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    {isLevelLocked ? '● Levels Locked' : '● Levels Open for Editing'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleToggleLevelLock}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer shrink-0 ${
                  isLevelLocked
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300'
                }`}
              >
                {isLevelLocked ? 'Unlock Levels' : 'Lock Levels'}
              </button>
            </div>
          </div>

          {/* Total Mark Entry Lock */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              isMarkLocked
                ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`p-1.5 rounded-md ${
                      isMarkLocked
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isMarkLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Lock Total Mark Entry
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  When enabled, all faculty mark entry, Excel uploads, and edits are frozen. Mark sheets remain visible in read-only mode for audit and reporting.
                </p>
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isMarkLocked
                        ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    {isMarkLocked ? '● Mark Entry Frozen' : '● Mark Entry Active'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleToggleMarkLock}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer shrink-0 ${
                  isMarkLocked
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300'
                }`}
              >
                {isMarkLocked ? 'Unlock Marks' : 'Lock Mark Entry'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Academic Year Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Academic Year Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Register academic sessions and choose which academic year is active by default across classes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Active Session:</span>
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs rounded-md">
                {state.currentAcademicYear}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback alerts */}
        {yearError && (
          <div className="mb-4 p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {yearError}
          </div>
        )}
        {yearSuccess && (
          <div className="mb-4 p-3 text-xs rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {yearSuccess}
          </div>
        )}

        {/* Add new academic year form */}
        <form onSubmit={handleAddAcademicYear} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={newYearInput}
            onChange={(e) => setNewYearInput(e.target.value)}
            placeholder="Add new academic year (e.g. 2026-2027)"
            className="flex-1 px-3.5 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Academic Year
          </button>
        </form>

        {/* Academic Years List */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Associated Classes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {state.academicYears.map((ay) => {
                const isCurrent = ay.year === state.currentAcademicYear;
                const classCount = state.classes.filter((c) => c.academicYear === ay.year).length;

                return (
                  <tr key={ay.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {ay.year}
                    </td>
                    <td className="py-3.5 px-4">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Current Active Session
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Standard Session</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {classCount} {classCount === 1 ? 'Class' : 'Classes'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isCurrent && (
                          <button
                            onClick={() => handleSetCurrentAcademicYear(ay.year)}
                            className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-xs font-semibold transition cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}
                        {!isCurrent && (
                          <button
                            onClick={() => setDeletingYearId(ay.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition cursor-pointer"
                            title="Delete Academic Year"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Year Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletingYearId}
        onClose={() => setDeletingYearId(null)}
        onConfirm={() => deletingYearId && handleDeleteYear(deletingYearId)}
        title="Delete Academic Year"
        message="Are you sure you want to remove this academic year? Classes already assigned to this year will remain intact."
        confirmText="Delete Year"
        isDestructive={true}
      />
    </div>
  );
};
