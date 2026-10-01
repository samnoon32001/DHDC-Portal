import React, { useState, useMemo } from 'react';
import { dataService } from '../../services/db';
import { calculateCCETotal } from '../../utils/calculations';
import { exportToExcel } from '../../utils/excel';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  Award,
  Users,
  School,
  BookOpen,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const ReportsView: React.FC = () => {
  const state = dataService.getState();
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  const classesToAnalyze = useMemo(() => {
    if (selectedClassId === 'ALL') return state.classes;
    return state.classes.filter((c) => c.id === selectedClassId);
  }, [state.classes, selectedClassId]);

  // Overall analytics calculation
  const reportData = useMemo(() => {
    return classesToAnalyze.map((cls) => {
      const students = state.students.filter((s) => s.classId === cls.id && s.status === 'active');
      const subjects = state.subjects.filter((s) => s.classId === cls.id && s.status === 'active');
      const classTeacher = state.teachers.find((t) => t.id === cls.classTeacherId);

      let totalFinalScoreSum = 0;
      let passCount = 0;

      const studentTotals = students.map((std) => {
        let stdFinalScore = 0;
        subjects.forEach((sub) => {
          const levels = state.evaluationLevels.filter((l) => l.subjectId === sub.id && l.status === 'active');
          const marks = state.marks.filter((m) => m.studentId === std.id && m.subjectId === sub.id);

          const cce = calculateCCETotal(
            levels.map((lvl) => {
              const m = marks.find((mark) => mark.evaluationLevelId === lvl.id);
              return {
                levelId: lvl.id,
                maxMark: lvl.maxMark,
                obtainedMark: m ? m.obtainedMark : 0,
              };
            })
          );
          stdFinalScore += cce.finalMarkOutOf30;
        });

        const maxScore = subjects.length * 30;
        const pct = maxScore > 0 ? (stdFinalScore / maxScore) * 100 : 0;
        if (pct >= 40) passCount++;
        totalFinalScoreSum += stdFinalScore;

        return {
          student: std,
          score30: stdFinalScore,
          percentage: pct,
        };
      });

      const maxClassPossible = students.length * subjects.length * 30;
      const classAvgPercentage =
        maxClassPossible > 0
          ? Number(((totalFinalScoreSum / maxClassPossible) * 100).toFixed(1))
          : 0;

      const passRate =
        students.length > 0 ? Number(((passCount / students.length) * 100).toFixed(1)) : 0;

      return {
        class: cls,
        classTeacher,
        studentCount: students.length,
        subjectCount: subjects.length,
        classAvgPercentage,
        passCount,
        failCount: students.length - passCount,
        passRate,
      };
    });
  }, [classesToAnalyze, state.students, state.subjects, state.evaluationLevels, state.marks, state.teachers]);

  const handleExportInstitutionalReport = () => {
    const rows = reportData.map((r) => ({
      Class: r.class.name,
      'Academic Year': r.class.academicYear,
      'Class Teacher': r.classTeacher?.name || 'Unassigned',
      'Enrolled Students': r.studentCount,
      'Curriculum Subjects': r.subjectCount,
      'Class Average (%)': `${r.classAvgPercentage}%`,
      'Passed Students': r.passCount,
      'Needs Support': r.failCount,
      'Pass Rate (%)': `${r.passRate}%`,
    }));

    exportToExcel(rows, `Institutional_Academic_Performance_Report.xlsx`, 'Class Analytics');
  };

  const handleExportStudentObservations = () => {
    const activeStudents = state.students.filter(
      (s) => (selectedClassId === 'ALL' || s.classId === selectedClassId) && s.status === 'active'
    );

    const rows = activeStudents.map((std) => {
      const cls = state.classes.find((c) => c.id === std.classId);
      const subjects = state.subjects.filter((sub) => sub.classId === std.classId && sub.status === 'active');
      let totalScore = 0;
      subjects.forEach((sub) => {
        const levels = state.evaluationLevels.filter((l) => l.subjectId === sub.id && l.status === 'active');
        const marks = state.marks.filter((m) => m.studentId === std.id && m.subjectId === sub.id);
        const cce = calculateCCETotal(
          levels.map((lvl) => {
            const m = marks.find((mark) => mark.evaluationLevelId === lvl.id);
            return {
              levelId: lvl.id,
              maxMark: lvl.maxMark,
              obtainedMark: m ? m.obtainedMark : 0,
            };
          })
        );
        totalScore += cce.finalMarkOutOf30;
      });
      const maxScore = subjects.length * 30;
      const pct = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;

      return {
        'Admission No': std.admissionNumber,
        'Student Name': std.name,
        Class: cls ? cls.name : 'Unknown',
        'Academic Year': cls ? cls.academicYear : '',
        'CCE Total Score (30 scale)': totalScore,
        'Max Possible': maxScore,
        'Overall Percentage': `${pct}%`,
        Status: pct >= 40 ? 'Qualified' : 'Needs Support',
        'Teacher Strengths Remark': std.classTeacherNotes?.strengths || 'N/A',
        'Teacher Areas For Improvement': std.classTeacherNotes?.areasOfImprovement || 'N/A',
        'Teacher Recommendations': std.classTeacherNotes?.recommendations || 'N/A',
        'Counseling Notes': std.classTeacherNotes?.counselingNotes || 'N/A',
        'Remarks Updated By': std.classTeacherNotes?.updatedByName || 'N/A',
        'Remarks Date': std.classTeacherNotes?.lastUpdated
          ? new Date(std.classTeacherNotes.lastUpdated).toLocaleDateString()
          : 'N/A',
      };
    });

    exportToExcel(rows, `Student_Academic_And_Observations_Register.xlsx`, 'Students Register');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Institutional Academic Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            School-wide CCE performance, cohort comparisons, and institutional pass metrics
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button
            onClick={handleExportInstitutionalReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
            title="Export class cohort averages and pass rates"
          >
            <Download className="w-4 h-4" />
            Export Class Analytics (Excel)
          </button>
          <button
            onClick={handleExportStudentObservations}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer"
            title="Export student grades and class teacher observations register"
          >
            <Download className="w-4 h-4" />
            Export Student Dossier & Notes (Excel)
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Filter by Class Cohort:
          </span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Classes & Grades</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academicYear})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Academic Year: <strong className="text-slate-800 dark:text-slate-200">{state.currentAcademicYear}</strong>
        </div>
      </div>

      {/* Cohort Performance Table */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Class Performance Comparison Summary
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Class Teacher</th>
                <th className="py-3 px-4 text-center">Enrolled</th>
                <th className="py-3 px-4 text-center">Subjects</th>
                <th className="py-3 px-4 text-center">Class Average</th>
                <th className="py-3 px-4 text-center">Passed / Total</th>
                <th className="py-3 px-4 text-center">Pass Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {reportData.map((row) => (
                <tr
                  key={row.class.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50 transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {row.class.name}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {row.classTeacher?.name || 'Unassigned'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{row.studentCount}</td>
                  <td className="py-3 px-4 text-center font-mono">{row.subjectCount}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                    {row.classAvgPercentage}%
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    <span className="text-emerald-600 font-bold">{row.passCount}</span> /{' '}
                    <span className="text-slate-400">{row.studentCount}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        row.passRate >= 75
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.passRate >= 50
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {row.passRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
