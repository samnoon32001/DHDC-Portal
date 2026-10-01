import React, { useState, useMemo } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { calculateCCETotal } from '../../utils/calculations';
import { exportToExcel } from '../../utils/excel';
import {
  ShieldCheck,
  Download,
  Printer,
  Users,
  Award,
  BookOpen,
  Eye,
  AlertCircle,
  FileText,
  Edit3,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { AcademicPerformanceDossier } from '../student/AcademicPerformanceDossier';

export const ClassTeacherView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const state = dataService.getState();
  const [selectedDossierStudentId, setSelectedDossierStudentId] = useState<string | null>(null);

  const teacherProfile = state.teachers.find(
    (t) => t.username === currentUser?.username || t.email === currentUser?.email
  );

  // Classes where this user is Class Teacher (or all if Super Admin)
  const classTeacherClasses = useMemo(() => {
    if (role === 'super_admin') return state.classes;
    if (!teacherProfile) return [];
    return state.classes.filter(
      (c) =>
        c.classTeacherId === teacherProfile.id ||
        teacherProfile.classTeacherOfClassIds?.includes(c.id)
    );
  }, [role, teacherProfile, state.classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return classTeacherClasses[0]?.id || '';
  });

  const selectedClass = state.classes.find((c) => c.id === selectedClassId);

  // Enrolled students in this class
  const classStudents = useMemo(() => {
    return state.students.filter((s) => s.classId === selectedClassId && s.status === 'active');
  }, [state.students, selectedClassId]);

  // Subjects in this class
  const classSubjects = useMemo(() => {
    return state.subjects.filter((s) => s.classId === selectedClassId && s.status === 'active');
  }, [state.subjects, selectedClassId]);

  // Compute consolidated marks for each student
  const studentConsolidatedData = useMemo(() => {
    const data = classStudents.map((std) => {
      let grandTotal30 = 0;
      const subjectScores: Record<string, { final30: number; percentage: number }> = {};

      classSubjects.forEach((sub) => {
        const subLevels = state.evaluationLevels.filter((l) => l.subjectId === sub.id && l.status === 'active');
        const subMarks = state.marks.filter((m) => m.studentId === std.id && m.subjectId === sub.id);

        const levelCalcs = subLevels.map((lvl) => {
          const m = subMarks.find((sm) => sm.evaluationLevelId === lvl.id);
          return {
            levelId: lvl.id,
            maxMark: lvl.maxMark,
            obtainedMark: m ? m.obtainedMark : 0,
          };
        });

        const cce = calculateCCETotal(levelCalcs);
        subjectScores[sub.id] = {
          final30: cce.finalMarkOutOf30,
          percentage: cce.percentage,
        };
        grandTotal30 += cce.finalMarkOutOf30;
      });

      const maxPossibleGrandTotal = classSubjects.length * 30;
      const overallPercentage =
        maxPossibleGrandTotal > 0
          ? Number(((grandTotal30 / maxPossibleGrandTotal) * 100).toFixed(2))
          : 0;

      return {
        student: std,
        subjectScores,
        grandTotal30: Number(grandTotal30.toFixed(2)),
        maxPossibleGrandTotal,
        overallPercentage,
      };
    });

    // Sort by grandTotal30 descending to assign ranks
    data.sort((a, b) => b.grandTotal30 - a.grandTotal30);

    return data.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [classStudents, classSubjects, state.evaluationLevels, state.marks]);

  // Export consolidated spreadsheet
  const handleExportConsolidated = () => {
    if (!selectedClass) return;

    const rows = studentConsolidatedData.map((row) => {
      const obj: any = {
        Rank: row.rank,
        'Admission No': row.student.admissionNumber,
        'Student Name': row.student.name,
      };

      classSubjects.forEach((sub) => {
        obj[`${sub.name} (out of 30)`] = row.subjectScores[sub.id]?.final30 ?? 0;
      });

      obj['Grand Total (CCE)'] = `${row.grandTotal30} / ${row.maxPossibleGrandTotal}`;
      obj['Overall %'] = `${row.overallPercentage}%`;
      return obj;
    });

    exportToExcel(
      rows,
      `${selectedClass.name}_Consolidated_Class_Marks.xlsx`,
      'Class Consolidated'
    );
  };

  if (classTeacherClasses.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          No Class Teacher Assignment
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
          You are currently not appointed as Class Teacher for any grade section. Please contact Super Admin to assign your Class Teacher responsibility.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Class Teacher Oversight Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Class Consolidated Evaluation & Performance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Read-only consolidated assessment of all subjects, student rankings, and grade distribution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportConsolidated}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Class Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Supervised Class:
          </span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900"
          >
            {classTeacherClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academicYear})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">
            Total Students: <strong className="text-slate-800 dark:text-slate-200">{classStudents.length}</strong>
          </span>
          <span className="text-slate-500">
            Subjects Evaluated: <strong className="text-slate-800 dark:text-slate-200">{classSubjects.length}</strong>
          </span>
          <span className="text-slate-500">
            Total CCE Out of: <strong className="text-slate-800 dark:text-slate-200">{classSubjects.length * 30} Marks</strong>
          </span>
        </div>
      </div>

      {/* RBAC Notice */}
      <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Class Teacher Supervision Policy:</span> As Class Teacher,
          you have comprehensive visibility to monitor student performance across all subjects in {selectedClass?.name}.
          In compliance with institutional security boundaries, marks for subjects taught by other teachers are displayed in read-only format.
        </div>
      </div>

      {/* Consolidated Marks Table */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Class Consolidated Mark Sheet — {selectedClass?.name} ({selectedClass?.academicYear})
          </h2>
          <span className="text-xs text-slate-400">All subject marks scaled to 30-mark CCE</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-14 text-center">Rank</th>
                <th className="py-3 px-3 w-24">Ad.No</th>
                <th className="py-3 px-4 min-w-[150px]">Student Name</th>

                {/* Subject Columns (Out of 30) */}
                {classSubjects.map((sub) => {
                  const teacher = state.teachers.find((t) => t.id === sub.assignedTeacherId);
                  return (
                    <th
                      key={sub.id}
                      className="py-3 px-3 text-center min-w-[100px] border-l border-slate-200 dark:border-slate-700"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {sub.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {teacher ? teacher.name.split(' ')[0] : 'Unassigned'}
                      </div>
                    </th>
                  );
                })}

                <th className="py-3 px-3 text-center min-w-[110px] border-l border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 font-bold">
                  Grand Total
                </th>
                <th className="py-3 px-3 text-center min-w-[90px] bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 font-bold">
                  Overall %
                </th>
                <th className="py-3 px-3 text-center min-w-[90px]">Status</th>
                <th className="py-3 px-3 text-center min-w-[120px]">Dossier & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {studentConsolidatedData.length === 0 ? (
                <tr>
                  <td colSpan={6 + classSubjects.length} className="py-8 text-center text-slate-400">
                    No students found in this class.
                  </td>
                </tr>
              ) : (
                studentConsolidatedData.map((row) => (
                  <tr
                    key={row.student.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-bold">
                      {row.rank === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-mono text-xs inline-flex items-center justify-center font-bold">
                          🥇 1
                        </span>
                      ) : row.rank === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-mono text-xs inline-flex items-center justify-center font-bold">
                          🥈 2
                        </span>
                      ) : row.rank === 3 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono text-xs inline-flex items-center justify-center font-bold">
                          🥉 3
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">#{row.rank}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {row.student.admissionNumber}
                    </td>

                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                      <button
                        onClick={() => setSelectedDossierStudentId(row.student.id)}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer text-left"
                      >
                        {row.student.name}
                      </button>
                    </td>

                    {/* Subject Scores */}
                    {classSubjects.map((sub) => {
                      const score = row.subjectScores[sub.id]?.final30 ?? 0;
                      return (
                        <td
                          key={sub.id}
                          className="py-2.5 px-3 text-center font-mono font-semibold border-l border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                        >
                          <span
                            className={
                              score >= 24
                                ? 'text-emerald-600 font-bold'
                                : score >= 12
                                ? 'text-slate-700 dark:text-slate-300'
                                : 'text-rose-600 font-bold'
                            }
                          >
                            {score}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal"> / 30</span>
                        </td>
                      );
                    })}

                    {/* Grand Total */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-blue-700 dark:text-blue-300 border-l border-slate-200 dark:border-slate-700 bg-blue-50/20">
                      {row.grandTotal30}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        / {row.maxPossibleGrandTotal}
                      </span>
                    </td>

                    {/* Overall Percentage */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white bg-blue-50/20">
                      {row.overallPercentage}%
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant={row.overallPercentage >= 40 ? 'success' : 'danger'}>
                        {row.overallPercentage >= 40 ? 'Passed' : 'Needs Support'}
                      </Badge>
                    </td>

                    {/* Actions: Dossier & Notes */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedDossierStudentId(row.student.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                        title="View academic exam breakdown and manage Class Teacher Notes"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Academic Dossier & Notes Modal */}
      {selectedDossierStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <AcademicPerformanceDossier
              studentId={selectedDossierStudentId}
              isModal={true}
              onClose={() => setSelectedDossierStudentId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
