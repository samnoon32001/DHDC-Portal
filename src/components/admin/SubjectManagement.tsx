import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import type { Subject } from '../../types';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Badge } from '../common/Badge';
import type { NavSection } from '../layout/Sidebar';

export const SubjectManagement: React.FC<{ onNavigate?: (section: NavSection) => void }> = ({
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setRerender((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formAssignedTeacherId, setFormAssignedTeacherId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredSubjects = state.subjects.filter((s) => {
    return selectedClassFilter === 'ALL' || s.classId === selectedClassFilter;
  });

  const openAddModal = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
    setFormClassId(state.classes[0]?.id || '');
    setFormAssignedTeacherId('');
    setFormStatus('active');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setFormName(sub.name);
    setFormCode(sub.code);
    setFormClassId(sub.classId);
    setFormAssignedTeacherId(sub.assignedTeacherId || '');
    setFormStatus(sub.status);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    const cleanCode = formCode.trim().toUpperCase();

    if (!cleanName || !cleanCode || !formClassId) {
      setFormError('Subject Name, Code, and Class assignment are required.');
      return;
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    if (editingSubject) {
      dataService.updateSubject(
        editingSubject.id,
        {
          name: cleanName,
          code: cleanCode,
          classId: formClassId,
          assignedTeacherId: formAssignedTeacherId || undefined,
          status: formStatus,
        },
        actor
      );

      // Link teacher assignedSubjectIds
      if (formAssignedTeacherId) {
        const teacher = state.teachers.find((t) => t.id === formAssignedTeacherId);
        if (teacher && !teacher.assignedSubjectIds.includes(editingSubject.id)) {
          dataService.updateTeacher(
            teacher.id,
            { assignedSubjectIds: [...teacher.assignedSubjectIds, editingSubject.id] },
            actor
          );
        }
      }
    } else {
      const created = dataService.addSubject(
        {
          name: cleanName,
          code: cleanCode,
          classId: formClassId,
          assignedTeacherId: formAssignedTeacherId || undefined,
          status: formStatus,
        },
        actor
      );

      // Auto-create initial default CCE evaluation levels so user has immediate structure
      dataService.addEvaluationLevel(
        {
          subjectId: created.id,
          name: 'Unit Test 1',
          maximumMark: 25,
          maxMark: 25,
          displayOrder: 1,
          status: 'active',
        },
        actor
      );
      dataService.addEvaluationLevel(
        {
          subjectId: created.id,
          name: 'Mid Term Exam',
          maximumMark: 50,
          maxMark: 50,
          displayOrder: 2,
          status: 'active',
        },
        actor
      );
      dataService.addEvaluationLevel(
        {
          subjectId: created.id,
          name: 'Final Project / CCE Assignment',
          maximumMark: 25,
          maxMark: 25,
          displayOrder: 3,
          status: 'active',
        },
        actor
      );

      if (formAssignedTeacherId) {
        const teacher = state.teachers.find((t) => t.id === formAssignedTeacherId);
        if (teacher) {
          dataService.updateTeacher(
            teacher.id,
            { assignedSubjectIds: [...teacher.assignedSubjectIds, created.id] },
            actor
          );
        }
      }
    }

    setIsAddEditModalOpen(false);
    setRerender((v) => v + 1);
  };

  const handleDeleteConfirm = () => {
    if (!deletingSubject) return;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    dataService.deleteSubject(deletingSubject.id, actor);
    setDeletingSubject(null);
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-rose-600" />
            Subject Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Define curriculum subjects, allocate instructors, and configure CCE evaluations
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {/* Class Filter bar */}
      <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium">Filter by Class:</span>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Classes ({state.subjects.length} Subjects)</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({state.subjects.filter((s) => s.classId === c.id).length} subjects)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('evaluation-levels')}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Sliders className="w-3.5 h-3.5" />
          Manage All Evaluation Levels →
        </button>
      </div>

      {/* Subjects Table */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-16 text-center">SI. No</th>
                <th className="py-3.5 px-4">Subject Name</th>
                <th className="py-3.5 px-4">Subject Code</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Assigned Teacher</th>
                <th className="py-3.5 px-4 text-center">CCE Levels</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No subjects found for this selection.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub, idx) => {
                  const classRoom = state.classes.find((c) => c.id === sub.classId);
                  const teacher = state.teachers.find((t) => t.id === sub.assignedTeacherId);
                  const levels = state.evaluationLevels.filter((l) => l.subjectId === sub.id);

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {sub.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-xs text-slate-600 dark:text-slate-300">
                        {sub.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {classRoom?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {teacher ? (
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {teacher.name}
                            </div>
                            <div className="text-[11px] text-slate-400">@{teacher.username}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onNavigate && onNavigate('evaluation-levels')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                          title="Manage Evaluation Levels"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          {levels.length} Levels
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={sub.status === 'active' ? 'success' : 'neutral'}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(sub)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSubject(sub)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingSubject ? `Edit Subject: ${editingSubject.name}` : 'Add New Subject'}
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
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Mathematics, Science, English Literature"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subject Code *
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. MATH10, ENG8"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-rose-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assign Class *
              </label>
              <select
                required
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-rose-500"
              >
                {state.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academicYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Assign Teacher
            </label>
            <select
              value={formAssignedTeacherId}
              onChange={(e) => setFormAssignedTeacherId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- No Teacher Assigned --</option>
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
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-rose-500"
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
              className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {deletingSubject && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingSubject(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Subject: ${deletingSubject.name}`}
          message={`Are you sure you want to delete ${deletingSubject.name} (${deletingSubject.code})?\n\nAll evaluation levels and student marks associated with this subject will be permanently removed.`}
          confirmText="Yes, Delete Subject"
          isDestructive={true}
        />
      )}
    </div>
  );
};
