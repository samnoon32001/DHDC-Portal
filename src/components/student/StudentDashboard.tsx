import React from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { calculateCCETotal } from '../../utils/calculations';
import { DashboardShowcaseBanner } from '../showcase/DashboardShowcaseBanner';
import {
  GraduationCap,
  Award,
  BookOpen,
  School,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import type { NavSection } from '../layout/Sidebar';

export const StudentDashboard: React.FC<{ onNavigate: (section: NavSection) => void }> = ({
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const state = dataService.getState();

  // Find student record
  const student = state.students.find(
    (s) =>
      s.username === currentUser?.username ||
      s.admissionNumber === currentUser?.admissionNumber
  );

  const studentClass = student ? state.classes.find((c) => c.id === student.classId) : null;
  const classTeacher = studentClass
    ? state.teachers.find((t) => t.id === studentClass.classTeacherId)
    : null;

  // Subjects in student's class
  const classSubjects = student
    ? state.subjects.filter((s) => s.classId === student.classId && s.status === 'active')
    : [];

  // Marks for this student
  const studentMarks = student
    ? state.marks.filter((m) => m.studentId === student.id)
    : [];

  // Calculate overall performance
  let totalFinalScore30 = 0;
  const subjectSummaries = classSubjects.map((sub) => {
    const levels = state.evaluationLevels.filter((l) => l.subjectId === sub.id && l.status === 'active');
    const marksForSub = studentMarks.filter((m) => m.subjectId === sub.id);

    const levelCalcs = levels.map((lvl) => {
      const found = marksForSub.find((m) => m.evaluationLevelId === lvl.id);
      return {
        levelId: lvl.id,
        maxMark: lvl.maxMark,
        obtainedMark: found ? found.obtainedMark : 0,
      };
    });

    const cce = calculateCCETotal(levelCalcs);
    totalFinalScore30 += cce.finalMarkOutOf30;

    return {
      subject: sub,
      cce,
      levels,
    };
  });

  const maxTotalScore30 = classSubjects.length * 30;
  const overallPercentage =
    maxTotalScore30 > 0
      ? Number(((totalFinalScore30 / maxTotalScore30) * 100).toFixed(2))
      : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Spotlight Toppers Banner (Ad style priority carousel) */}
      <DashboardShowcaseBanner />

      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 uppercase tracking-wider border border-slate-700">
              Student Assessment Portal
            </span>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 uppercase tracking-wider font-mono border border-indigo-500/30">
              Ad.No: {student?.admissionNumber}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {student?.name || currentUser?.name}
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            View your Continuous & Comprehensive Evaluation (CCE) performance, subject evaluations, and academic report cards.
          </p>
        </div>

        <button
          onClick={() => onNavigate('student-marks')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md shadow-sm transition-colors shrink-0 flex items-center gap-2 justify-center"
        >
          <Award className="w-4 h-4" />
          View My CCE Marks →
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Class Details */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-indigo-500 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">My Class</span>
            <span className="text-slate-400 dark:text-slate-500"><School className="w-4 h-4" /></span>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {studentClass?.name || 'Class 10A'}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Year: {studentClass?.academicYear || state.currentAcademicYear}
            </div>
          </div>
        </div>

        {/* Class Teacher */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Class Teacher</span>
            <span className="text-slate-400 dark:text-slate-500"><ShieldCheck className="w-4 h-4" /></span>
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate">
              {classTeacher?.name || 'Assigned Faculty'}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {classTeacher?.email || 'Teacher in charge'}
            </div>
          </div>
        </div>

        {/* Total Subjects */}
        <div
          onClick={() => onNavigate('student-subjects')}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer border-l-4 border-l-purple-500 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subjects</span>
            <span className="text-slate-400 dark:text-slate-500"><BookOpen className="w-4 h-4" /></span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {classSubjects.length < 10 ? `0${classSubjects.length}` : classSubjects.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Curriculum Courses</div>
          </div>
        </div>

        {/* CCE Overall Total */}
        <div
          onClick={() => onNavigate('student-marks')}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer border-l-4 border-l-emerald-500 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overall CCE Score</span>
            <span className="text-slate-400 dark:text-slate-500"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {totalFinalScore30.toFixed(1)}{' '}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">/ {maxTotalScore30}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-semibold">
              {overallPercentage}% Average
            </div>
          </div>
        </div>
      </div>

      {/* Subject Performance Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Subject CCE Performance Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Final Marks converted out of 30 for each enrolled subject
            </p>
          </div>
          <button
            onClick={() => onNavigate('student-marks')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
          >
            Full Mark Sheet <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectSummaries.map(({ subject, cce, levels }) => {
            const teacher = state.teachers.find((t) => t.id === subject.assignedTeacherId);

            return (
              <div
                key={subject.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {subject.code}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Instructor: {teacher ? teacher.name.split(' ')[0] : 'Faculty'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {subject.name}
                  </h3>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">Final Subject Mark:</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {cce.finalMarkOutOf30}
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-normal"> / 30</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">Percentage:</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        {cce.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(cce.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{levels.length} Evaluation Levels</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                    {cce.totalObtained} / {cce.totalMaximum} Raw Total
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
