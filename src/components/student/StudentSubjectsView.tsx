import React from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Layers, User } from 'lucide-react';
import type { NavSection } from '../layout/Sidebar';

export const StudentSubjectsView: React.FC<{ onNavigate: (section: NavSection) => void }> = ({
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const state = dataService.getState();

  const student = state.students.find(
    (s) =>
      s.username === currentUser?.username ||
      s.admissionNumber === currentUser?.admissionNumber
  );

  const classSubjects = student
    ? state.subjects.filter((s) => s.classId === student.classId && s.status === 'active')
    : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-purple-600" />
          My Enrolled Subjects
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Academic courses and evaluation schemas for your current grade level
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {classSubjects.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-400">
            No subjects registered for your class yet.
          </div>
        ) : (
          classSubjects.map((sub) => {
            const teacher = state.teachers.find((t) => t.id === sub.assignedTeacherId);
            const levels = state.evaluationLevels
              .filter((l) => l.subjectId === sub.id && l.status === 'active')
              .sort((a, b) => a.displayOrder - b.displayOrder);

            const totalMax = levels.reduce((acc, l) => acc + l.maxMark, 0);

            return (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md">
                      {sub.code}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Instructor: <strong className="text-slate-700 dark:text-slate-300">{teacher?.name || 'Faculty'}</strong>
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {sub.name}
                  </h2>

                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        CCE Evaluation Structure ({levels.length} Levels)
                      </span>
                      <span className="text-purple-600 font-bold">Sum Max: {totalMax}</span>
                    </div>

                    <div className="space-y-1.5">
                      {levels.map((lvl) => (
                        <div
                          key={lvl.id}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {lvl.name}
                          </span>
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                            Max: {lvl.maxMark}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">30-Mark Final Weightage</span>
                  <button
                    onClick={() => onNavigate('student-marks')}
                    className="px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                  >
                    Check My Score →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
