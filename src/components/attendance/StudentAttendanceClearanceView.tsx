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
  BookOpen,
  CheckSquare,
  Square,
  FileText,
  Send,
  X,
  Info,
  ChevronRight,
} from 'lucide-react';
import type {
  Student,
  ClassRoom,
  Subject,
  AttendanceRecord,
  AttendanceClearance,
  AttendanceRulesConfig,
  StudentLeaveClearanceApplication,
} from '../../types';
import { dataService } from '../../services/db';
import { calculateStudentSubjectAttendance } from '../../utils/attendanceCalculator';

interface StudentAttendanceClearanceViewProps {
  currentStudent: Student;
  classes: ClassRoom[];
  subjects: Subject[];
  attendanceRecords: AttendanceRecord[];
  clearances: AttendanceClearance[];
  rules: AttendanceRulesConfig;
  studentApplications: StudentLeaveClearanceApplication[];
  onRefresh?: () => void;
}

export const StudentAttendanceClearanceView: React.FC<StudentAttendanceClearanceViewProps> = ({
  currentStudent,
  classes,
  subjects,
  attendanceRecords,
  clearances,
  rules,
  studentApplications,
  onRefresh,
}) => {
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [clearanceType, setClearanceType] = useState<
    'academic_leave' | 'official_leave' | 'medical_leave'
  >('academic_leave');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Student class
  const studentClass = useMemo(() => {
    return classes.find((c) => c.id === currentStudent.classId);
  }, [classes, currentStudent]);

  // Student enrolled subjects
  const studentClassSubjects = useMemo(() => {
    return subjects.filter(
      (s) =>
        s.classId === currentStudent.classId &&
        s.trackAttendance !== false &&
        (!s.isSplitSubject || s.enrolledStudentIds?.includes(currentStudent.id))
    );
  }, [subjects, currentStudent]);

  // Overall attendance stats
  const overallStats = useMemo(() => {
    return calculateStudentSubjectAttendance(
      currentStudent.id,
      'ALL',
      attendanceRecords,
      clearances,
      rules
    );
  }, [currentStudent, attendanceRecords, clearances, rules]);

  // All attendance records for this student
  const myRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.studentId === currentStudent.id);
  }, [attendanceRecords, currentStudent]);

  // Taken leave records (casual leaves and absences that can be cleared)
  const myLeaveRecords = useMemo(() => {
    return myRecords
      .filter(
        (r) =>
          r.status === 'casual_leave' ||
          r.status === 'absent' ||
          r.status === 'academic_leave' ||
          r.status === 'official_leave' ||
          r.status === 'medical_leave'
      )
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [myRecords]);

  // Student's clearance applications
  const myApplications = useMemo(() => {
    return (studentApplications || [])
      .filter((a) => a.studentId === currentStudent.id)
      .sort((a, b) => (b.appliedAt > a.appliedAt ? 1 : -1));
  }, [studentApplications, currentStudent]);

  // Set of record IDs that already have a pending application
  const pendingRecordIds = useMemo(() => {
    const ids = new Set<string>();
    myApplications
      .filter((a) => a.status === 'pending')
      .forEach((a) => {
        a.recordIds.forEach((id) => ids.add(id));
      });
    return ids;
  }, [myApplications]);

  // Handle submit application
  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecordIds.length === 0) {
      alert('Please select at least one leave session to apply for clearance.');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a specific reason or justification for the clearance.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find subject name(s) and dates
      const selectedRecords = myLeaveRecords.filter((r) =>
        selectedRecordIds.includes(r.id)
      );
      const subjectNames = Array.from(
        new Set(
          selectedRecords.map(
            (r) => subjects.find((s) => s.id === r.subjectId)?.name || 'Subject'
          )
        )
      ).join(', ');
      const dates = Array.from(new Set(selectedRecords.map((r) => r.date)));
      const periods = Array.from(new Set(selectedRecords.map((r) => r.period))).sort((a, b) => a - b);

      dataService.applyStudentLeaveClearance({
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        studentAdmissionNumber: currentStudent.admissionNumber,
        classId: currentStudent.classId,
        className: studentClass?.name || 'Class',
        subjectId: selectedRecords[0]?.subjectId || 'ALL',
        subjectName: subjectNames,
        recordIds: selectedRecordIds,
        dates,
        periods,
        clearanceType,
        reason: reason.trim(),
      });

      setFeedbackNotice(
        `Clearance application submitted successfully for ${selectedRecordIds.length} session(s)! It has been queued for authority review.`
      );
      setSelectedRecordIds([]);
      setReason('');
      setTimeout(() => setFeedbackNotice(null), 5000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert('Failed to submit application: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="student-attendance-view" className="space-y-6 pb-12">
      {/* Toast Alert */}
      {feedbackNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Student Overview Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            {currentStudent.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                {currentStudent.name}
              </h1>
              <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded">
                Adm #{currentStudent.admissionNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Class: <strong>{studentClass?.name || 'Class'}</strong> • Student Attendance & Clearance Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-semibold">
              Net Attendance Rate
            </div>
            <div
              className={`text-2xl font-black ${
                overallStats.isShortage
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {overallStats.overallPercentWithoutMedical}%
            </div>
            <div className="text-[11px] text-slate-400">
              Min. Required: {rules.minRequiredAttendancePercent}%
            </div>
          </div>

          <div>
            {overallStats.isCleared ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                <ShieldCheck className="w-4 h-4" /> Cleared
              </span>
            ) : overallStats.isShortage ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                <AlertTriangle className="w-4 h-4" /> Shortage
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Eligible
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Total Sessions</span>
          <span className="text-xl font-bold text-slate-800 dark:text-white">
            {overallStats.totalPeriods}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block">Present</span>
          <span className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
            {overallStats.presentCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 shadow-xs">
          <span className="text-[11px] text-purple-700 dark:text-purple-400 font-semibold block">Academic Leave</span>
          <span className="text-xl font-bold text-purple-800 dark:text-purple-300">
            {overallStats.academicLeaveCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block">Casual Leave</span>
          <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {overallStats.casualLeaveCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 shadow-xs">
          <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold block">Official Leave</span>
          <span className="text-xl font-bold text-blue-800 dark:text-blue-300">
            {overallStats.officialLeaveCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 shadow-xs">
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold block">Medical Leave</span>
          <span className="text-xl font-bold text-amber-800 dark:text-amber-300">
            {overallStats.medicalLeaveCount}
          </span>
        </div>
      </div>

      {/* Subject-Wise Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Subject-Wise Attendance Status</span>
          </h2>
          <span className="text-xs text-slate-500">
            {studentClassSubjects.length} Enrolled Subjects
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
              {studentClassSubjects.map((sub) => {
                const stats = calculateStudentSubjectAttendance(
                  currentStudent.id,
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
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-semibold">{stats.totalPeriods}</td>
                    <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400 font-bold">{stats.presentCount}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">{stats.casualLeaveCount}</td>
                    <td className="py-3 px-3 text-purple-700 dark:text-purple-400 font-medium">{stats.academicLeaveCount}</td>
                    <td className="py-3 px-3 text-blue-700 dark:text-blue-400 font-medium">{stats.officialLeaveCount}</td>
                    <td className="py-3 px-3 text-amber-700 dark:text-amber-400 font-medium">{stats.medicalLeaveCount}</td>
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

      {/* =========================================================================
          APPLY FOR LEAVE CLEARANCE SECTION (MULTI-SELECT & SINGLE SELECT)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Apply for Leave Clearance (Condonation)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select one or multiple leave dates below to submit an official clearance application.
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            {selectedRecordIds.length} Session(s) Selected
          </div>
        </div>

        {myLeaveRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            You have no casual leaves or absences recorded! Excellent attendance!
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {/* List of leaves */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedRecordIds.length === myLeaveRecords.length &&
                          myLeaveRecords.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecordIds(myLeaveRecords.map((r) => r.id));
                          } else {
                            setSelectedRecordIds([]);
                          }
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="py-2.5 px-3">Date & Period</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Current Status</th>
                    <th className="py-2.5 px-4">Clearance Application State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {myLeaveRecords.map((rec) => {
                    const sub = subjects.find((s) => s.id === rec.subjectId);
                    const isChecked = selectedRecordIds.includes(rec.id);
                    const hasPending = pendingRecordIds.has(rec.id);
                    const isAlreadyCleared =
                      rec.status === 'academic_leave' ||
                      rec.status === 'official_leave' ||
                      rec.status === 'medical_leave';

                    return (
                      <tr
                        key={rec.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          isChecked ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <input
                            type="checkbox"
                            disabled={hasPending || isAlreadyCleared}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecordIds((prev) => [...prev, rec.id]);
                              } else {
                                setSelectedRecordIds((prev) =>
                                  prev.filter((id) => id !== rec.id)
                                );
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {rec.date} • Period {rec.period}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {sub?.name || 'Subject'}
                          </span>{' '}
                          <span className="text-[11px] font-mono text-slate-500">
                            ({sub?.code})
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {rec.status === 'academic_leave' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
                              Academic Leave
                            </span>
                          )}
                          {rec.status === 'official_leave' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                              Official Leave
                            </span>
                          )}
                          {rec.status === 'medical_leave' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                              Medical Leave
                            </span>
                          )}
                          {rec.status === 'casual_leave' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                              Casual Leave
                            </span>
                          )}
                          {rec.status === 'absent' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                              Absent
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {hasPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" /> Application Pending
                            </span>
                          ) : isAlreadyCleared ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Cleared
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedRecordIds([rec.id])}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              Select for Clearance
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Application Submission Form */}
            {selectedRecordIds.length > 0 && (
              <form
                onSubmit={handleSubmitApplication}
                className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>Apply for Clearance for {selectedRecordIds.length} Selected Session(s)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedRecordIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Deselect All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Academic Leave Option */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      clearanceType === 'academic_leave'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 ring-2 ring-purple-400/30 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
                        <Sparkles className="w-4 h-4" />
                        <span>Academic Leave</span>
                      </div>
                      <input
                        type="radio"
                        name="clearanceType"
                        value="academic_leave"
                        checked={clearanceType === 'academic_leave'}
                        onChange={() => setClearanceType('academic_leave')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Conference, seminar, academic competition, authorized exams. Counts as 100% Present.
                    </p>
                  </label>

                  {/* Official Leave Option */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      clearanceType === 'official_leave'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 ring-2 ring-blue-400/30 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                        <Award className="w-4 h-4" />
                        <span>Official Leave</span>
                      </div>
                      <input
                        type="radio"
                        name="clearanceType"
                        value="official_leave"
                        checked={clearanceType === 'official_leave'}
                        onChange={() => setClearanceType('official_leave')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Authorized college representation, sports council, institutional duties.
                    </p>
                  </label>

                  {/* Medical Leave Option */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      clearanceType === 'medical_leave'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 ring-2 ring-amber-400/30 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                        <HeartPulse className="w-4 h-4" />
                        <span>Medical Leave</span>
                      </div>
                      <input
                        type="radio"
                        name="clearanceType"
                        value="medical_leave"
                        checked={clearanceType === 'medical_leave'}
                        onChange={() => setClearanceType('medical_leave')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Illness with doctor certification. Excludes period from attendance denominator.
                    </p>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Justification / Reason (Detailed explanation required)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe the reason for leave (e.g. Participated in District Youth Festival, Medical certificate submitted to academic office...)"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Clearance Application</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          MY SUBMITTED CLEARANCE APPLICATIONS TRACKING
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>My Clearance Applications Tracking</span>
          </h2>
          <span className="text-xs text-slate-500">
            {myApplications.length} Applications Submitted
          </span>
        </div>

        {myApplications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            You haven't submitted any attendance clearance applications yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {myApplications.map((app) => (
              <div
                key={app.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-white text-xs">
                      {app.subjectName}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        app.clearanceType === 'academic_leave'
                          ? 'bg-purple-100 text-purple-800'
                          : app.clearanceType === 'official_leave'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {app.clearanceType.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      • {app.dates.join(', ')} ({app.recordIds.length} session(s))
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>Reason:</strong> {app.reason}
                  </p>

                  <div className="text-[11px] text-slate-400">
                    Applied on {new Date(app.appliedAt).toLocaleString()}
                    {app.reviewedBy && (
                      <span>
                        {' '}
                        • Reviewed by {app.reviewedByName} on{' '}
                        {app.reviewedAt ? new Date(app.reviewedAt).toLocaleString() : ''}
                      </span>
                    )}
                    {app.reviewRemarks && (
                      <span className="block text-slate-600 italic">
                        Remarks: {app.reviewRemarks}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  {app.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" /> Pending Review
                    </span>
                  )}
                  {app.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Cleared
                    </span>
                  )}
                  {app.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      <X className="w-3.5 h-3.5" /> Rejected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
