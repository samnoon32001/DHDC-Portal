import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  HeartPulse,
  Award,
  Layers,
  BarChart2,
  BookOpen,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  AttendanceClearance,
  AttendanceRulesConfig,
  Subject,
  ClassRoom,
  LeaveApplication,
} from '../../types';
import { calculateStudentSubjectAttendance } from '../../utils/attendanceCalculator';

interface StudentAttendanceStatsModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  academicYear: string;
  attendanceRecords: AttendanceRecord[];
  leaveApplications: LeaveApplication[];
  subjects: Subject[];
  classes: ClassRoom[];
  clearances: AttendanceClearance[];
  rules: AttendanceRulesConfig;
  currentSubjectId?: string;
}

export const StudentAttendanceStatsModal: React.FC<StudentAttendanceStatsModalProps> = ({
  student,
  isOpen,
  onClose,
  academicYear,
  attendanceRecords,
  leaveApplications,
  subjects,
  classes,
  clearances,
  rules,
  currentSubjectId,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'leaves'>('stats');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('ALL');

  if (!isOpen || !student) return null;

  const currentClass = classes.find((c) => c.id === student.classId);

  // All attendance records for this student in the academic year
  const studentYearRecords = useMemo(() => {
    return attendanceRecords.filter(
      (r) =>
        r.studentId === student.id &&
        (!academicYear || !r.academicYear || r.academicYear === academicYear)
    );
  }, [attendanceRecords, student.id, academicYear]);

  // Overall attendance statistics across all subjects
  const overallStats = useMemo(() => {
    return calculateStudentSubjectAttendance(
      student.id,
      'ALL',
      studentYearRecords,
      clearances,
      rules
    );
  }, [student.id, studentYearRecords, clearances, rules]);

  // Current selected subject attendance statistics (if viewing from a specific subject)
  const currentSubStats = useMemo(() => {
    if (!currentSubjectId || currentSubjectId === 'ALL') return null;
    return calculateStudentSubjectAttendance(
      student.id,
      currentSubjectId,
      studentYearRecords,
      clearances,
      rules
    );
  }, [student.id, currentSubjectId, studentYearRecords, clearances, rules]);

  // Subject-wise attendance calculation
  const subjectBreakdown = useMemo(() => {
    const classSubjects = subjects.filter(
      (s) =>
        s.classId === student.classId &&
        s.status !== 'inactive' &&
        (!s.isSplitSubject || s.enrolledStudentIds?.includes(student.id))
    );

    return classSubjects.map((sub) => {
      const stats = calculateStudentSubjectAttendance(
        student.id,
        sub.id,
        studentYearRecords,
        clearances,
        rules
      );
      return {
        subject: sub,
        stats,
      };
    });
  }, [subjects, student.classId, student.id, studentYearRecords, clearances, rules]);

  // All individual leave entries / sessions where student was not present
  const leaveHistoryRecords = useMemo(() => {
    return studentYearRecords
      .filter((r) => r.status !== 'present')
      .sort((a, b) => b.date.localeCompare(a.date) || b.period - a.period);
  }, [studentYearRecords]);

  // Formal leave applications submitted by this student
  const formalLeaveApplications = useMemo(() => {
    return (leaveApplications || []).filter(
      (app) => app.studentId === student.id || app.studentAdmissionNumber === student.admissionNumber
    );
  }, [leaveApplications, student.id, student.admissionNumber]);

  // Filtered leave entries
  const filteredLeaveRecords = useMemo(() => {
    return leaveHistoryRecords.filter((rec) => {
      const sub = subjects.find((s) => s.id === rec.subjectId);
      const matchesSearch =
        !leaveSearch.trim() ||
        rec.date.includes(leaveSearch) ||
        rec.remarks?.toLowerCase().includes(leaveSearch.toLowerCase()) ||
        sub?.name.toLowerCase().includes(leaveSearch.toLowerCase()) ||
        `Period ${rec.period}`.toLowerCase().includes(leaveSearch.toLowerCase());

      const matchesType =
        leaveTypeFilter === 'ALL' || rec.status === leaveTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [leaveHistoryRecords, leaveSearch, leaveTypeFilter, subjects]);

  // Calculate distinct calendar dates on which this student took leave
  const distinctLeaveDates = useMemo(() => {
    const set = new Set<string>();
    leaveHistoryRecords.forEach((r) => set.add(r.date));
    return Array.from(set).sort().reverse();
  }, [leaveHistoryRecords]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-lg text-white shadow-inner shrink-0">
              {student.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {student.name}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Adm #{student.admissionNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                {currentClass?.name || 'Class'} • Academic Year: {academicYear || '2026-2027'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stats'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Attendance Statistics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'leaves'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Leave Days & History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              {distinctLeaveDates.length} days ({leaveHistoryRecords.length} sessions)
            </span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* Primary Rate Hero Card */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  overallStats.isShortage && !overallStats.isCleared
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Overall Effective Attendance Rate
                    </span>
                    {overallStats.isCleared ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                        Condoned / Cleared
                      </span>
                    ) : overallStats.isShortage ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                        Shortage (&lt;85%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                        Eligible (≥85%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                      {overallStats.effectivePresentPercent}%
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({overallStats.effectivePresentCount} of {overallStats.totalPeriods} periods attended)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2.5 max-w-md">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        overallStats.isShortage && !overallStats.isCleared
                          ? 'bg-rose-600'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, overallStats.effectivePresentPercent)}%` }}
                    />
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Classes Held</div>
                  <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">
                    {overallStats.totalPeriods}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Missed / Leaves: <strong className="text-rose-600 dark:text-rose-400">{leaveHistoryRecords.length}</strong>
                  </div>
                </div>
              </div>

              {/* 4 Attendance Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60">
                  <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                    Present
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-950 dark:text-emerald-100 mt-0.5">
                    {overallStats.presentCount}
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    {overallStats.presentPercent}% sessions
                  </div>
                </div>

                <div className="p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-200/80 dark:border-purple-800/60">
                  <div className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300">
                    Academic Leave
                  </div>
                  <div className="text-xl font-bold font-mono text-purple-950 dark:text-purple-100 mt-0.5">
                    {overallStats.academicLeaveCount}
                  </div>
                  <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">
                    Treated as Present
                  </div>
                </div>

                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/60">
                  <div className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">
                    Casual Leave
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-950 dark:text-amber-100 mt-0.5">
                    {overallStats.casualLeaveCount}
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    Unexcused absence
                  </div>
                </div>

                <div className="p-3 bg-rose-50/60 dark:bg-rose-950/40 rounded-xl border border-rose-200/80 dark:border-rose-800/60">
                  <div className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300">
                    Medical Leave
                  </div>
                  <div className="text-xl font-bold font-mono text-rose-950 dark:text-rose-100 mt-0.5">
                    {overallStats.medicalLeaveCount}
                  </div>
                  <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                    Exempted by doctor note
                  </div>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Subject-Wise Attendance Breakdown</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-2.5 text-center">Classes</th>
                        <th className="py-2.5 px-2.5 text-center">Present</th>
                        <th className="py-2.5 px-2.5 text-center">Casual Leave</th>
                        <th className="py-2.5 px-2.5 text-center">Rate %</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {subjectBreakdown.map(({ subject, stats }) => (
                        <tr
                          key={subject.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition ${
                            subject.id === currentSubjectId
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/30 font-semibold'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                            {subject.name}{' '}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({subject.code})
                            </span>
                            {subject.id === currentSubjectId && (
                              <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-slate-700 dark:text-slate-300">
                            {stats.totalPeriods}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-emerald-700 dark:text-emerald-400 font-bold">
                            {stats.presentCount}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-rose-600 dark:text-rose-400">
                            {stats.casualLeaveCount}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-bold">
                            <span
                              className={
                                stats.effectivePresentPercent >= 85
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {stats.effectivePresentPercent}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            {stats.effectivePresentPercent >= 85 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Eligible
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="w-3 h-3" />
                                Shortage
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="space-y-4">
              {/* Leave Days Header Summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Recorded Leave Days: {distinctLeaveDates.length} Distinct Dates
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    {leaveHistoryRecords.length} total lecture periods missed across all subjects
                  </div>
                </div>

                {distinctLeaveDates.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-medium">Dates:</span>
                    {distinctLeaveDates.slice(0, 5).map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        {d}
                      </span>
                    ))}
                    {distinctLeaveDates.length > 5 && (
                      <span className="text-[10px] text-slate-400">
                        +{distinctLeaveDates.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Leave Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by date (YYYY-MM-DD), subject, or reason..."
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <select
                  value={leaveTypeFilter}
                  onChange={(e) => setLeaveTypeFilter(e.target.value)}
                  className="text-xs py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="ALL">All Leave Categories</option>
                  <option value="casual_leave">Casual Leave (Absent)</option>
                  <option value="medical_leave">Medical Leave</option>
                  <option value="academic_leave">Academic Leave (Duty)</option>
                  <option value="official_leave">Official Leave</option>
                </select>
              </div>

              {/* Leave Records Chronological List */}
              {filteredLeaveRecords.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 italic">
                  No leave records found matching your filters.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-2.5">Period</th>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Reason / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {filteredLeaveRecords.map((rec) => {
                        const sub = subjects.find((s) => s.id === rec.subjectId);
                        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                        let label = 'Casual Leave';

                        if (rec.status === 'academic_leave') {
                          badgeClass = 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300';
                          label = 'Academic Leave';
                        } else if (rec.status === 'medical_leave') {
                          badgeClass = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300';
                          label = 'Medical Leave';
                        } else if (rec.status === 'official_leave') {
                          badgeClass = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300';
                          label = 'Official Leave';
                        }

                        return (
                          <tr
                            key={rec.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {rec.date}
                            </td>
                            <td className="py-2.5 px-2.5 font-mono text-slate-600 dark:text-slate-400">
                              Period {rec.period}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                              {sub?.name || 'Subject'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}
                              >
                                {label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 italic">
                              {rec.remarks || rec.lateReason || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Submitted Formal Leave Applications */}
              {formalLeaveApplications.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Formal Leave Applications ({formalLeaveApplications.length})</span>
                  </div>

                  <div className="space-y-2">
                    {formalLeaveApplications.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                              {app.leaveType} Leave
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                app.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : app.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Dates: <strong>{app.startDate}</strong> to <strong>{app.endDate}</strong>{app.totalDurationFormatted ? ` • Duration: ${app.totalDurationFormatted}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 italic mt-0.5">
                            Reason: &ldquo;{app.reason}&rdquo;
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {app.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Attendance calculation follows institutional Factor 30 / 85% requirement rules.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
