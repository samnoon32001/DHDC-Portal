import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/db';
import { DashboardShowcaseBanner } from '../showcase/DashboardShowcaseBanner';
import { Modal } from '../common/Modal';
import { ImageUploadField } from '../common/ImageUploadField';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  GraduationCap,
  School,
  BookOpen,
  UserCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  UserPlus,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  Edit2,
  Plus,
  Coffee,
  Split,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Save,
  X,
  RotateCcw,
} from 'lucide-react';
import type { NavSection } from '../layout/Sidebar';
import type { DayOfWeek, TimetablePeriodDefinition } from '../../types';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const AdminDashboard: React.FC<{ onNavigate: (section: NavSection) => void }> = ({
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const [dbState, setDbState] = useState(() => dataService.getState());

  useEffect(() => {
    return dataService.subscribe(() => {
      setDbState(dataService.getState());
    });
  }, []);

  const state = dbState;

  const totalStudents = state.students.length;
  const activeStudents = state.students.filter((s) => s.status === 'active').length;
  const totalTeachers = state.teachers.length;
  const activeTeachers = state.teachers.filter((t) => t.status === 'active').length;
  const totalClasses = state.classes.length;
  const totalSubjects = state.subjects.length;
  const totalMarks = state.marks.length;

  const recentLogs = state.auditLogs.slice(0, 6);
  const recentStudents = state.students.slice(-5).reverse();

  // Quick Add Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [formAdmissionNumber, setFormAdmissionNumber] = useState('');
  const [formName, setFormName] = useState('');
  const [formClassId, setFormClassId] = useState(state.classes[0]?.id || '');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [quickAddSuccess, setQuickAddSuccess] = useState<string | null>(null);

  // Today's Timetable Section State in Super Admin Dashboard
  const [isTimetableOpen, setIsTimetableOpen] = useState(true);
  const [timetableScheduleMode, setTimetableScheduleMode] = useState<'class' | 'teacher'>('class');
  const [selectedTimetableClassId, setSelectedTimetableClassId] = useState<string>(() => state.classes[0]?.id || '');
  const [selectedTimetableTeacherId, setSelectedTimetableTeacherId] = useState<string>(() => state.teachers[0]?.id || '');

  // Real today's day of week
  const todayDayOfWeek = useMemo<DayOfWeek>(() => {
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()] || 'Monday';
  }, []);
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<DayOfWeek>(todayDayOfWeek);

  // Period Timings Edit Modal State
  const [editingPeriod, setEditingPeriod] = useState<Partial<TimetablePeriodDefinition> | null>(null);
  const [periodSuccessToast, setPeriodSuccessToast] = useState<string | null>(null);
  const [periodFormError, setPeriodFormError] = useState<string | null>(null);

  // Auto-sync class/teacher defaults
  useEffect(() => {
    if (state.classes.length > 0 && (!selectedTimetableClassId || !state.classes.some((c) => c.id === selectedTimetableClassId))) {
      setSelectedTimetableClassId(state.classes[0].id);
    }
  }, [state.classes, selectedTimetableClassId]);

  useEffect(() => {
    if (state.teachers.length > 0 && (!selectedTimetableTeacherId || !state.teachers.some((t) => t.id === selectedTimetableTeacherId))) {
      setSelectedTimetableTeacherId(state.teachers[0].id);
    }
  }, [state.teachers, selectedTimetableTeacherId]);

  // Master periods sorted chronologically by start time
  const timetablePeriods = useMemo(() => {
    return (state.timetablePeriods || []).slice().sort((a, b) => {
      if (a.startTime && b.startTime) {
        const cmp = a.startTime.localeCompare(b.startTime);
        if (cmp !== 0) return cmp;
      }
      return (a.periodNumber || 0) - (b.periodNumber || 0);
    });
  }, [state.timetablePeriods]);

  // Current system minutes for live indicators
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTimeToMinutes = (timeStr?: string) => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Helper to add minutes to time
  const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
    if (!timeStr || !timeStr.includes(':')) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return '';
    const totalMinutes = (h * 60 + m + minutesToAdd) % (24 * 60);
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Today's scheduled slots for current class or teacher
  const displayTimetableSlots = useMemo(() => {
    const slots = state.timetableSlots || [];
    const subjects = state.subjects || [];
    const teachers = state.teachers || [];
    const classes = state.classes || [];

    return timetablePeriods.map((period) => {
      let matchingSlots = [];
      if (timetableScheduleMode === 'class') {
        matchingSlots = slots.filter(
          (s) =>
            s.classId === selectedTimetableClassId &&
            s.dayOfWeek.toLowerCase() === selectedTimetableDay.toLowerCase() &&
            s.periodNumber === period.periodNumber
        );
      } else {
        matchingSlots = slots.filter(
          (s) =>
            s.teacherId === selectedTimetableTeacherId &&
            s.dayOfWeek.toLowerCase() === selectedTimetableDay.toLowerCase() &&
            s.periodNumber === period.periodNumber
        );
      }

      const primarySlot = matchingSlots[0];
      const secondarySlot = matchingSlots[1];

      const subject = primarySlot ? subjects.find((s) => s.id === primarySlot.subjectId) : undefined;
      const teacherObj = primarySlot ? teachers.find((t) => t.id === primarySlot.teacherId) : undefined;
      const cls = primarySlot ? classes.find((c) => c.id === primarySlot.classId) : undefined;
      const secondarySubject = secondarySlot ? subjects.find((s) => s.id === secondarySlot.subjectId) : undefined;

      const pStart = parseTimeToMinutes(period.startTime);
      const pEnd = parseTimeToMinutes(period.endTime);

      const isToday = selectedTimetableDay.toLowerCase() === todayDayOfWeek.toLowerCase();
      const isOngoing = isToday && currentMinutes >= pStart && currentMinutes < pEnd;
      const isNext = isToday && currentMinutes < pStart && currentMinutes >= pStart - 30;

      return {
        period,
        slot: primarySlot,
        subject,
        teacherObj,
        cls,
        secondarySlot,
        secondarySubject,
        isOngoing,
        isNext,
      };
    });
  }, [
    state.timetableSlots,
    state.subjects,
    state.teachers,
    state.classes,
    timetablePeriods,
    timetableScheduleMode,
    selectedTimetableClassId,
    selectedTimetableTeacherId,
    selectedTimetableDay,
    todayDayOfWeek,
    currentMinutes,
  ]);

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod) return;
    setPeriodFormError(null);

    const startTime = (editingPeriod.startTime || '').trim();
    const endTime = (editingPeriod.endTime || '').trim();

    if (!startTime || !endTime) {
      setPeriodFormError('Both Start Time and End Time are required.');
      return;
    }

    const isBreak = editingPeriod.isBreak || false;
    const periodNum = editingPeriod.periodNumber || (isBreak ? 0 : timetablePeriods.filter((p) => !p.isBreak).length + 1);
    const periodName = (editingPeriod.name || '').trim() || (isBreak ? (editingPeriod.breakLabel || 'Interval Break') : `Period ${periodNum}`);

    if (editingPeriod.id) {
      dataService.updateTimetablePeriod(editingPeriod.id, {
        name: periodName,
        periodNumber: periodNum,
        startTime,
        endTime,
        isBreak,
        breakLabel: isBreak ? (editingPeriod.breakLabel || periodName) : undefined,
      });
      setPeriodSuccessToast(`Period timing "${periodName}" (${startTime} - ${endTime}) updated successfully!`);
    } else {
      dataService.addTimetablePeriod({
        id: `period-${Date.now()}`,
        periodNumber: periodNum,
        name: periodName,
        startTime,
        endTime,
        isBreak,
        breakLabel: isBreak ? (editingPeriod.breakLabel || periodName) : undefined,
      });
      setPeriodSuccessToast(`New ${isBreak ? 'break' : 'period'} "${periodName}" (${startTime} - ${endTime}) added successfully!`);
    }

    setDbState(dataService.getState());
    setEditingPeriod(null);
    setTimeout(() => setPeriodSuccessToast(null), 4000);
  };

  const handleDeletePeriod = (id: string) => {
    const p = timetablePeriods.find((item) => item.id === id);
    if (confirm(`Are you sure you want to delete "${p?.name || 'this period'}" (${p?.startTime} - ${p?.endTime})?`)) {
      dataService.deleteTimetablePeriod(id);
      setDbState(dataService.getState());
      setPeriodSuccessToast(`Period "${p?.name || id}" deleted successfully.`);
      setTimeout(() => setPeriodSuccessToast(null), 4000);
    }
  };

  const handleOpenAddStudent = () => {
    setFormAdmissionNumber('');
    setFormName('');
    setFormClassId(state.classes[0]?.id || '');
    setFormPhone('');
    setFormEmail('');
    setFormPhoto('');
    setFormPassword('');
    setFormError(null);
    setIsAddStudentOpen(true);
  };

  const handleQuickAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanAdmission = formAdmissionNumber.trim();
    const cleanName = formName.trim();

    if (!cleanAdmission || !cleanName || !formClassId) {
      setFormError('Admission number, full name, and class are required.');
      return;
    }

    // Check unique admission number
    const duplicateAdmission = state.students.find(
      (s) => s.admissionNumber.toLowerCase() === cleanAdmission.toLowerCase()
    );
    if (duplicateAdmission) {
      setFormError(`Admission number "${cleanAdmission}" is already in use by ${duplicateAdmission.name}.`);
      return;
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    dataService.addStudent(
      {
        admissionNumber: cleanAdmission,
        name: cleanName,
        classId: formClassId,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        photoUrl: formPhoto || undefined,
        username: cleanAdmission,
        status: 'active',
      },
      formPassword.trim() || 'student123',
      actor
    );

    setIsAddStudentOpen(false);
    setQuickAddSuccess(`Student "${cleanName}" (${cleanAdmission}) added successfully!`);
    setTimeout(() => setQuickAddSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Spotlight Toppers Banner (Ad style priority carousel) */}
      <DashboardShowcaseBanner />

      {/* Success Notification Toast for Quick Add */}
      {quickAddSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{quickAddSuccess}</span>
          </div>
          <button
            onClick={() => onNavigate('students')}
            className="text-xs underline font-bold hover:text-emerald-900 dark:hover:text-white cursor-pointer"
          >
            View in Student Directory →
          </button>
        </div>
      )}

      {/* Success Notification Toast for Period Timings */}
      {periodSuccessToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{periodSuccessToast}</span>
          </div>
          <button
            onClick={() => onNavigate('timetable')}
            className="text-xs underline font-bold hover:text-emerald-900 dark:hover:text-white cursor-pointer"
          >
            Open Timetable & Schedule Matrix →
          </button>
        </div>
      )}

      {/* Quick Action Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            System Overview & Count Statistics
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="dashboard-quick-timetable-btn"
            onClick={() => onNavigate('timetable')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Timetable & Schedule</span>
          </button>
          <button
            id="dashboard-quick-add-student-btn"
            onClick={handleOpenAddStudent}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
          <button
            id="dashboard-quick-import-excel-btn"
            onClick={() => onNavigate('excel-import')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Coloured Count Cards (Old Model with vibrant colors) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Students Enrolment (Vibrant Blue/Indigo Card) */}
        <div
          id="stat-card-students"
          onClick={() => onNavigate('students')}
          className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-blue-400/30 flex flex-col justify-between group"
        >
          {/* Subtle Watermark */}
          <Users className="absolute -right-3 -bottom-3 w-28 h-28 text-white/10 group-hover:scale-105 transition-transform pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
              Students Enrolment
            </span>
            <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-xs shadow-inner">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="relative z-10 mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {totalStudents}
              </span>
              <span className="text-xs text-blue-100 font-medium">
                Total Registered
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-white/20 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-300 shadow-xs"></span>
                {activeStudents} Active
              </span>
              <span className="text-blue-200/60">•</span>
              <span className="text-blue-100/90 font-medium">
                {totalStudents - activeStudents} Inactive
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Faculty & Teachers (Vibrant Purple/Violet Card) */}
        <div
          id="stat-card-teachers"
          onClick={() => onNavigate('teachers')}
          className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-600 to-fuchsia-700 text-white rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-purple-400/30 flex flex-col justify-between group"
        >
          {/* Subtle Watermark */}
          <GraduationCap className="absolute -right-3 -bottom-3 w-28 h-28 text-white/10 group-hover:scale-105 transition-transform pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-100">
              Faculty & Teachers
            </span>
            <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-xs shadow-inner">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          <div className="relative z-10 mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {totalTeachers}
              </span>
              <span className="text-xs text-purple-100 font-medium">
                Total Faculty
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-white/20 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-300 shadow-xs"></span>
                {activeTeachers} Active
              </span>
              <span className="text-purple-200/60">•</span>
              <span className="text-purple-100/90 font-medium">
                {totalTeachers - activeTeachers} Inactive
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Classes & Sections (Vibrant Amber/Orange Card) */}
        <div
          id="stat-card-classes"
          onClick={() => onNavigate('classes')}
          className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-amber-400/30 flex flex-col justify-between group"
        >
          {/* Subtle Watermark */}
          <School className="absolute -right-3 -bottom-3 w-28 h-28 text-white/10 group-hover:scale-105 transition-transform pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
              Classes & Sections
            </span>
            <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-xs shadow-inner">
              <School className="w-5 h-5" />
            </div>
          </div>

          <div className="relative z-10 mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {totalClasses}
              </span>
              <span className="text-xs text-amber-100 font-medium">
                Active Divisions
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-white/20 text-xs">
              <span className="font-bold text-white">
                AY {state.currentAcademicYear}
              </span>
              <span className="text-amber-200/60">•</span>
              <span className="text-amber-100/90 font-medium">
                {totalSubjects} Subjects
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Assessment Matrix (Vibrant Emerald/Teal Card) */}
        <div
          id="stat-card-assessments"
          onClick={() => onNavigate('evaluation-levels')}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-emerald-400/30 flex flex-col justify-between group"
        >
          {/* Subtle Watermark */}
          <BookOpen className="absolute -right-3 -bottom-3 w-28 h-28 text-white/10 group-hover:scale-105 transition-transform pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Assessment Matrix
            </span>
            <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-xs shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="relative z-10 mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {totalMarks}
              </span>
              <span className="text-xs text-emerald-100 font-medium">
                Entries Logged
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-white/20 text-xs">
              <span className="font-bold text-white">
                {state.evaluationLevels.length} CCE Levels
              </span>
              <span className="text-emerald-200/60">•</span>
              <span className="text-emerald-100/90 font-medium">
                Factor 30 Standard
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 📅 Institutional Timetable & Daily Schedule Section (Super Admin View) */}
      <div id="super-admin-timetable-section" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Today&apos;s Institutional Timetable & Schedule
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live schedule"></span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {selectedTimetableDay}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Real-time college period progress, active lectures, room allocations, and schedule management.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher: By Class vs By Teacher */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setTimetableScheduleMode('class')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  timetableScheduleMode === 'class'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Class
              </button>
              <button
                type="button"
                onClick={() => setTimetableScheduleMode('teacher')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  timetableScheduleMode === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Teacher
              </button>
            </div>

            {/* Class / Teacher Select */}
            {timetableScheduleMode === 'class' ? (
              <select
                id="select-admin-timetable-class"
                value={selectedTimetableClassId}
                onChange={(e) => setSelectedTimetableClassId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[160px] truncate"
              >
                {state.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academicYear})
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="select-admin-timetable-teacher"
                value={selectedTimetableTeacherId}
                onChange={(e) => setSelectedTimetableTeacherId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[160px] truncate"
              >
                {state.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            {/* Day Selector */}
            <select
              value={selectedTimetableDay}
              onChange={(e) => setSelectedTimetableDay(e.target.value as DayOfWeek)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d} {d === todayDayOfWeek ? '(Today)' : ''}
                </option>
              ))}
            </select>

            {/* Add Period / Break Button */}
            <button
              type="button"
              onClick={() =>
                setEditingPeriod({
                  periodNumber: timetablePeriods.filter((p) => !p.isBreak).length + 1,
                  name: `Period ${timetablePeriods.filter((p) => !p.isBreak).length + 1}`,
                  startTime: '08:00',
                  endTime: '08:45',
                  isBreak: false,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Period</span>
            </button>

            {/* Open Full Timetable */}
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              <span>Master Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsTimetableOpen(!isTimetableOpen)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title={isTimetableOpen ? 'Collapse timetable' : 'Expand timetable'}
            >
              {isTimetableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Timetable Body */}
        {isTimetableOpen && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Period Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {displayTimetableSlots.map((item) => {
                const { period, slot, subject, teacherObj, cls, secondarySubject, isOngoing, isNext } = item;
                const hasSlot = slot != null && subject != null;

                if (period.isBreak) {
                  return (
                    <div
                      key={period.id}
                      className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-300">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>{period.breakLabel || period.name}</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                          Interval
                        </span>
                      </div>

                      <div className="my-2">
                        <div className="text-xs font-mono font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{period.startTime} - {period.endTime}</span>
                        </div>
                        <div className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                          College-wide break
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingPeriod(period)}
                          className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Timing</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={period.id}
                    className={`relative p-3.5 rounded-xl border transition-all duration-200 min-h-[130px] flex flex-col justify-between ${
                      isOngoing
                        ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/70 dark:via-slate-900 dark:to-teal-950/50 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : isNext
                        ? 'bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/70 dark:via-slate-900 dark:to-orange-950/50 border-2 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                        : hasSlot
                        ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600'
                        : 'bg-slate-50/70 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-700/80'
                    }`}
                  >
                    {/* Card Top: Period Badge & Time */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[11px] font-bold font-mono">
                          P{period.periodNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {period.name}
                        </span>
                      </div>

                      {isOngoing ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white animate-pulse">
                          Active Now
                        </span>
                      ) : isNext ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                          Next
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingPeriod(period)}
                          className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer flex items-center gap-1"
                          title="Click to edit timing"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{period.startTime}</span>
                        </button>
                      )}
                    </div>

                    {/* Card Middle: Subject & Room */}
                    <div className="my-2">
                      {hasSlot ? (
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {subject?.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {timetableScheduleMode === 'class' ? (
                              <span>{teacherObj?.name || 'Teacher unassigned'}</span>
                            ) : (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{cls?.name || 'Class'}</span>
                            )}
                            {slot?.room && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                                {slot.room}
                              </span>
                            )}
                          </div>
                          {secondarySubject && (
                            <div className="mt-1 text-[10px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
                              <Split className="w-3 h-3 text-purple-500" />
                              <span>Split: {secondarySubject.name}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs italic text-slate-400 dark:text-slate-500 py-1">
                          No lecture scheduled
                        </div>
                      )}
                    </div>

                    {/* Card Bottom: Timing & Quick Edit Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px]">
                        {period.startTime} - {period.endTime}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingPeriod(period)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-1 transition cursor-pointer"
                        title="Edit period timing"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Timing</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Master Period Timings Ribbon */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>College Period Master Schedule:</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {timetablePeriods.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setEditingPeriod(p)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition cursor-pointer border ${
                        p.isBreak
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                      title={`Click to edit timing for ${p.name}`}
                    >
                      <strong>{p.isBreak ? 'Interval' : `P${p.periodNumber}`}:</strong> {p.startTime}-{p.endTime}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setEditingPeriod({
                      periodNumber: timetablePeriods.filter((p) => !p.isBreak).length + 1,
                      name: `Period ${timetablePeriods.filter((p) => !p.isBreak).length + 1}`,
                      startTime: '08:00',
                      endTime: '08:45',
                      isBreak: false,
                    })
                  }
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Period / Break</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('timetable')}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Matrix</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Class Statistics & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes & Student Enrolment Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Class Enrolment & Teaching Assignments
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active classes in academic year {state.currentAcademicYear}
              </p>
            </div>
            <button
              onClick={() => onNavigate('classes')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
            >
              Manage Classes <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {state.classes.map((c) => {
              const studentsInClass = state.students.filter((s) => s.classId === c.id);
              const subjectsInClass = state.subjects.filter((s) => s.classId === c.id);
              const classTeacher = state.teachers.find((t) => t.id === c.classTeacherId);

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {c.name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-800">
                        {c.academicYear}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Class Teacher:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {classTeacher?.name || 'Not Assigned'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                        {studentsInClass.length}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Students</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                        {subjectsInClass.length}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Subjects</div>
                    </div>
                    <button
                      onClick={() => onNavigate('classes')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs cursor-pointer"
                    >
                      View Class
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Highlights / Evaluation Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              CCE Evaluation System
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Continuous and Comprehensive Evaluation configured for school standards.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 border-l-indigo-500">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  30-Mark Subject Weightage
                </div>
                <div className="text-xs font-mono text-indigo-700 dark:text-indigo-400 mt-1 font-semibold">
                  Formula: (Total Obtained / Total Max) × 30
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 border-l-emerald-500">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Dynamic Evaluation Levels
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Supports unlimited CCE levels with custom maximum marks (e.g. 70, 100).
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 border-l-amber-500">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Total Marks Recorded
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {totalMarks} entries
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigate('reports')}
              className="w-full py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 rounded-md transition text-center cursor-pointer"
            >
              Generate Full Institution Reports →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity & Recent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Recent System Activity & Audit Trail
              </h3>
            </div>
            <button
              onClick={() => onNavigate('audit-logs')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              All Logs
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 truncate mt-0.5">
                    {log.details}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    By: {log.userName} ({log.role})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Added Students */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Recently Enrolled Students
              </h3>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              View All Students
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentStudents.map((std) => {
              const classRoom = state.classes.find((c) => c.id === std.classId);
              return (
                <div key={std.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {std.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Ad.No: <span className="font-mono text-indigo-600 dark:text-indigo-400">{std.admissionNumber}</span> | Class: {classRoom?.name || 'Unassigned'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Add Student Modal */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title="Quick Student Admission"
        maxWidth="lg"
      >
        <form onSubmit={handleQuickAddStudent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Student Photo Upload */}
          <ImageUploadField
            id="quick-add-student-photo"
            label="Student Photo (Optional)"
            value={formPhoto}
            onChange={setFormPhoto}
            helperText="Upload image file or paste web URL. Compresses automatically."
            aspectRatio="square"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Admission Number *
              </label>
              <input
                type="text"
                value={formAdmissionNumber}
                onChange={(e) => setFormAdmissionNumber(e.target.value)}
                placeholder="e.g. ADM2026-042"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Class *
              </label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {state.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academicYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Student Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Bilal Ahmed"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Parent / Student Phone (Optional)
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Portal Initial Password (Optional)
            </label>
            <input
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="Default: student123"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Username will automatically match Admission Number.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Complete Admission
            </button>
          </div>
        </form>
      </Modal>

      {/* ⏰ Master Period Definition Modal (Direct Period Timings Editor in Super Admin View) */}
      {editingPeriod && (
        <Modal
          isOpen={!!editingPeriod}
          onClose={() => setEditingPeriod(null)}
          title={editingPeriod.id ? 'Edit Period Timing' : 'Add Period / Break'}
          maxWidth="md"
        >
          <form onSubmit={handleSavePeriod} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
              Configure period number, name, start time and end time for college schedule.
            </p>

            {periodFormError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{periodFormError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={editingPeriod.isBreak || false}
                  onChange={(e) => {
                    const isBrk = e.target.checked;
                    setEditingPeriod({
                      ...editingPeriod,
                      isBreak: isBrk,
                      name: isBrk ? 'Morning Interval' : `Period ${editingPeriod.periodNumber || 1}`,
                      breakLabel: isBrk ? 'Morning Interval' : undefined,
                    });
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Is this an Interval / Lunch & Prayer Break?</span>
              </label>
            </div>

            {!editingPeriod.isBreak ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Period Number *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editingPeriod.periodNumber ?? 1}
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10);
                      setEditingPeriod({
                        ...editingPeriod,
                        periodNumber: isNaN(num) ? 1 : num,
                        name: `Period ${isNaN(num) ? 1 : num}`,
                      });
                    }}
                    className="w-full text-sm p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Period Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Period 1"
                    value={editingPeriod.name || ''}
                    onChange={(e) =>
                      setEditingPeriod({
                        ...editingPeriod,
                        name: e.target.value,
                      })
                    }
                    className="w-full text-sm p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Break Description / Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning Interval, Lunch & Prayer Break"
                  value={editingPeriod.breakLabel || editingPeriod.name || ''}
                  onChange={(e) =>
                    setEditingPeriod({
                      ...editingPeriod,
                      breakLabel: e.target.value,
                      name: e.target.value,
                    })
                  }
                  className="w-full text-sm p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Time (24h) *</label>
                <input
                  type="time"
                  value={editingPeriod.startTime || ''}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, startTime: e.target.value })}
                  required
                  className="w-full text-sm font-mono p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Time (24h) *</label>
                <input
                  type="time"
                  value={editingPeriod.endTime || ''}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, endTime: e.target.value })}
                  required
                  className="w-full text-sm font-mono p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Duration Preset Chips */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Quick Duration Auto-Calculate (Sets End Time from Start Time):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '+45m Class', mins: 45 },
                  { label: '+50m Class', mins: 50 },
                  { label: '+60m Class', mins: 60 },
                  { label: '+15m Interval', mins: 15 },
                  { label: '+1h 30m Lunch', mins: 90 },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      const start = editingPeriod.startTime || '07:45';
                      const newEnd = addMinutesToTime(start, chip.mins);
                      setEditingPeriod({
                        ...editingPeriod,
                        startTime: start,
                        endTime: newEnd,
                      });
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-semibold transition cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {editingPeriod.id ? (
                <button
                  type="button"
                  onClick={() => {
                    if (editingPeriod.id) {
                      handleDeletePeriod(editingPeriod.id);
                      setEditingPeriod(null);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                >
                  Delete Period
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPeriod(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Period Timing</span>
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  subtext: string;
  icon: React.ReactNode;
  accent: 'blue' | 'purple' | 'emerald' | 'indigo' | 'amber' | 'rose';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtext, icon, accent, onClick }) => {
  const borderAccent =
    accent === 'indigo' || accent === 'blue'
      ? 'border-l-4 border-l-indigo-500'
      : accent === 'amber'
      ? 'border-l-4 border-l-amber-500'
      : accent === 'emerald'
      ? 'border-l-4 border-l-emerald-500'
      : accent === 'purple'
      ? 'border-l-4 border-l-purple-500'
      : 'border-l-4 border-l-slate-400';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer flex flex-col justify-between ${borderAccent}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{value}</div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{subtext}</div>
      </div>
    </div>
  );
};
