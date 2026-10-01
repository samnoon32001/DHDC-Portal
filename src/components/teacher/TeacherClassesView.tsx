import React, { useState } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { School, Users, BookOpen, ShieldCheck, Eye } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export const TeacherClassesView: React.FC = () => {
  const { currentUser } = useAuth();
  const state = dataService.getState();

  const teacher = state.teachers.find(
    (t) => t.username === currentUser?.username || t.email === currentUser?.email
  );

  const teacherId = teacher?.id || '';
  const assignedSubjects = state.subjects.filter(
    (s) => s.assignedTeacherId === teacherId || teacher?.assignedSubjectIds?.includes(s.id)
  );

  const assignedClassIds = Array.from(
    new Set([
      ...(teacher?.assignedClassIds || []),
      ...assignedSubjects.map((s) => s.classId),
    ])
  );

  const classes = state.classes.filter((c) => assignedClassIds.includes(c.id));
  const [viewingClass, setViewingClass] = useState<any | null>(null);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <School className="w-6 h-6 text-blue-600" />
          My Assigned Teaching Classes
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Classes where you teach subjects or have been designated as Class Teacher
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400">
            No classes assigned to your profile yet.
          </div>
        ) : (
          classes.map((cls) => {
            const isCT = cls.classTeacherId === teacherId;
            const students = state.students.filter((s) => s.classId === cls.id);
            const mySubsInClass = assignedSubjects.filter((s) => s.classId === cls.id);

            return (
              <div
                key={cls.id}
                className={`bg-white dark:bg-slate-800/80 rounded-2xl p-6 border shadow-xs flex flex-col justify-between ${
                  isCT
                    ? 'border-amber-300 dark:border-amber-700/80 bg-gradient-to-b from-amber-50/20 to-white dark:to-slate-800'
                    : 'border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {cls.name}
                      </h2>
                      <span className="text-xs text-slate-500">
                        Academic Year: {cls.academicYear}
                      </span>
                    </div>
                    {isCT && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        Class Teacher
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Enrolled Students:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {students.length} students
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                      <span className="text-slate-500 flex items-center gap-1.5 mb-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Subjects Taught by You:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {mySubsInClass.length === 0 ? (
                          <span className="text-slate-400 italic">None (Class Teacher role only)</span>
                        ) : (
                          mySubsInClass.map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold"
                            >
                              {s.name} ({s.code})
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => setViewingClass(cls)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Student Roster
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Student Roster Modal */}
      {viewingClass && (
        <Modal
          isOpen={true}
          onClose={() => setViewingClass(null)}
          title={`Student Roster — ${viewingClass.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Ad.No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {state.students
                    .filter((s) => s.classId === viewingClass.id)
                    .map((std) => (
                      <tr key={std.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">
                          {std.admissionNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {std.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">@{std.username}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={std.status === 'active' ? 'success' : 'neutral'}>
                            {std.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingClass(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
