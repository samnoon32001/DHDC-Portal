import React from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Layers, CheckSquare, Sliders, Plus } from 'lucide-react';
import type { NavSection } from '../layout/Sidebar';

export const TeacherSubjectsView: React.FC<{ onNavigate: (section: NavSection) => void }> = ({
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const state = dataService.getState();

  const teacher = state.teachers.find(
    (t) => t.username === currentUser?.username || t.email === currentUser?.email
  );

  const teacherId = teacher?.id || '';
  const assignedSubjects = state.subjects.filter(
    (s) => s.assignedTeacherId === teacherId || teacher?.assignedSubjectIds?.includes(s.id)
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            My Assigned Subjects
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Curriculum subjects and CCE evaluation schemas assigned to you
          </p>
        </div>

        <button
          onClick={() => onNavigate('evaluation-levels')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition shrink-0 cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          Manage Evaluation Levels
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assignedSubjects.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">No subjects currently assigned to your instructor profile.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please contact your institutional administrator to assign curriculum subjects.</p>
          </div>
        ) : (
          assignedSubjects.map((sub) => {
            const cls = state.classes.find((c) => c.id === sub.classId);
            const levels = state.evaluationLevels
              .filter((l) => l.subjectId === sub.id)
              .sort((a, b) => a.displayOrder - b.displayOrder);
            const students = state.students.filter((s) => s.classId === sub.classId);
            const marksRecorded = state.marks.filter((m) => m.subjectId === sub.id).length;
            const totalMaxMark = levels.reduce((acc, l) => acc + (l.maxMark || l.maximumMark || 0), 0);

            return (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-2.5 py-1 rounded-md">
                      {sub.code}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      Class: {cls?.name || 'Class'}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {sub.name}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {students.length} Enrolled Students • {marksRecorded} Total Evaluation Entries
                  </p>

                  {/* Evaluation Levels Pill List */}
                  <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2.5">
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
                        <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        CCE Evaluation Structure ({levels.length} Levels):
                      </span>
                      <span className="text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                        Sum Max: {totalMaxMark}
                      </span>
                    </div>

                    {levels.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">No evaluation levels defined yet.</p>
                        <button
                          onClick={() => onNavigate('evaluation-levels')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-md border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Levels
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {levels.map((lvl) => (
                          <div
                            key={lvl.id}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {lvl.name}
                            </span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Max: {lvl.maxMark || lvl.maximumMark}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    Weightage: 30 Marks
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('evaluation-levels')}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs transition cursor-pointer"
                    >
                      <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      Configure Levels
                    </button>
                    <button
                      onClick={() => onNavigate('mark-entry')}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Open Mark Entry
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

