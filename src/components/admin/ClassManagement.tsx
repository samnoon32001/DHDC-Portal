import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import type { ClassRoom } from '../../types';
import {
  School,
  Plus,
  Edit2,
  Trash2,
  Users,
  BookOpen,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Badge } from '../common/Badge';

export const ClassManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setRerender((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassRoom | null>(null);
  const [viewingStudentsClass, setViewingStudentsClass] = useState<ClassRoom | null>(null);
  const [viewingSubjectsClass, setViewingSubjectsClass] = useState<ClassRoom | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formAcademicYear, setFormAcademicYear] = useState('2025-2026');
  const [formClassTeacherId, setFormClassTeacherId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingClass(null);
    setFormName('');
    setFormAcademicYear(state.currentAcademicYear || '2025-2026');
    setFormClassTeacherId('');
    setFormStatus('active');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (c: ClassRoom) => {
    setEditingClass(c);
    setFormName(c.name);
    setFormAcademicYear(c.academicYear);
    setFormClassTeacherId(c.classTeacherId || '');
    setFormStatus(c.status);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Class name is required (e.g. Class 10A).');
      return;
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    if (editingClass) {
      dataService.updateClass(
        editingClass.id,
        {
          name: cleanName,
          academicYear: formAcademicYear,
          classTeacherId: formClassTeacherId || undefined,
          status: formStatus,
        },
        actor
      );

      // Update teacher profile assignment
      if (formClassTeacherId) {
        const teacher = state.teachers.find((t) => t.id === formClassTeacherId);
        if (teacher && !teacher.classTeacherOfClassIds.includes(editingClass.id)) {
          dataService.updateTeacher(
            teacher.id,
            {
              classTeacherOfClassIds: [...teacher.classTeacherOfClassIds, editingClass.id],
            },
            actor
          );
        }
      }
    } else {
      const createdClass = dataService.addClass(
        {
          name: cleanName,
          academicYear: formAcademicYear,
          classTeacherId: formClassTeacherId || undefined,
          status: formStatus,
        },
        actor
      );

      if (formClassTeacherId) {
        const teacher = state.teachers.find((t) => t.id === formClassTeacherId);
        if (teacher) {
          dataService.updateTeacher(
            teacher.id,
            {
              classTeacherOfClassIds: [...teacher.classTeacherOfClassIds, createdClass.id],
            },
            actor
          );
        }
      }
    }

    setIsAddEditModalOpen(false);
    setRerender((v) => v + 1);
  };

  const handleDeleteConfirm = () => {
    if (!deletingClass) return;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    dataService.deleteClass(deletingClass.id, actor);
    setDeletingClass(null);
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <School className="w-6 h-6 text-amber-600" />
            Class Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Define grade sections, appoint Class Teachers, and manage enrolled cohorts
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.classes.map((cls) => {
          const students = state.students.filter((s) => s.classId === cls.id);
          const subjects = state.subjects.filter((s) => s.classId === cls.id);
          const classTeacher = state.teachers.find((t) => t.id === cls.classTeacherId);

          return (
            <div
              key={cls.id}
              className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:border-amber-400/60 transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {cls.name}
                    </h2>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                      Academic Year: {cls.academicYear}
                    </span>
                  </div>
                  <Badge variant={cls.status === 'active' ? 'success' : 'neutral'}>
                    {cls.status}
                  </Badge>
                </div>

                {/* Class Teacher row */}
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Class Teacher
                  </span>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {classTeacher ? classTeacher.name : <span className="text-slate-400 italic">Not Assigned</span>}
                  </div>
                  {classTeacher && (
                    <div className="text-[11px] text-slate-400">
                      @{classTeacher.username} • {classTeacher.email}
                    </div>
                  )}
                </div>

                {/* Quick Enrolment Counters */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => setViewingStudentsClass(cls)}
                    className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30 text-left hover:bg-blue-100/60 transition group"
                  >
                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-medium">
                      <span>Students</span>
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-200 mt-1">
                      {students.length}
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 group-hover:underline">
                      View Roster →
                    </span>
                  </button>

                  <button
                    onClick={() => setViewingSubjectsClass(cls)}
                    className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/30 text-left hover:bg-purple-100/60 transition group"
                  >
                    <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 font-medium">
                      <span>Subjects</span>
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-bold text-purple-800 dark:text-purple-200 mt-1">
                      {subjects.length}
                    </div>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 group-hover:underline">
                      View Subjects →
                    </span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Created: {cls.createdDate}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(cls)}
                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    title="Edit Class"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingClass(cls)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Class Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingClass ? `Edit Class: ${editingClass.name}` : 'Add New Class'}
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg text-xs bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Class Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Class 10A, Class 8B"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Academic Year *
            </label>
            <select
              value={formAcademicYear}
              onChange={(e) => setFormAcademicYear(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500"
            >
              {state.academicYears.map((ay) => (
                <option key={ay.id} value={ay.year}>
                  {ay.year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Assign Class Teacher (Optional)
            </label>
            <select
              value={formClassTeacherId}
              onChange={(e) => setFormClassTeacherId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- No Class Teacher Assigned --</option>
              {state.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (@{t.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddEditModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
            >
              {editingClass ? 'Save Changes' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Enrolled Students Modal */}
      {viewingStudentsClass && (
        <Modal
          isOpen={true}
          onClose={() => setViewingStudentsClass(null)}
          title={`Enrolled Students in ${viewingStudentsClass.name}`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            {state.students.filter((s) => s.classId === viewingStudentsClass.id).length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No students currently enrolled in this class.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase">
                      <th className="py-2 px-3">Ad.No</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">Username</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {state.students
                      .filter((s) => s.classId === viewingStudentsClass.id)
                      .map((std) => (
                        <tr key={std.id}>
                          <td className="py-2 px-3 font-mono font-semibold text-blue-600">
                            {std.admissionNumber}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {std.name}
                          </td>
                          <td className="py-2 px-3 text-slate-500">@{std.username}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={std.status === 'active' ? 'success' : 'neutral'}>
                              {std.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingStudentsClass(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Class Subjects Modal */}
      {viewingSubjectsClass && (
        <Modal
          isOpen={true}
          onClose={() => setViewingSubjectsClass(null)}
          title={`Subjects in ${viewingSubjectsClass.name}`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            {state.subjects.filter((s) => s.classId === viewingSubjectsClass.id).length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No subjects assigned to this class yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.subjects
                  .filter((s) => s.classId === viewingSubjectsClass.id)
                  .map((sub) => {
                    const teacher = state.teachers.find((t) => t.id === sub.assignedTeacherId);
                    const levels = state.evaluationLevels.filter((l) => l.subjectId === sub.id);
                    return (
                      <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                            {sub.name}{' '}
                            <span className="text-xs font-normal text-slate-400 font-mono">
                              ({sub.code})
                            </span>
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            Teacher:{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {teacher?.name || 'Unassigned'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                            {levels.length} Evaluation Levels
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingSubjectsClass(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingClass && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingClass(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Class: ${deletingClass.name}`}
          message={`Are you sure you want to delete ${deletingClass.name}?\n\nStudents assigned to this class will be unassigned.`}
          confirmText="Yes, Delete Class"
          isDestructive={true}
        />
      )}
    </div>
  );
};
