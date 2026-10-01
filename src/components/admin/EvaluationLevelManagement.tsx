import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import type { EvaluationLevel } from '../../types';
import type { NavSection } from '../layout/Sidebar';
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Layers,
  HelpCircle,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Badge } from '../common/Badge';

interface EvaluationLevelManagementProps {
  initialSubjectId?: string;
  onNavigate?: (section: NavSection) => void;
}

export const EvaluationLevelManagement: React.FC<EvaluationLevelManagementProps> = ({
  initialSubjectId,
  onNavigate,
}) => {
  const { currentUser, role } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  const isTeacher = role === 'teacher';

  const teacher = state.teachers.find(
    (t) => t.username === currentUser?.username || t.email === currentUser?.email
  );
  const teacherId = teacher?.id || '';

  const teacherAssignedSubjects = useMemo(() => {
    return state.subjects.filter(
      (s) => s.assignedTeacherId === teacherId || teacher?.assignedSubjectIds?.includes(s.id)
    );
  }, [state.subjects, teacherId, teacher?.assignedSubjectIds]);

  // Selected subject: prioritize initialSubjectId, then teacher's assigned subjects, then first subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId && state.subjects.some((s) => s.id === initialSubjectId)) {
      return initialSubjectId;
    }
    if (isTeacher && teacherAssignedSubjects.length > 0) {
      return teacherAssignedSubjects[0].id;
    }
    return state.subjects[0]?.id || '';
  });

  useEffect(() => {
    if (initialSubjectId && state.subjects.some((s) => s.id === initialSubjectId)) {
      setSelectedSubjectId(initialSubjectId);
    } else if (isTeacher && teacherAssignedSubjects.length > 0) {
      if (!state.subjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(teacherAssignedSubjects[0].id);
      }
    }
  }, [initialSubjectId, isTeacher, teacherAssignedSubjects, state.subjects, selectedSubjectId]);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<EvaluationLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<EvaluationLevel | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formMaxMark, setFormMaxMark] = useState(25);
  const [formDisplayOrder, setFormDisplayOrder] = useState(1);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);

  const selectedSubject = state.subjects.find((s) => s.id === selectedSubjectId);
  const selectedClass = selectedSubject
    ? state.classes.find((c) => c.id === selectedSubject.classId)
    : null;

  // Levels for this subject sorted by displayOrder
  const subjectLevels = state.evaluationLevels
    .filter((l) => l.subjectId === selectedSubjectId)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Calculate sum of max marks for this subject
  const totalMaxMarks = subjectLevels.reduce((acc, l) => acc + (l.maxMark || l.maximumMark || 0), 0);

  const openAddModal = () => {
    setEditingLevel(null);
    setFormName('');
    setFormMaxMark(25);
    setFormDisplayOrder(subjectLevels.length + 1);
    setFormStatus('active');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (level: EvaluationLevel) => {
    setEditingLevel(level);
    setFormName(level.name);
    setFormMaxMark(level.maxMark || level.maximumMark || 25);
    setFormDisplayOrder(level.displayOrder);
    setFormStatus(level.status);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Level name is required (e.g. Unit Test 1).');
      return;
    }
    if (formMaxMark <= 0) {
      setFormError('Maximum mark must be greater than 0.');
      return;
    }

    // Check if marks exist higher than new maxMark (Data validation rule)
    if (editingLevel) {
      const existingMarks = state.marks.filter((m) => m.evaluationLevelId === editingLevel.id);
      const invalidMarks = existingMarks.filter((m) => m.obtainedMark > formMaxMark);
      if (invalidMarks.length > 0) {
        setFormError(
          `Cannot reduce max mark to ${formMaxMark}: ${invalidMarks.length} student marks already exceed this value (highest is ${Math.max(
            ...invalidMarks.map((m) => m.obtainedMark)
          )}). Adjust or reset those student marks first.`
        );
        return;
      }
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    if (editingLevel) {
      dataService.updateEvaluationLevel(
        editingLevel.id,
        {
          name: cleanName,
          maximumMark: Number(formMaxMark),
          maxMark: Number(formMaxMark),
          displayOrder: Number(formDisplayOrder),
          status: formStatus,
        },
        actor
      );
    } else {
      dataService.addEvaluationLevel(
        {
          subjectId: selectedSubjectId,
          name: cleanName,
          maximumMark: Number(formMaxMark),
          maxMark: Number(formMaxMark),
          displayOrder: Number(formDisplayOrder),
          status: formStatus,
        },
        actor
      );
    }

    setIsAddEditModalOpen(false);
    setRerender((v) => v + 1);
  };

  const handleDeleteConfirm = () => {
    if (!deletingLevel) return;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    dataService.deleteEvaluationLevel(deletingLevel.id, actor);
    setDeletingLevel(null);
    setRerender((v) => v + 1);
  };

  const handleMoveOrder = (level: EvaluationLevel, direction: 'up' | 'down') => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    const currentIndex = subjectLevels.findIndex((l) => l.id === level.id);
    if (direction === 'up' && currentIndex > 0) {
      const prevLevel = subjectLevels[currentIndex - 1];
      dataService.updateEvaluationLevel(level.id, { displayOrder: prevLevel.displayOrder }, actor);
      dataService.updateEvaluationLevel(prevLevel.id, { displayOrder: level.displayOrder }, actor);
    } else if (direction === 'down' && currentIndex < subjectLevels.length - 1) {
      const nextLevel = subjectLevels[currentIndex + 1];
      dataService.updateEvaluationLevel(level.id, { displayOrder: nextLevel.displayOrder }, actor);
      dataService.updateEvaluationLevel(nextLevel.id, { displayOrder: level.displayOrder }, actor);
    }
    setRerender((v) => v + 1);
  };

  // Check how many marks exist for deletingLevel
  const marksForDeletingLevel = deletingLevel
    ? state.marks.filter((m) => m.evaluationLevelId === deletingLevel.id).length
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header matching Professional Polish Design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Evaluation Level Management (CCE)
            </h1>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Instructor Mode
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isTeacher
              ? 'Configure, add, edit, and reorder evaluation levels (Unit Tests, Mid-Terms, Assignments, Projects) for your subjects'
              : 'Configure dynamic evaluation levels, maximum marks, and display order per subject'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onNavigate && selectedSubjectId && (
            <button
              onClick={() => onNavigate('mark-entry')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs transition cursor-pointer"
            >
              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Open Mark Entry →
            </button>
          )}

          <button
            onClick={openAddModal}
            disabled={!selectedSubjectId}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Evaluation Level
          </button>
        </div>
      </div>

      {/* Subject Selector Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Select Subject for Evaluation Levels
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="mt-1 px-3 py-1.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {isTeacher && teacherAssignedSubjects.length > 0 ? (
                <>
                  <optgroup label="My Assigned Subjects">
                    {teacherAssignedSubjects.map((sub) => {
                      const c = state.classes.find((cl) => cl.id === sub.classId);
                      return (
                        <option key={sub.id} value={sub.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          {sub.name} ({sub.code}) — {c?.name || 'Class'}
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Other School Subjects">
                    {state.subjects
                      .filter((s) => !teacherAssignedSubjects.some((ts) => ts.id === s.id))
                      .map((sub) => {
                        const c = state.classes.find((cl) => cl.id === sub.classId);
                        return (
                          <option key={sub.id} value={sub.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            {sub.name} ({sub.code}) — {c?.name || 'Class'}
                          </option>
                        );
                      })}
                  </optgroup>
                </>
              ) : (
                state.subjects.map((sub) => {
                  const c = state.classes.find((cl) => cl.id === sub.classId);
                  return (
                    <option key={sub.id} value={sub.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {sub.name} ({sub.code}) — {c?.name || 'Class'}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        </div>

        {selectedSubject && (
          <div className="flex items-center gap-5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Class & Cohort</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {selectedClass?.name || '—'} ({selectedClass?.academicYear})
              </span>
            </div>
            <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
              <span className="text-[11px] text-slate-400 block font-medium">Configured Levels</span>
              <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {subjectLevels.length} Levels
              </span>
            </div>
            <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
              <span className="text-[11px] text-slate-400 block font-medium">Sum Max Marks</span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {totalMaxMarks} Marks
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CCE Weightage Explanation Note */}
      <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200">
        <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
        <div>
          <span className="font-semibold">How CCE 30-Mark Conversion Works:</span> Students receive marks for each evaluation level. The final subject CCE score is mathematically converted via:{' '}
          <span className="font-mono font-semibold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200">
            Final Mark = (Total Obtained / Total Maximum) × 30
          </span>
          . You can add any evaluation components required for your curriculum (e.g. Unit Tests, Mid-Term Exam, Practical Labs, Seminar, Assignments).
        </div>
      </div>

      {/* Evaluation Levels Table matching Professional Polish Design */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Configured Levels ({subjectLevels.length})
            </h2>
            <span className="text-xs text-slate-400 font-normal">for {selectedSubject?.name}</span>
          </div>

          <button
            onClick={openAddModal}
            disabled={!selectedSubjectId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Level
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                <th className="py-3 px-4 w-20 text-center">Order</th>
                <th className="py-3 px-4">Evaluation Level Name</th>
                <th className="py-3 px-4 text-center">Maximum Mark</th>
                <th className="py-3 px-4 text-center">Marks Recorded</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {subjectLevels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No evaluation levels defined for this subject yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Click "+ Add Evaluation Level" to configure your first evaluation component.</p>
                    <button
                      onClick={openAddModal}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add First Level
                    </button>
                  </td>
                </tr>
              ) : (
                subjectLevels.map((lvl, idx) => {
                  const marksRecorded = state.marks.filter((m) => m.evaluationLevelId === lvl.id).length;
                  const maxMarkVal = lvl.maxMark || lvl.maximumMark || 0;

                  return (
                    <tr
                      key={lvl.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 w-5">
                            #{lvl.displayOrder}
                          </span>
                          <div className="flex flex-col">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveOrder(lvl, 'up')}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === subjectLevels.length - 1}
                              onClick={() => handleMoveOrder(lvl, 'down')}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {lvl.name}
                        </span>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">ID: {lvl.id}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {maxMarkVal}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                            marksRecorded > 0
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {marksRecorded} entries
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={lvl.status === 'active' ? 'success' : 'neutral'}>
                          {lvl.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(lvl)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-md transition cursor-pointer"
                            title="Edit Level"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingLevel(lvl)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition cursor-pointer"
                            title="Delete Level"
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

      {/* Add / Edit Evaluation Level Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingLevel ? `Edit Level: ${editingLevel.name}` : 'Add New Evaluation Level'}
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-md text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Evaluation Level Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Unit Test 1, Mid Term Exam, Project Work, Seminar"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Maximum Mark *
              </label>
              <input
                type="number"
                required
                min={1}
                max={1000}
                value={formMaxMark}
                onChange={(e) => setFormMaxMark(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">e.g. 20, 25, 50, 100</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Display Order *
              </label>
              <input
                type="number"
                required
                min={1}
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsAddEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition cursor-pointer"
            >
              {editingLevel ? 'Save Changes' : 'Create Level'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog with Safety warning if marks exist */}
      {deletingLevel && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingLevel(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Level: ${deletingLevel.name}`}
          message={
            marksForDeletingLevel > 0
              ? `WARNING: ${marksForDeletingLevel} student marks currently exist for "${deletingLevel.name}".\n\nDeleting this evaluation level will remove these recorded marks and dynamically recalculate student final 30-mark totals. Are you sure?`
              : `Are you sure you want to remove the evaluation level "${deletingLevel.name}"?`
          }
          confirmText="Yes, Delete Level"
          isDestructive={true}
        />
      )}
    </div>
  );
};
