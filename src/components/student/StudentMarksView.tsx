import React, { useState, useMemo } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { calculateCCETotal } from '../../utils/calculations';
import {
  Award,
  Printer,
  FileText,
  School,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { AcademicPerformanceDossier } from './AcademicPerformanceDossier';

export const StudentMarksView: React.FC = () => {
  const { currentUser } = useAuth();
  const state = dataService.getState();
  const [viewMode, setViewMode] = useState<'matrix' | 'report-card' | 'dossier'>('matrix');

  const student = state.students.find(
    (s) =>
      s.username === currentUser?.username ||
      s.admissionNumber === currentUser?.admissionNumber
  );

  const studentClass = student ? state.classes.find((c) => c.id === student.classId) : null;
  const classTeacher = studentClass
    ? state.teachers.find((t) => t.id === studentClass.classTeacherId)
    : null;

  const classSubjects = useMemo(() => {
    if (!student) return [];
    return state.subjects.filter((s) => s.classId === student.classId && s.status === 'active');
  }, [student, state.subjects]);

  const studentMarks = useMemo(() => {
    if (!student) return [];
    return state.marks.filter((m) => m.studentId === student.id);
  }, [student, state.marks]);

  // Compute detailed results for every subject
  const subjectResults = useMemo(() => {
    return classSubjects.map((sub) => {
      const teacher = state.teachers.find((t) => t.id === sub.assignedTeacherId);
      const levels = state.evaluationLevels
        .filter((l) => l.subjectId === sub.id && l.status === 'active')
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const levelDetails = levels.map((lvl) => {
        const found = studentMarks.find(
          (m) => m.subjectId === sub.id && m.evaluationLevelId === lvl.id
        );
        return {
          level: lvl,
          obtained: found ? found.obtainedMark : 0,
          isEntered: found !== undefined,
        };
      });

      const cce = calculateCCETotal(
        levelDetails.map((ld) => ({
          levelId: ld.level.id,
          maxMark: ld.level.maxMark,
          obtainedMark: ld.obtained,
        }))
      );

      // Determine Grade
      let grade = 'F';
      if (cce.percentage >= 90) grade = 'A+';
      else if (cce.percentage >= 80) grade = 'A';
      else if (cce.percentage >= 70) grade = 'B+';
      else if (cce.percentage >= 60) grade = 'B';
      else if (cce.percentage >= 50) grade = 'C';
      else if (cce.percentage >= 40) grade = 'D';

      return {
        subject: sub,
        teacher,
        levelDetails,
        cce,
        grade,
      };
    });
  }, [classSubjects, state.evaluationLevels, studentMarks, state.teachers]);

  // Compute Grand Totals
  const grandTotal30 = Number(
    subjectResults.reduce((acc, sr) => acc + sr.cce.finalMarkOutOf30, 0).toFixed(2)
  );
  const maxGrandTotal30 = subjectResults.length * 30;
  const overallPercentage =
    maxGrandTotal30 > 0
      ? Number(((grandTotal30 / maxGrandTotal30) * 100).toFixed(2))
      : 0;

  let overallGrade = 'F';
  if (overallPercentage >= 90) overallGrade = 'A+';
  else if (overallPercentage >= 80) overallGrade = 'A';
  else if (overallPercentage >= 70) overallGrade = 'B+';
  else if (overallPercentage >= 60) overallGrade = 'B';
  else if (overallPercentage >= 50) overallGrade = 'C';
  else if (overallPercentage >= 40) overallGrade = 'D';

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-400">
        No student profile linked to current session.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-600" />
            Continuous & Comprehensive Evaluation (CCE) Mark Sheet
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Subject-level evaluation breakdown with automatic 30-mark weightage calculation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Detailed Breakdown
            </button>
            <button
              onClick={() => setViewMode('dossier')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'dossier'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Academic Dossier & Remarks
            </button>
            <button
              onClick={() => setViewMode('report-card')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'report-card'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Printable Report Card
            </button>
          </div>

          <button
            onClick={() => {
              if (viewMode !== 'report-card') {
                setViewMode('report-card');
                setTimeout(() => window.print(), 100);
              } else {
                window.print();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report Card
          </button>
        </div>
      </div>

      {/* Summary Highlight Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Total CCE Marks</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {grandTotal30}{' '}
            <span className="text-xs text-slate-400 font-normal">/ {maxGrandTotal30}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sum of 30-mark subject totals</div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Overall Percentage</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {overallPercentage}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Weighted average across all subjects</div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Overall Grade & Standing</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-purple-600 font-mono">{overallGrade}</span>
            <Badge variant={overallPercentage >= 40 ? 'success' : 'danger'}>
              {overallPercentage >= 40 ? 'Qualified / Passed' : 'Needs Improvement'}
            </Badge>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Continuous Evaluation Status</div>
        </div>
      </div>

      {viewMode === 'dossier' ? (
        <AcademicPerformanceDossier studentId={student.id} />
      ) : viewMode === 'matrix' ? (
        /* Detailed Subject Marks Table matching Section 18 */
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Subject Assessment Breakdown — {studentClass?.name} ({studentClass?.academicYear})
            </h2>
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">
              Ad.No: {student.admissionNumber}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[150px]">Subject</th>
                  <th className="py-3 px-4 min-w-[140px]">Instructor</th>
                  <th className="py-3 px-4 min-w-[200px]">Evaluation Level Breakdown</th>
                  <th className="py-3 px-4 text-center min-w-[90px]">Total Obt.</th>
                  <th className="py-3 px-4 text-center min-w-[80px]">Total Max</th>
                  <th className="py-3 px-4 text-center min-w-[80px]">Percentage</th>
                  <th className="py-3 px-4 text-center min-w-[130px] bg-emerald-50/60 dark:bg-emerald-950/30 font-bold text-emerald-900 dark:text-emerald-300">
                    Final Mark (30)
                  </th>
                  <th className="py-3 px-4 text-center min-w-[60px]">Grade</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {subjectResults.map((sr, idx) => (
                  <tr
                    key={sr.subject.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {sr.subject.name}
                      </div>
                      <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                        {sr.subject.code}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {sr.teacher ? sr.teacher.name : 'Faculty'}
                      </span>
                    </td>

                    {/* Level Breakdown pills */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {sr.levelDetails.map((ld) => (
                          <div
                            key={ld.level.id}
                            className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 text-[11px]"
                          >
                            <span className="text-slate-500 mr-1">{ld.level.name}:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                              {ld.obtained}
                            </span>
                            <span className="text-slate-400 font-mono">/{ld.level.maxMark}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {sr.cce.totalObtained}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                      {sr.cce.totalMaximum}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {sr.cce.percentage}%
                    </td>

                    {/* Final Subject Mark (out of 30) */}
                    <td className="py-3.5 px-4 text-center bg-emerald-50/40 dark:bg-emerald-950/20">
                      <div className="inline-flex items-center gap-1 font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md">
                        {sr.cce.finalMarkOutOf30}
                        <span className="text-[10px] text-emerald-600/80 font-normal"> / 30</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold font-mono text-sm text-purple-700 dark:text-purple-300">
                      {sr.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Weightage conversion applied:{' '}
              <strong className="text-slate-700 dark:text-slate-200 font-mono">
                Final Mark = (Total Obtained / Total Maximum) × 30
              </strong>
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Grand Total: {grandTotal30} / {maxGrandTotal30} ({overallPercentage}%)
            </span>
          </div>
        </div>
      ) : (
        /* Official Printable Student Report Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-slate-200 dark:border-slate-800 shadow-lg print:border-none print:shadow-none print:p-0">
          {/* Institution Header */}
          <div className="text-center pb-6 border-b-2 border-slate-900 dark:border-slate-100">
            <div className="flex items-center justify-center gap-3 mb-1.5">
              {dataService.getInstitutionSettings().logoUrl ? (
                <img
                  src={dataService.getInstitutionSettings().logoUrl}
                  alt="Institution Logo"
                  className="w-10 h-10 object-contain rounded-lg shadow-xs"
                />
              ) : (
                <School className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              )}
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {dataService.getInstitutionSettings().name || "DARUL HIDAYA DA'WA COLLEGE, MANOOR"}
              </h2>
            </div>
            {dataService.getInstitutionSettings().address && (
              <p className="text-xs text-slate-500 font-medium">
                {dataService.getInstitutionSettings().address}
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest font-semibold mt-1">
              {dataService.getInstitutionSettings().reportCardFooter || 'Continuous & Comprehensive Evaluation (CCE) Student Report Card'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Academic Year: {studentClass?.academicYear || state.currentAcademicYear}
            </p>
          </div>

          {/* Student Profile Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Student Name</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {student.name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Admission Number</span>
              <span className="font-mono font-bold text-blue-600 text-sm">
                {student.admissionNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Class & Section</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {studentClass?.name || 'Class 10A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Class Teacher</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {classTeacher?.name || 'Faculty'}
              </span>
            </div>
          </div>

          {/* Marks Summary Table */}
          <div className="py-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 dark:border-slate-700 uppercase font-bold text-slate-700 dark:text-slate-300">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3 text-center">Total Obt.</th>
                  <th className="py-2.5 px-3 text-center">Total Max</th>
                  <th className="py-2.5 px-3 text-center">Percentage</th>
                  <th className="py-2.5 px-3 text-center font-bold">Final CCE (Out of 30)</th>
                  <th className="py-2.5 px-3 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {subjectResults.map((sr) => (
                  <tr key={sr.subject.id}>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {sr.subject.name}{' '}
                      <span className="font-mono text-slate-400 font-normal">
                        ({sr.subject.code})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{sr.cce.totalObtained}</td>
                    <td className="py-3 px-3 text-center font-mono">{sr.cce.totalMaximum}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {sr.cce.percentage}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                      {sr.cce.finalMarkOutOf30} / 30
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-sm">
                      {sr.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 dark:border-slate-100 font-bold text-slate-900 dark:text-white">
                  <td className="py-3 px-3 uppercase">Grand Cumulative Total</td>
                  <td colSpan={3} className="py-3 px-3 text-right">
                    Overall Percentage: {overallPercentage}%
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-base text-emerald-700 dark:text-emerald-300">
                    {grandTotal30} / {maxGrandTotal30}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-base">{overallGrade}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures section */}
          <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs text-slate-500">
            <div>
              <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800 dark:text-slate-200">
                Class Teacher Signature
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800 dark:text-slate-200">
                Principal / Head of School
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800 dark:text-slate-200">
                Parent / Guardian Signature
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
