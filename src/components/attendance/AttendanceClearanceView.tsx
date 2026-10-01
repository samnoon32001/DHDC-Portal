import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Award,
  HeartPulse,
  Calendar,
  Search,
  User,
  Users,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  Check,
  X,
  ChevronRight,
  Info,
  FileText,
  RefreshCw,
  Plus,
  Flame,
  ArrowRight,
} from 'lucide-react';
import type {
  Student,
  ClassRoom,
  Subject,
  AttendanceRecord,
  AttendanceClearance,
  AttendanceRulesConfig,
  StudentLeaveClearanceApplication,
  AttendanceStatus,
} from '../../types';
import { dataService } from '../../services/db';
import { calculateStudentSubjectAttendance } from '../../utils/attendanceCalculator';

interface AttendanceClearanceViewProps {
  currentUser: any;
  currentTeacherObj?: any;
  students: Student[];
  classes: ClassRoom[];
  subjects: Subject[];
  attendanceRecords: AttendanceRecord[];
  clearances: AttendanceClearance[];
  rules: AttendanceRulesConfig;
  studentApplications: StudentLeaveClearanceApplication[];
  onRefresh?: () => void;
}

export const AttendanceClearanceView: React.FC<AttendanceClearanceViewProps> = ({
  currentUser,
  students,
  classes,
  subjects,
  attendanceRecords,
  clearances,
  rules,
  studentApplications,
  onRefresh,
}) => {
  // Main view mode
  const [activeSubMode, setActiveSubMode] = useState<
    'student-wise' | 'date-wise' | 'applications' | 'registry'
  >('student-wise');

  // =========================================================================
  // 1. TOP 5 MORE LEAVE TAKEN STUDENTS CALCULATION
  // =========================================================================
  const topLeaveStudents = useMemo(() => {
    // For all active students, count casual_leave + absent records
    const studentLeaveCounts = students
      .filter((s) => s.status === 'active')
      .map((student) => {
        const studentRecords = attendanceRecords.filter(
          (r) => r.studentId === student.id
        );
        const casualLeaves = studentRecords.filter(
          (r) => r.status === 'casual_leave'
        ).length;
        const absentCount = studentRecords.filter((r) => r.status === 'absent').length;
        const medicalLeaves = studentRecords.filter(
          (r) => r.status === 'medical_leave'
        ).length;
        const academicLeaves = studentRecords.filter(
          (r) => r.status === 'academic_leave'
        ).length;
        const officialLeaves = studentRecords.filter(
          (r) => r.status === 'official_leave'
        ).length;
        const totalLeaves = casualLeaves + absentCount;

        // Overall stats for percentage calculation
        const overall = calculateStudentSubjectAttendance(
          student.id,
          'ALL',
          attendanceRecords,
          clearances,
          rules
        );

        const studentClass = classes.find((c) => c.id === student.classId);

        return {
          student,
          studentClass,
          totalLeaves,
          casualLeaves,
          absentCount,
          medicalLeaves,
          academicLeaves,
          officialLeaves,
          overallPercent: overall.overallPercentWithoutMedical,
          isShortage: overall.isShortage,
          totalPeriods: overall.totalPeriods,
        };
      })
      .filter((item) => item.totalLeaves > 0 || item.totalPeriods > 0)
      .sort((a, b) => b.totalLeaves - a.totalLeaves);

    return studentLeaveCounts.slice(0, 5);
  }, [students, attendanceRecords, clearances, rules, classes]);

  // =========================================================================
  // 2. STUDENT-WISE SEARCH & SELECTION STATE
  // =========================================================================
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return topLeaveStudents[0]?.student.id || students[0]?.id || '';
  });
  const [studentSearchText, setStudentSearchText] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  // Multi-select for student-wise leave records
  const [selectedLeaveRecordIds, setSelectedLeaveRecordIds] = useState<string[]>([]);

  // Selected student object
  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const activeStudentClass = useMemo(() => {
    if (!activeStudent) return null;
    return classes.find((c) => c.id === activeStudent.classId);
  }, [classes, activeStudent]);

  // All subjects for this student's class
  const activeStudentSubjects = useMemo(() => {
    if (!activeStudent) return [];
    return subjects.filter(
      (s) => s.classId === activeStudent.classId && s.status === 'active'
    );
  }, [subjects, activeStudent]);

  // Total summary for selected student
  const activeStudentOverallStats = useMemo(() => {
    if (!activeStudent) return null;
    return calculateStudentSubjectAttendance(
      activeStudent.id,
      'ALL',
      attendanceRecords,
      clearances,
      rules
    );
  }, [activeStudent, attendanceRecords, clearances, rules]);

  // Taken leave records for selected student
  const activeStudentLeaveRecords = useMemo(() => {
    if (!activeStudent) return [];
    return attendanceRecords
      .filter(
        (r) =>
          r.studentId === activeStudent.id &&
          (r.status === 'casual_leave' ||
            r.status === 'absent' ||
            r.status === 'academic_leave' ||
            r.status === 'official_leave' ||
            r.status === 'medical_leave')
      )
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [attendanceRecords, activeStudent]);

  // Filtered list of students for search dropdown
  const filteredStudentsForSearch = useMemo(() => {
    return students
      .filter((s) => {
        if (s.status !== 'active') return false;
        if (selectedClassFilter !== 'ALL' && s.classId !== selectedClassFilter)
          return false;
        if (!studentSearchText.trim()) return true;
        const q = studentSearchText.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.admissionNumber.toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [students, selectedClassFilter, studentSearchText]);

  // =========================================================================
  // 3. DATE-WISE CLEARING STATE & DATA
  // =========================================================================
  const [dateWiseDate, setDateWiseDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dateWiseClassId, setDateWiseClassId] = useState<string>(() => {
    return classes[0]?.id || '';
  });
  const [dateWiseSubjectId, setDateWiseSubjectId] = useState<string>('ALL');

  // Multi-select for date-wise records
  const [selectedDateWiseRecordIds, setSelectedDateWiseRecordIds] = useState<
    string[]
  >([]);

  // Subjects belonging to dateWiseClassId
  const dateWiseClassSubjects = useMemo(() => {
    return subjects.filter((s) => s.classId === dateWiseClassId && s.status === 'active');
  }, [subjects, dateWiseClassId]);

  // Records for Date-wise search (filtered by date, class, and optionally subject)
  const dateWiseLeaveRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      if (r.date !== dateWiseDate) return false;
      if (r.classId !== dateWiseClassId) return false;
      if (dateWiseSubjectId !== 'ALL' && r.subjectId !== dateWiseSubjectId)
        return false;
      // Show leaves and absences
      return (
        r.status === 'casual_leave' ||
        r.status === 'absent' ||
        r.status === 'academic_leave' ||
        r.status === 'official_leave' ||
        r.status === 'medical_leave'
      );
    });
  }, [attendanceRecords, dateWiseDate, dateWiseClassId, dateWiseSubjectId]);

  // =========================================================================
  // 4. CLEARANCE MODAL STATE (Single or Batch)
  // =========================================================================
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [actionTargetRecordIds, setActionTargetRecordIds] = useState<string[]>([]);
  const [actionTargetStatus, setActionTargetStatus] = useState<
    'academic_leave' | 'official_leave' | 'medical_leave'
  >('academic_leave');
  const [actionReason, setActionReason] = useState<string>('');
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Application rejection modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Count of pending student applications
  const pendingAppsCount = useMemo(() => {
    return (studentApplications || []).filter((a) => a.status === 'pending').length;
  }, [studentApplications]);

  // =========================================================================
  // HANDLERS FOR CLEARANCE ACTIONS
  // =========================================================================

  // Quick single clear trigger
  const handleTriggerSingleClear = (
    recordId: string,
    targetStatus: 'academic_leave' | 'official_leave' | 'medical_leave'
  ) => {
    setActionTargetRecordIds([recordId]);
    setActionTargetStatus(targetStatus);
    setActionReason(
      targetStatus === 'academic_leave'
        ? 'Institutional academic representation / competition / seminar'
        : targetStatus === 'official_leave'
        ? 'Authorized institutional event / sports council duty'
        : 'Doctor prescription and medical certificate verified'
    );
    setIsActionModalOpen(true);
  };

  // Quick batch clear trigger
  const handleTriggerBatchClear = (
    recordIds: string[],
    targetStatus: 'academic_leave' | 'official_leave' | 'medical_leave'
  ) => {
    if (recordIds.length === 0) return;
    setActionTargetRecordIds(recordIds);
    setActionTargetStatus(targetStatus);
    setActionReason(
      targetStatus === 'academic_leave'
        ? 'Batch cleared: Institutional academic competition / conference'
        : targetStatus === 'official_leave'
        ? 'Batch cleared: Official sports / student union event'
        : 'Batch cleared: Medical certification reviewed and approved'
    );
    setIsActionModalOpen(true);
  };

  // Confirm and apply clearance
  const handleConfirmClearance = () => {
    if (actionTargetRecordIds.length === 0) return;

    dataService.batchClearAttendanceRecords(
      {
        recordIds: actionTargetRecordIds,
        newStatus: actionTargetStatus,
        reason: actionReason,
      },
      {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Authority',
        role: currentUser?.role || 'Authority',
      }
    );

    const statusLabel =
      actionTargetStatus === 'academic_leave'
        ? 'Academic Leave'
        : actionTargetStatus === 'official_leave'
        ? 'Official Leave'
        : 'Medical Leave';

    setActionSuccessNotice(
      `Successfully cleared ${actionTargetRecordIds.length} session(s) as ${statusLabel}!`
    );
    setTimeout(() => setActionSuccessNotice(null), 4000);

    // Reset selection and close modal
    setIsActionModalOpen(false);
    setSelectedLeaveRecordIds([]);
    setSelectedDateWiseRecordIds([]);
    if (onRefresh) onRefresh();
  };

  // Approve student application
  const handleApproveStudentApp = (app: StudentLeaveClearanceApplication) => {
    dataService.reviewStudentLeaveClearance(
      app.id,
      'approved',
      'Approved and verified by Attendance Clearance Authority',
      {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Authority',
        role: currentUser?.role || 'Authority',
      }
    );
    setActionSuccessNotice(
      `Clearance application for ${app.studentName} approved! Sessions converted to ${app.clearanceType.replace('_', ' ')}.`
    );
    setTimeout(() => setActionSuccessNotice(null), 4000);
    if (onRefresh) onRefresh();
  };

  // Reject student application
  const handleConfirmRejectStudentApp = () => {
    if (!rejectingAppId) return;
    dataService.reviewStudentLeaveClearance(
      rejectingAppId,
      'rejected',
      rejectReason || 'Clearance conditions not met or documentation insufficient',
      {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Authority',
        role: currentUser?.role || 'Authority',
      }
    );
    setRejectingAppId(null);
    setRejectReason('');
    setActionSuccessNotice(`Application has been rejected.`);
    setTimeout(() => setActionSuccessNotice(null), 4000);
    if (onRefresh) onRefresh();
  };

  return (
    <div id="attendance-clearance-workspace" className="space-y-6">
      {/* Toast / Notification */}
      {actionSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessNotice(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          FEATURE 1: TOP 5 STUDENTS WITH MORE LEAVES TAKEN
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/50 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>Top 5 High-Leave Students</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300">
                  Needs Clearance Review
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Students with the highest accumulated casual leaves and absences. Click any student to inspect and clear leaves.
              </p>
            </div>
          </div>
        </div>

        {topLeaveStudents.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No students with casual leaves or absences found in current attendance records.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topLeaveStudents.map((item, index) => {
              const isSelected = selectedStudentId === item.student.id;
              return (
                <div
                  key={item.student.id}
                  onClick={() => {
                    setSelectedStudentId(item.student.id);
                    setActiveSubMode('student-wise');
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-xs ring-2 ring-emerald-400/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      #{index + 1}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.isShortage
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {item.overallPercent}%
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {item.student.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Adm #{item.student.admissionNumber}</span>
                      <span>{item.studentClass?.name || 'Class'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {item.totalLeaves} Leaves taken
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5 hover:underline">
                      Inspect <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          FEATURE 2: MODE TABS (Student-Wise, Date-Wise, Student Applications, Registry)
          ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubMode('student-wise')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubMode === 'student-wise'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Student-Wise Search & Clearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMode('date-wise')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubMode === 'date-wise'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Date-Wise Class & Subject Clearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMode('applications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubMode === 'applications'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Student Applications</span>
          {pendingAppsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
              {pendingAppsCount} Pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMode('registry')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubMode === 'registry'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Issued Condonations Registry ({clearances.length})</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-MODE 1: STUDENT-WISE SEARCH & CLEARANCE VIEW
          ========================================================================= */}
      {activeSubMode === 'student-wise' && (
        <div className="space-y-6">
          {/* Student Search & Selector Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Class Filter */}
              <div className="w-44">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Filter Class
                </label>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Search Input & Dropdown */}
              <div className="flex-1 min-w-[240px]">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Search & Select Student
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student by name or admission number..."
                    value={studentSearchText}
                    onChange={(e) => setStudentSearchText(e.target.value)}
                    className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Direct Student Selector */}
              <div className="w-60">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setSelectedLeaveRecordIds([]);
                  }}
                  className="w-full text-xs font-semibold py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                >
                  {filteredStudentsForSearch.map((s) => {
                    const c = classes.find((cls) => cls.id === s.classId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.admissionNumber}) - {c?.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {activeStudent && activeStudentOverallStats && (
            <>
              {/* Student Header & Total Summary Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                      {activeStudent.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {activeStudent.name}
                        </h3>
                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-lg">
                          Adm #{activeStudent.admissionNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Class: <strong>{activeStudentClass?.name}</strong> • Academic Attendance Dossier
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        Overall Attendance (Without Medical)
                      </div>
                      <div
                        className={`text-2xl font-black ${
                          activeStudentOverallStats.isShortage
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {activeStudentOverallStats.overallPercentWithoutMedical}%
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Min. Required: {rules.minRequiredAttendancePercent}%
                      </div>
                    </div>
                    <div>
                      {activeStudentOverallStats.isCleared ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          <ShieldCheck className="w-4 h-4" /> Condonation Cleared
                        </span>
                      ) : activeStudentOverallStats.isShortage ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-4 h-4" /> Attendance Shortage
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4" /> Eligible
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* KPI Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 font-semibold block">Total Sessions</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white">
                      {activeStudentOverallStats.totalPeriods}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block">Present</span>
                    <span className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                      {activeStudentOverallStats.presentCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <span className="text-[11px] text-purple-700 dark:text-purple-400 font-semibold block">Academic Leave</span>
                    <span className="text-lg font-bold text-purple-800 dark:text-purple-300">
                      {activeStudentOverallStats.academicLeaveCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block">Casual Leave</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      {activeStudentOverallStats.casualLeaveCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold block">Official Leave</span>
                    <span className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {activeStudentOverallStats.officialLeaveCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold block">Medical Leave</span>
                    <span className="text-lg font-bold text-amber-800 dark:text-amber-300">
                      {activeStudentOverallStats.medicalLeaveCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* All Subjects Attendance Details Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>All Subjects Attendance Breakdown</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    {activeStudentSubjects.length} Enrolled Subjects
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-3">Sessions</th>
                        <th className="py-3 px-3">Present</th>
                        <th className="py-3 px-3">Casual</th>
                        <th className="py-3 px-3">Academic</th>
                        <th className="py-3 px-3">Official</th>
                        <th className="py-3 px-3">Medical</th>
                        <th className="py-3 px-3">Attendance %</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeStudentSubjects.map((sub) => {
                        const stats = calculateStudentSubjectAttendance(
                          activeStudent.id,
                          sub.id,
                          attendanceRecords,
                          clearances,
                          rules
                        );

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800 dark:text-white">{sub.name}</div>
                              <div className="text-[11px] font-mono text-slate-500">{sub.code}</div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              {stats.totalPeriods}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400">
                              {stats.presentCount}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                              {stats.casualLeaveCount}
                            </td>
                            <td className="py-3 px-3 font-medium text-purple-700 dark:text-purple-400">
                              {stats.academicLeaveCount}
                            </td>
                            <td className="py-3 px-3 font-medium text-blue-700 dark:text-blue-400">
                              {stats.officialLeaveCount}
                            </td>
                            <td className="py-3 px-3 font-medium text-amber-700 dark:text-amber-400">
                              {stats.medicalLeaveCount}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`font-bold text-sm ${
                                  stats.isShortage ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {stats.overallPercentWithoutMedical}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {stats.isCleared ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                                  Cleared
                                </span>
                              ) : stats.isShortage ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  Shortage
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Eligible
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student Taken Leaves & Dates Clearing Options */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-rose-600" />
                      <span>Taken Leaves & Clearing Options by Date</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Convert individual or multi-selected leave dates into Academic, Official, or Medical Leave
                    </p>
                  </div>

                  {/* Multi-select batch action bar */}
                  {selectedLeaveRecordIds.length > 0 && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 px-2">
                        {selectedLeaveRecordIds.length} Selected:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleTriggerBatchClear(selectedLeaveRecordIds, 'academic_leave')
                        }
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-xs cursor-pointer"
                      >
                        + Academic
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleTriggerBatchClear(selectedLeaveRecordIds, 'official_leave')
                        }
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                      >
                        + Official
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleTriggerBatchClear(selectedLeaveRecordIds, 'medical_leave')
                        }
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                      >
                        + Medical
                      </button>
                    </div>
                  )}
                </div>

                {activeStudentLeaveRecords.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No leaves or absences recorded for {activeStudent.name}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold">
                          <th className="py-3 px-4 w-10">
                            <input
                              type="checkbox"
                              checked={
                                selectedLeaveRecordIds.length ===
                                  activeStudentLeaveRecords.length &&
                                activeStudentLeaveRecords.length > 0
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeaveRecordIds(
                                    activeStudentLeaveRecords.map((r) => r.id)
                                  );
                                } else {
                                  setSelectedLeaveRecordIds([]);
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                          </th>
                          <th className="py-3 px-3">Date & Period</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Current Status</th>
                          <th className="py-3 px-4">Remarks</th>
                          <th className="py-3 px-4 text-right">Clear As (Quick Action)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeStudentLeaveRecords.map((rec) => {
                          const sub = subjects.find((s) => s.id === rec.subjectId);
                          const isChecked = selectedLeaveRecordIds.includes(rec.id);

                          return (
                            <tr
                              key={rec.id}
                              className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                                isChecked ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedLeaveRecordIds((prev) => [
                                        ...prev,
                                        rec.id,
                                      ]);
                                    } else {
                                      setSelectedLeaveRecordIds((prev) =>
                                        prev.filter((id) => id !== rec.id)
                                      );
                                    }
                                  }}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {rec.date} • Period {rec.period}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-800 dark:text-white">
                                  {sub?.name || 'Subject'}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  {sub?.code}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {rec.status === 'academic_leave' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                                    <Sparkles className="w-3 h-3" /> Academic Leave (Present)
                                  </span>
                                )}
                                {rec.status === 'official_leave' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                                    <Award className="w-3 h-3" /> Official Leave
                                  </span>
                                )}
                                {rec.status === 'medical_leave' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                    <HeartPulse className="w-3 h-3" /> Medical Leave
                                  </span>
                                )}
                                {rec.status === 'casual_leave' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    Casual Leave
                                  </span>
                                )}
                                {rec.status === 'absent' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                    Absent
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-500 italic text-[11px] max-w-xs truncate">
                                {rec.remarks || '—'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleTriggerSingleClear(rec.id, 'academic_leave')
                                    }
                                    title="Clear as Academic Leave (100% Present)"
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                                  >
                                    + Academic
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleTriggerSingleClear(rec.id, 'official_leave')
                                    }
                                    title="Clear as Official Leave"
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                                  >
                                    + Official
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleTriggerSingleClear(rec.id, 'medical_leave')
                                    }
                                    title="Clear as Medical Leave (Excluded from denominator)"
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                                  >
                                    + Medical
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-MODE 2: DATE-WISE CLEARING WITH SELECTED CLASS & SUBJECT
          ========================================================================= */}
      {activeSubMode === 'date-wise' && (
        <div className="space-y-6">
          {/* Date, Class, Subject Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Date-Wise Attendance Clearing</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pick a specific date, class, and subject to clear all student leaves for that session in batch or individually.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={dateWiseDate}
                  onChange={(e) => {
                    setDateWiseDate(e.target.value);
                    setSelectedDateWiseRecordIds([]);
                  }}
                  className="w-full text-xs font-medium py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Class selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Class
                </label>
                <select
                  value={dateWiseClassId}
                  onChange={(e) => {
                    setDateWiseClassId(e.target.value);
                    setDateWiseSubjectId('ALL');
                    setSelectedDateWiseRecordIds([]);
                  }}
                  className="w-full text-xs font-semibold py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Subject
                </label>
                <select
                  value={dateWiseSubjectId}
                  onChange={(e) => {
                    setDateWiseSubjectId(e.target.value);
                    setSelectedDateWiseRecordIds([]);
                  }}
                  className="w-full text-xs font-semibold py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">All Subjects in this Class</option>
                  {dateWiseClassSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Table for Date-Wise */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Student Leave Records on {dateWiseDate}
                </h4>
                <span className="text-xs text-slate-500">
                  {dateWiseLeaveRecords.length} Leave / Absent records found
                </span>
              </div>

              {/* Batch Action Bar */}
              {selectedDateWiseRecordIds.length > 0 && (
                <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 px-2">
                    {selectedDateWiseRecordIds.length} Selected:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleTriggerBatchClear(selectedDateWiseRecordIds, 'academic_leave')
                    }
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-xs cursor-pointer"
                  >
                    + Academic
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleTriggerBatchClear(selectedDateWiseRecordIds, 'official_leave')
                    }
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                  >
                    + Official
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleTriggerBatchClear(selectedDateWiseRecordIds, 'medical_leave')
                    }
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                  >
                    + Medical
                  </button>
                </div>
              )}
            </div>

            {dateWiseLeaveRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No casual leaves or absences recorded for {classes.find((c) => c.id === dateWiseClassId)?.name} on {dateWiseDate}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedDateWiseRecordIds.length ===
                              dateWiseLeaveRecords.length &&
                            dateWiseLeaveRecords.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDateWiseRecordIds(
                                dateWiseLeaveRecords.map((r) => r.id)
                              );
                            } else {
                              setSelectedDateWiseRecordIds([]);
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      </th>
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Period & Subject</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4">Recorded Remarks</th>
                      <th className="py-3 px-4 text-right">Convert / Clear Leave</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dateWiseLeaveRecords.map((rec) => {
                      const std = students.find((s) => s.id === rec.studentId);
                      const sub = subjects.find((s) => s.id === rec.subjectId);
                      const isChecked = selectedDateWiseRecordIds.includes(rec.id);

                      return (
                        <tr
                          key={rec.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                            isChecked ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDateWiseRecordIds((prev) => [
                                    ...prev,
                                    rec.id,
                                  ]);
                                } else {
                                  setSelectedDateWiseRecordIds((prev) =>
                                    prev.filter((id) => id !== rec.id)
                                  );
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 dark:text-white">
                              {std?.name || 'Student'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Adm #{std?.admissionNumber}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              Period {rec.period} • {sub?.name}
                            </div>
                            <div className="text-[11px] text-slate-500">{sub?.code}</div>
                          </td>
                          <td className="py-3 px-4">
                            {rec.status === 'academic_leave' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                                Academic Leave
                              </span>
                            )}
                            {rec.status === 'official_leave' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                                Official Leave
                              </span>
                            )}
                            {rec.status === 'medical_leave' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                Medical Leave
                              </span>
                            )}
                            {rec.status === 'casual_leave' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                Casual Leave
                              </span>
                            )}
                            {rec.status === 'absent' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                Absent
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 italic text-[11px] max-w-xs truncate">
                            {rec.remarks || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleTriggerSingleClear(rec.id, 'academic_leave')
                                }
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                              >
                                + Academic
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleTriggerSingleClear(rec.id, 'official_leave')
                                }
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                              >
                                + Official
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleTriggerSingleClear(rec.id, 'medical_leave')
                                }
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                              >
                                + Medical
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-MODE 3: STUDENT LEAVE CLEARANCE APPLICATIONS (APPROVAL QUEUE)
          ========================================================================= */}
      {activeSubMode === 'applications' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Student Clearance Applications Queue</span>
              </h3>
              <p className="text-xs text-slate-500">
                Review, approve, or reject attendance clearance requests submitted by students.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
              {pendingAppsCount} Applications Pending
            </span>
          </div>

          {(studentApplications || []).length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No clearance applications submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {(studentApplications || []).map((app) => {
                const isPending = app.status === 'pending';
                const isApproved = app.status === 'approved';

                return (
                  <div
                    key={app.id}
                    className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all ${
                      isPending
                        ? 'border-amber-300 dark:border-amber-700/60 shadow-xs'
                        : isApproved
                        ? 'border-emerald-200 dark:border-emerald-800'
                        : 'border-slate-200 dark:border-slate-800 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base text-slate-900 dark:text-white">
                            {app.studentName}
                          </span>
                          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                            Adm #{app.studentAdmissionNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            • {app.className} • {app.subjectName}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              app.clearanceType === 'academic_leave'
                                ? 'bg-purple-100 text-purple-800'
                                : app.clearanceType === 'official_leave'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Requested:{' '}
                            {app.clearanceType === 'academic_leave'
                              ? 'Academic Leave'
                              : app.clearanceType === 'official_leave'
                              ? 'Official Leave'
                              : 'Medical Leave'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <strong>Requested Sessions:</strong> {app.dates.join(', ')} (
                          {app.recordIds.length} session(s))
                        </div>

                        <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Student Reason:
                          </span>{' '}
                          {app.reason}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Submitted on {new Date(app.appliedAt).toLocaleString()}
                          {app.reviewedBy && (
                            <span>
                              {' '}
                              • Reviewed by {app.reviewedByName} on{' '}
                              {app.reviewedAt ? new Date(app.reviewedAt).toLocaleString() : ''}
                            </span>
                          )}
                          {app.reviewRemarks && (
                            <span className="block italic text-slate-500 mt-0.5">
                              Remarks: {app.reviewRemarks}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Approval Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveStudentApp(app)}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve & Clear</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingAppId(app.id);
                                setRejectReason('');
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Approved & Cleared</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <X className="w-4 h-4 text-rose-600" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-MODE 4: ISSUED CONDONATIONS REGISTRY
          ========================================================================= */}
      {activeSubMode === 'registry' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Active Condonations Registry
            </h3>
            <span className="text-xs text-slate-500 font-normal">
              {clearances.length} Active Records
            </span>
          </div>

          {clearances.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No attendance condonation clearances issued yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {clearances.map((c) => {
                const student = students.find((s) => s.id === c.studentId);
                const sub = subjects.find((s) => s.id === c.subjectId);

                return (
                  <div
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white text-sm">
                          {student?.name || 'Student'}
                        </span>
                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                          Adm #{student?.admissionNumber}
                        </span>
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                          {c.subjectId ? sub?.name || 'Subject' : 'All Subjects'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong>Reason:</strong> {c.reason}
                      </p>
                      {c.notes && (
                        <p className="text-[11px] text-slate-500 italic">{c.notes}</p>
                      )}
                      <div className="text-[11px] text-slate-400">
                        Authorized by <strong>{c.clearedByName || c.grantedByName}</strong> (
                        {c.clearedByRole || c.grantedByRole}) on{' '}
                        {new Date(c.clearedDate).toLocaleDateString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Revoke clearance record?`)) {
                          dataService.revokeAttendanceClearance(c.id, {
                            id: currentUser?.id || 'admin',
                            name: currentUser?.name || 'Authority',
                            role: currentUser?.role || 'Authority',
                          });
                          if (onRefresh) onRefresh();
                        }
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors self-start sm:self-center"
                    >
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: CLEARANCE CONFIRMATION (SINGLE OR BATCH)
          ========================================================================= */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Confirm Attendance Clearance</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You are converting <strong>{actionTargetRecordIds.length}</strong> attendance
                session(s) to:
              </p>

              {/* Conversion Target Type Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActionTargetStatus('academic_leave')}
                  className={`p-3 rounded-xl border text-left text-xs space-y-1 transition-all cursor-pointer ${
                    actionTargetStatus === 'academic_leave'
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 ring-2 ring-purple-400/30 font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-purple-700">
                    <Sparkles className="w-4 h-4" />
                    <span>Academic</span>
                  </div>
                  <div className="text-[10px] font-normal text-purple-800 dark:text-purple-300">
                    100% Present
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActionTargetStatus('official_leave')}
                  className={`p-3 rounded-xl border text-left text-xs space-y-1 transition-all cursor-pointer ${
                    actionTargetStatus === 'official_leave'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-400/30 font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <Award className="w-4 h-4" />
                    <span>Official</span>
                  </div>
                  <div className="text-[10px] font-normal text-blue-800 dark:text-blue-300">
                    Within 10% limit
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActionTargetStatus('medical_leave')}
                  className={`p-3 rounded-xl border text-left text-xs space-y-1 transition-all cursor-pointer ${
                    actionTargetStatus === 'medical_leave'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/30 font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <HeartPulse className="w-4 h-4" />
                    <span>Medical</span>
                  </div>
                  <div className="text-[10px] font-normal text-amber-800 dark:text-amber-300">
                    Excluded denominator
                  </div>
                </button>
              </div>

              {/* Justification Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Authorization Reason / Event Note
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter specific justification (e.g., Medical certificate verified, Inter-college competition participant...)"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearance}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
              >
                Apply Clearance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REJECT STUDENT APPLICATION
          ========================================================================= */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <X className="w-5 h-5 text-rose-600" />
                <span>Reject Clearance Application</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingAppId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Rejection (Visible to student)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify reason (e.g. documentation missing, unauthorized absence...)"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-rose-600 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingAppId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectStudentApp}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
