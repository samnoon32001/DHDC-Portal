import React, { useState, useMemo } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { calculateCCETotal } from '../../utils/calculations';
import { exportToExcel } from '../../utils/excel';
import {
  Award,
  Printer,
  Download,
  Save,
  FileText,
  TrendingUp,
  Sparkles,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Target,
  Brain,
  Edit3,
  BarChart2,
  Calendar,
  Clock,
  User,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import type { ClassTeacherNotes, Student } from '../../types';

interface AcademicPerformanceDossierProps {
  studentId: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const AcademicPerformanceDossier: React.FC<AcademicPerformanceDossierProps> = ({
  studentId,
  onClose,
  isModal = false,
}) => {
  const { currentUser, role } = useAuth();
  const state = dataService.getState();

  // Find student
  const student = state.students.find((s) => s.id === studentId);
  const studentClass = student ? state.classes.find((c) => c.id === student.classId) : null;
  const classTeacher = studentClass ? state.teachers.find((t) => t.id === studentClass.classTeacherId) : null;

  // Check RBAC: Can current user edit Class Teacher Notes?
  const isSuperAdmin = role === 'super_admin';
  const currentTeacher = state.teachers.find(
    (t) => t.id === currentUser?.id || t.username === currentUser?.username || t.email === currentUser?.email
  );
  const isAssignedClassTeacher = Boolean(
    (studentClass && currentTeacher && studentClass.classTeacherId === currentTeacher.id) ||
    (student?.classId && currentTeacher?.classTeacherOfClassIds?.includes(student.classId))
  );
  const canEditNotes = isSuperAdmin || isAssignedClassTeacher;

  // Class subjects and marks
  const classSubjects = useMemo(() => {
    if (!student) return [];
    return state.subjects.filter((s) => s.classId === student.classId && s.status === 'active');
  }, [student, state.subjects]);

  const studentMarks = useMemo(() => {
    if (!student) return [];
    return state.marks.filter((m) => m.studentId === student.id);
  }, [student, state.marks]);

  // Consolidated Subject Results
  const subjectBreakdowns = useMemo(() => {
    return classSubjects.map((sub) => {
      const teacher = state.teachers.find((t) => t.id === sub.assignedTeacherId);
      const levels = state.evaluationLevels
        .filter((l) => l.subjectId === sub.id && l.status === 'active')
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const levelDetails = levels.map((lvl) => {
        const found = studentMarks.find(
          (m) => m.subjectId === sub.id && m.evaluationLevelId === lvl.id
        );
        const obtained = found ? found.obtainedMark : 0;
        const max = lvl.maxMark || 100;
        const pct = max > 0 ? Math.round((obtained / max) * 100) : 0;
        return {
          level: lvl,
          obtained,
          max,
          percentage: pct,
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

  // Overall Totals
  const totalObtained30 = Number(
    subjectBreakdowns.reduce((acc, sb) => acc + sb.cce.finalMarkOutOf30, 0).toFixed(2)
  );
  const maxPossible30 = subjectBreakdowns.length * 30;
  const overallPercentage =
    maxPossible30 > 0 ? Number(((totalObtained30 / maxPossible30) * 100).toFixed(2)) : 0;

  let overallGrade = 'F';
  if (overallPercentage >= 90) overallGrade = 'A+';
  else if (overallPercentage >= 80) overallGrade = 'A';
  else if (overallPercentage >= 70) overallGrade = 'B+';
  else if (overallPercentage >= 60) overallGrade = 'B';
  else if (overallPercentage >= 50) overallGrade = 'C';
  else if (overallPercentage >= 40) overallGrade = 'D';

  // Algorithmic Strengths and Focus Areas (Weaknesses)
  const computedStrengths = useMemo(() => {
    return subjectBreakdowns
      .filter((sb) => sb.cce.percentage >= 75)
      .map((sb) => ({
        subjectName: sb.subject.name,
        percentage: sb.cce.percentage,
        grade: sb.grade,
        highlight: `Strong command in ${sb.subject.name} with ${sb.cce.percentage}% CCE performance.`,
      }));
  }, [subjectBreakdowns]);

  const computedWeaknesses = useMemo(() => {
    return subjectBreakdowns
      .filter((sb) => sb.cce.percentage < 60)
      .map((sb) => ({
        subjectName: sb.subject.name,
        percentage: sb.cce.percentage,
        grade: sb.grade,
        recommendation: `Targeted practice and remedial support recommended in ${sb.subject.name} (${sb.cce.percentage}%).`,
      }));
  }, [subjectBreakdowns]);

  // Class Teacher Notes Form State
  const initialNotes = student?.classTeacherNotes || {};
  const [generalObservations, setGeneralObservations] = useState(initialNotes.generalObservations || '');
  const [strengths, setStrengths] = useState(initialNotes.strengths || '');
  const [areasOfImprovement, setAreasOfImprovement] = useState(initialNotes.areasOfImprovement || '');
  const [behaviorRemarks, setBehaviorRemarks] = useState(initialNotes.behaviorRemarks || '');
  const [counselingNotes, setCounselingNotes] = useState(initialNotes.counselingNotes || '');
  const [recommendations, setRecommendations] = useState(initialNotes.recommendations || '');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !canEditNotes) return;

    setIsSaving(true);
    setSaveStatus(null);

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };

    const notesToSave: Partial<ClassTeacherNotes> = {
      generalObservations: generalObservations.trim(),
      strengths: strengths.trim(),
      areasOfImprovement: areasOfImprovement.trim(),
      behaviorRemarks: behaviorRemarks.trim(),
      counselingNotes: counselingNotes.trim(),
      recommendations: recommendations.trim(),
    };

    const success = dataService.updateClassTeacherNotes(student.id, notesToSave, actor);
    setIsSaving(false);

    if (success) {
      setSaveStatus('Remarks & observations successfully saved to dossier.');
      setTimeout(() => setSaveStatus(null), 4000);
    } else {
      setSaveStatus('Error: You are not authorized to edit notes for this student.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!student) return;
    const rows: any[] = [];

    subjectBreakdowns.forEach((sb) => {
      sb.levelDetails.forEach((ld) => {
        rows.push({
          'Admission No': student.admissionNumber,
          'Student Name': student.name,
          Class: studentClass?.name || 'N/A',
          Subject: sb.subject.name,
          'Subject Code': sb.subject.code,
          'Teacher': sb.teacher?.name || 'Unassigned',
          'Evaluation Component': ld.level.name,
          'Max Mark': ld.max,
          'Obtained Mark': ld.obtained,
          'Component %': `${ld.percentage}%`,
          'CCE Out of 30': sb.cce.finalMarkOutOf30,
          'Subject %': `${sb.cce.percentage}%`,
          'Grade': sb.grade,
        });
      });
    });

    exportToExcel(
      rows,
      `${student.admissionNumber}_Academic_Performance_Dossier.xlsx`,
      'Academic Performance'
    );
  };

  if (!student) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400">
        Student profile record not found.
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : ''}`}>
      {/* Dossier Header & Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl shadow-xs">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {student.name}
              </h2>
              <Badge variant={overallPercentage >= 40 ? 'success' : 'danger'}>
                {overallPercentage >= 40 ? 'Satisfactory Standing' : 'Academic Alert'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>
                Ad. No: <strong className="font-mono text-slate-800 dark:text-slate-200">{student.admissionNumber}</strong>
              </span>
              <span>•</span>
              <span>
                Class: <strong className="text-indigo-600 dark:text-indigo-400">{studentClass?.name || 'Unassigned'}</strong>
              </span>
              <span>•</span>
              <span>
                Class Teacher: <strong>{classTeacher?.name || 'None Assigned'}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Dossier
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span>CCE Grand Total</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {totalObtained30}{' '}
            <span className="text-xs text-slate-400 font-normal">/ {maxPossible30}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Normalized to 30 marks per course</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span>Overall Percentage</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {overallPercentage}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Weighted performance trajectory</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span>Academic Letter Grade</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              Grade {overallGrade}
            </span>
            <span className="text-xs text-slate-500">
              ({overallPercentage >= 75 ? 'Distinction' : overallPercentage >= 50 ? 'Pass' : 'Remedial'})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Institutional rating standard</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span>Courses Monitored</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {subjectBreakdowns.length}{' '}
            <span className="text-xs text-slate-400 font-normal">Subjects</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active curriculum syllabus</div>
        </div>
      </div>

      {/* Automated Strengths & Focus Areas Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Strengths */}
        <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
            <Brain className="w-4 h-4 text-emerald-600" />
            Demonstrated Academic Strengths
          </div>
          {computedStrengths.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 italic">
              Scores are currently uniform. Continuous evaluations will establish individual peak competencies.
            </p>
          ) : (
            <div className="space-y-2">
              {computedStrengths.map((st, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block">
                      {st.subjectName}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {st.highlight}
                    </span>
                  </div>
                  <Badge variant="success">{st.percentage}% (Grade {st.grade})</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Focus Areas / Weaknesses */}
        <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
            <Target className="w-4 h-4 text-amber-600" />
            Focus Areas & Recommended Intervention
          </div>
          {computedWeaknesses.length === 0 ? (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/50 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>All subjects maintain satisfactory standing above 60% threshold.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {computedWeaknesses.map((wk, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block">
                      {wk.subjectName}
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      {wk.recommendation}
                    </span>
                  </div>
                  <Badge variant="warning">{wk.percentage}% (Grade {wk.grade})</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Subject-Wise Performance & Exam Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              Subject-Wise Exam Results & Component Weightage
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluation components with normalized 30-mark CCE calculations
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {classSubjects.length} Registered Courses
          </span>
        </div>

        <div className="space-y-4">
          {subjectBreakdowns.map((sb) => (
            <div
              key={sb.subject.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Subject Title Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {sb.subject.name}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({sb.subject.code})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Instructor: {sb.teacher ? sb.teacher.name : 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      CCE Normalized (30)
                    </span>
                    <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {sb.cce.finalMarkOutOf30} / 30
                    </span>
                  </div>
                  <Badge variant={sb.cce.percentage >= 75 ? 'success' : sb.cce.percentage >= 50 ? 'warning' : 'danger'}>
                    {sb.cce.percentage}% • Grade {sb.grade}
                  </Badge>
                </div>
              </div>

              {/* Evaluation Levels Sub-Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/60 dark:bg-slate-850 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Evaluation Component</th>
                      <th className="py-2.5 px-3 text-center">Component Max</th>
                      <th className="py-2.5 px-3 text-center">Score Obtained</th>
                      <th className="py-2.5 px-3 text-center">Score %</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sb.levelDetails.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 px-4 text-center text-slate-400 italic">
                          No evaluation rubrics defined for this subject yet.
                        </td>
                      </tr>
                    ) : (
                      sb.levelDetails.map((ld) => (
                        <tr
                          key={ld.level.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {ld.level.name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {ld.max}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {ld.isEntered ? ld.obtained : <span className="text-slate-400 font-normal">-</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold">
                            {ld.isEntered ? (
                              <span
                                className={
                                  ld.percentage >= 75
                                    ? 'text-emerald-600'
                                    : ld.percentage >= 50
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                                }
                              >
                                {ld.percentage}%
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {ld.isEntered ? (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Recorded
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Pending Assessment
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Class Teacher Notes & Observations (Interactive Form / Dossier Section) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              Class Teacher Observations, Counseling & Recommendations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Official institutional feedback and qualitative student trajectory review
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canEditNotes ? (
              <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg flex items-center gap-1">
                <Edit3 className="w-3 h-3 text-amber-600" /> Editing Authorized
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg">
                Official Read-Only Dossier
              </span>
            )}
          </div>
        </div>

        {saveStatus && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
              saveStatus.includes('Error')
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
            }`}
          >
            {saveStatus.includes('Error') ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{saveStatus}</span>
          </div>
        )}

        <form onSubmit={handleSaveNotes} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                General Classroom Observations
              </label>
              <textarea
                rows={3}
                disabled={!canEditNotes}
                value={generalObservations}
                onChange={(e) => setGeneralObservations(e.target.value)}
                placeholder="Document active classroom participation, teamwork, and overall engagement..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-600 dark:disabled:text-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Identified Strengths
              </label>
              <textarea
                rows={3}
                disabled={!canEditNotes}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Key intellectual, creative, or interpersonal competencies..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-600 dark:disabled:text-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Focus Areas for Improvement
              </label>
              <textarea
                rows={3}
                disabled={!canEditNotes}
                value={areasOfImprovement}
                onChange={(e) => setAreasOfImprovement(e.target.value)}
                placeholder="Identified academic gaps, time management, or revision focus..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-600 dark:disabled:text-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Behavior & Disciplinary Conduct Remarks
              </label>
              <textarea
                rows={3}
                disabled={!canEditNotes}
                value={behaviorRemarks}
                onChange={(e) => setBehaviorRemarks(e.target.value)}
                placeholder="Institutional protocol adherence, ethics, and mutual respect..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-600 dark:disabled:text-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Counseling & Mentorship Logs
              </label>
              <textarea
                rows={3}
                disabled={!canEditNotes}
                value={counselingNotes}
                onChange={(e) => setCounselingNotes(e.target.value)}
                placeholder="One-on-one advising sessions, personal development goals..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-600 dark:disabled:text-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Formal Recommendations & Action Plan
              </label>
              <textarea
                rows={3}
                disabled={!canEditNotes}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Target honors, remedial peer study groups, competition nominations..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-600 dark:disabled:text-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {canEditNotes && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                {initialNotes.lastUpdated ? (
                  <span>
                    Last recorded by <strong>{initialNotes.updatedByName || 'Faculty'}</strong> on{' '}
                    {new Date(initialNotes.lastUpdated).toLocaleDateString()}
                  </span>
                ) : (
                  <span>Initial class teacher observation draft</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Class Teacher Notes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
