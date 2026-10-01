import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import type { Teacher } from '../../types';
import {
  GraduationCap,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Copy,
  Check,
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Badge } from '../common/Badge';

export const TeacherManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setRerender((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Bulk Selection State
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [viewingCredentialsTeacher, setViewingCredentialsTeacher] = useState<Teacher | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [newQuickPassword, setNewQuickPassword] = useState('');
  const [quickPasswordMsg, setQuickPasswordMsg] = useState<string | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('teacher123');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formAssignedClassIds, setFormAssignedClassIds] = useState<string[]>([]);
  const [formAssignedSubjectIds, setFormAssignedSubjectIds] = useState<string[]>([]);
  const [formClassTeacherOfClassIds, setFormClassTeacherOfClassIds] = useState<string[]>([]);
  const [formSelectedSubjectToAdd, setFormSelectedSubjectToAdd] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTeachers = state.teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'ALL' || t.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const openAddModal = () => {
    setEditingTeacher(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('teacher123');
    setFormStatus('active');
    setFormAssignedClassIds([]);
    setFormAssignedSubjectIds([]);
    setFormClassTeacherOfClassIds([]);
    setFormSelectedSubjectToAdd('');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormName(teacher.name);
    setFormPhone(teacher.phone);
    setFormEmail(teacher.email);
    setFormUsername(teacher.username);
    const creds = dataService.getTeacherCredentials(teacher.id);
    setFormPassword(creds?.password || '');
    setFormStatus(teacher.status);
    setFormAssignedClassIds(teacher.assignedClassIds || []);
    setFormAssignedSubjectIds(teacher.assignedSubjectIds || []);
    setFormClassTeacherOfClassIds(teacher.classTeacherOfClassIds || []);
    setFormSelectedSubjectToAdd('');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim();
    const cleanUsername = formUsername.trim() || cleanEmail.split('@')[0];

    if (!cleanName || !cleanEmail || !cleanUsername) {
      setFormError('Full name, email, and username are required.');
      return;
    }

    // Check unique username
    const duplicateUsername = state.teachers.find(
      (t) =>
        t.username.toLowerCase() === cleanUsername.toLowerCase() &&
        t.id !== editingTeacher?.id
    );
    if (duplicateUsername) {
      setFormError(`Username "${cleanUsername}" is already used by ${duplicateUsername.name}.`);
      return;
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    if (editingTeacher) {
      dataService.updateTeacher(
        editingTeacher.id,
        {
          name: cleanName,
          phone: formPhone.trim(),
          email: cleanEmail,
          username: cleanUsername,
          status: formStatus,
          assignedClassIds: formAssignedClassIds,
          assignedSubjectIds: formAssignedSubjectIds,
          classTeacherOfClassIds: formClassTeacherOfClassIds,
        },
        formPassword.trim() ? formPassword.trim() : undefined,
        actor
      );

      // Also update classes classTeacherId
      state.classes.forEach((c) => {
        if (formClassTeacherOfClassIds.includes(c.id)) {
          dataService.updateClass(c.id, { classTeacherId: editingTeacher.id }, actor);
        } else if (c.classTeacherId === editingTeacher.id) {
          dataService.updateClass(c.id, { classTeacherId: undefined }, actor);
        }
      });
    } else {
      const createdTeacher = dataService.addTeacher(
        {
          name: cleanName,
          phone: formPhone.trim(),
          email: cleanEmail,
          username: cleanUsername,
          status: formStatus,
          assignedClassIds: formAssignedClassIds,
          assignedSubjectIds: formAssignedSubjectIds,
          classTeacherOfClassIds: formClassTeacherOfClassIds,
        },
        formPassword || 'teacher123',
        actor
      );

      // Update class teacher assignment on class entities
      formClassTeacherOfClassIds.forEach((classId) => {
        dataService.updateClass(classId, { classTeacherId: createdTeacher.id }, actor);
      });
    }

    setIsAddEditModalOpen(false);
    setRerender((v) => v + 1);
  };

  const handleDeleteConfirm = () => {
    if (!deletingTeacher) return;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    dataService.deleteTeacher(deletingTeacher.id, actor);
    setDeletingTeacher(null);
    setRerender((v) => v + 1);
  };

  // Bulk Actions Handlers
  const handleToggleSelectAll = () => {
    if (selectedTeacherIds.length === filteredTeachers.length && filteredTeachers.length > 0) {
      setSelectedTeacherIds([]);
    } else {
      setSelectedTeacherIds(filteredTeachers.map((t) => t.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkActivate = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.bulkUpdateTeachersStatus(selectedTeacherIds, 'active', actor);
    setSelectedTeacherIds([]);
    setRerender((v) => v + 1);
  };

  const handleBulkDeactivate = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.bulkUpdateTeachersStatus(selectedTeacherIds, 'inactive', actor);
    setSelectedTeacherIds([]);
    setRerender((v) => v + 1);
  };

  const handleBulkDeleteConfirm = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.bulkDeleteTeachers(selectedTeacherIds, actor);
    setSelectedTeacherIds([]);
    setIsBulkDeleteModalOpen(false);
    setRerender((v) => v + 1);
  };

  const isAllSelected =
    filteredTeachers.length > 0 &&
    filteredTeachers.every((t) => selectedTeacherIds.includes(t.id));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-600" />
            Teacher Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage teaching faculty, subject allocations, and Class Teacher appointments
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Teacher
        </button>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedTeacherIds.length > 0 && (
        <div className="p-3 sm:p-4 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white text-xs font-bold font-mono">
              {selectedTeacherIds.length} Selected
            </span>
            <span className="text-xs text-purple-900 dark:text-purple-200 font-medium">
              Actions for selected teachers:
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleBulkActivate}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            >
              Set Active
            </button>
            <button
              onClick={handleBulkDeactivate}
              className="px-2.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            >
              Set Inactive
            </button>

            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>

            <button
              onClick={() => setSelectedTeacherIds([])}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-purple-100/60 dark:hover:bg-purple-900/40 cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search teachers by name, email, username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span>Status:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Status ({state.teachers.length})</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Teacher Listing Table strictly matching Section 5 */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all teachers"
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3 w-14 text-center">SI. No</th>
                <th className="py-3.5 px-4">Teacher</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Subjects</th>
                <th className="py-3.5 px-4">Class Teacher Of</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No teachers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => {
                  const assignedSubs = state.subjects.filter(
                    (s) =>
                      s.assignedTeacherId === teacher.id ||
                      teacher.assignedSubjectIds?.includes(s.id)
                  );
                  const classTeacherClasses = state.classes.filter(
                    (c) =>
                      c.classTeacherId === teacher.id ||
                      teacher.classTeacherOfClassIds?.includes(c.id)
                  );
                  const isSelected = selectedTeacherIds.includes(teacher.id);

                  return (
                    <tr
                      key={teacher.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-purple-50/70 dark:bg-purple-950/40'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(teacher.id)}
                          aria-label={`Select teacher ${teacher.name}`}
                          className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {teacher.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          @{teacher.username} • {teacher.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {teacher.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {assignedSubs.length === 0 ? (
                            <span className="text-xs text-slate-400">No subjects assigned</span>
                          ) : (
                            assignedSubs.map((sub) => {
                              const cls = state.classes.find((c) => c.id === sub.classId);
                              return (
                                <span
                                  key={sub.id}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                >
                                  {sub.name} {cls ? `(${cls.name})` : ''}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {classTeacherClasses.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {classTeacherClasses.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium"
                              >
                                <ShieldCheck className="w-3 h-3 text-amber-600" />
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={teacher.status === 'active' ? 'success' : 'neutral'}>
                          {teacher.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setViewingCredentialsTeacher(teacher);
                              const creds = dataService.getTeacherCredentials(teacher.id);
                              setNewQuickPassword(creds?.password || 'teacher123');
                              setQuickPasswordMsg(null);
                              setCopiedCredentials(false);
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                            title="Teacher Login Credentials"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingTeacher(teacher)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                            title="View Teacher Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(teacher)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                            title="Edit Teacher"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingTeacher(teacher)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Teacher"
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

      {/* Add / Edit Teacher Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingTeacher ? `Edit Teacher: ${editingTeacher.name}` : 'Add New Teacher'}
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg text-xs bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Ms. Sarah Connor"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Assigned Subjects (CRUD) */}
          <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Assigned Subjects ({formAssignedSubjectIds.length})
              </label>
              <span className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                Add or remove subjects for this teacher
              </span>
            </div>

            {/* List of currently assigned subjects with Close (X) icon to remove */}
            <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-900/60 items-center">
              {formAssignedSubjectIds.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No subjects assigned yet. Select below and click + to add.</span>
              ) : (
                formAssignedSubjectIds.map((subId) => {
                  const sub = state.subjects.find((s) => s.id === subId);
                  const cls = sub ? state.classes.find((c) => c.id === sub.classId) : null;
                  return (
                    <span
                      key={subId}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 shadow-2xs"
                    >
                      <span>
                        {sub?.name || 'Unknown Subject'} {cls ? `(${cls.name})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormAssignedSubjectIds(formAssignedSubjectIds.filter((id) => id !== subId));
                        }}
                        className="p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded transition-colors cursor-pointer"
                        title={`Remove ${sub?.name || 'subject'}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Subject Selector and + Add Button */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={formSelectedSubjectToAdd}
                onChange={(e) => setFormSelectedSubjectToAdd(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Select a subject to assign --</option>
                {state.subjects
                  .filter((s) => !formAssignedSubjectIds.includes(s.id))
                  .map((s) => {
                    const cls = state.classes.find((c) => c.id === s.classId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({cls?.name || 'No Class'} • {s.code})
                      </option>
                    );
                  })}
              </select>

              <button
                type="button"
                disabled={!formSelectedSubjectToAdd}
                onClick={() => {
                  if (formSelectedSubjectToAdd && !formAssignedSubjectIds.includes(formSelectedSubjectToAdd)) {
                    setFormAssignedSubjectIds([...formAssignedSubjectIds, formSelectedSubjectToAdd]);
                    setFormSelectedSubjectToAdd('');
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  formSelectedSubjectToAdd
                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
                title="Add Subject to Teacher"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Class Teacher Responsibility Assignment */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
            <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Class Teacher Assignment (Optional)
            </label>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-2">
              Class Teachers receive read-only oversight to view all subject marks for their assigned class.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {state.classes.map((cls) => {
                const isAssigned = formClassTeacherOfClassIds.includes(cls.id);
                return (
                  <label
                    key={cls.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormClassTeacherOfClassIds([...formClassTeacherOfClassIds, cls.id]);
                        } else {
                          setFormClassTeacherOfClassIds(
                            formClassTeacherOfClassIds.filter((id) => id !== cls.id)
                          );
                        }
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {cls.name} ({cls.academicYear})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Login Username
              </label>
              <input
                type="text"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="e.g. robert.vance"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {editingTeacher ? 'Reset Password (Leave blank to keep)' : 'Temporary Password'}
              </label>
              <input
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="teacher123"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>
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
              className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
            >
              {editingTeacher ? 'Save Changes' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Teacher Details & Level Completion Modal */}
      {viewingTeacher && (() => {
        const assignedSubs = state.subjects.filter(
          (s) =>
            s.assignedTeacherId === viewingTeacher.id ||
            viewingTeacher.assignedSubjectIds?.includes(s.id)
        );

        const classTeacherClasses = state.classes.filter(
          (c) =>
            c.classTeacherId === viewingTeacher.id ||
            viewingTeacher.classTeacherOfClassIds?.includes(c.id)
        );

        // Calculate level completion status per subject
        let totalExpectedEntries = 0;
        let totalEnteredEntries = 0;

        const subjectProgressList = assignedSubs.map((sub) => {
          const cls = state.classes.find((c) => c.id === sub.classId);
          const students = state.students.filter(
            (std) => std.classId === sub.classId && std.status === 'active'
          );
          const levels = state.evaluationLevels
            .filter((lvl) => lvl.subjectId === sub.id && lvl.status === 'active')
            .sort((a, b) => a.displayOrder - b.displayOrder);

          const levelsDetail = levels.map((lvl) => {
            const enteredMarks = state.marks.filter(
              (m) =>
                m.subjectId === sub.id &&
                m.evaluationLevelId === lvl.id &&
                students.some((std) => std.id === m.studentId)
            );
            const enteredCount = enteredMarks.length;
            const isLevelComplete = students.length > 0 && enteredCount >= students.length;
            const percent =
              students.length > 0 ? Math.round((enteredCount / students.length) * 100) : 0;

            totalExpectedEntries += students.length;
            totalEnteredEntries += enteredCount;

            return {
              level: lvl,
              enteredCount,
              totalStudents: students.length,
              isLevelComplete,
              percent,
            };
          });

          const isSubjectComplete =
            levels.length > 0 && levelsDetail.every((ld) => ld.isLevelComplete);
          const pendingLevelsCount = levelsDetail.filter((ld) => !ld.isLevelComplete).length;

          return {
            subject: sub,
            cls,
            studentsCount: students.length,
            levelsDetail,
            isSubjectComplete,
            pendingLevelsCount,
          };
        });

        const completedSubjectsCount = subjectProgressList.filter((sp) => sp.isSubjectComplete).length;
        const pendingSubjectsCount = subjectProgressList.length - completedSubjectsCount;
        const overallPercentage =
          totalExpectedEntries > 0
            ? Math.round((totalEnteredEntries / totalExpectedEntries) * 100)
            : 0;

        return (
          <Modal
            isOpen={true}
            onClose={() => setViewingTeacher(null)}
            title={`Teacher Progress Dossier: ${viewingTeacher.name}`}
            maxWidth="2xl"
          >
            <div className="space-y-5 text-sm max-h-[75vh] overflow-y-auto pr-1">
              {/* Teacher Info Card */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center font-bold font-mono text-lg text-white shadow-xs">
                    {viewingTeacher.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{viewingTeacher.name}</h3>
                      <Badge variant={viewingTeacher.status === 'active' ? 'success' : 'neutral'}>
                        {viewingTeacher.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-0.5">
                      <span>Username: <strong className="font-mono text-purple-300">@{viewingTeacher.username}</strong></span>
                      <span>•</span>
                      <span>Email: {viewingTeacher.email}</span>
                      <span>•</span>
                      <span>Phone: {viewingTeacher.phone || '—'}</span>
                    </div>
                  </div>
                </div>

                {classTeacherClasses.length > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-amber-300 font-semibold block flex items-center justify-end gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Class Teacher
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {classTeacherClasses.map((c) => c.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Completion Overview Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  assignedSubs.length === 0
                    ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : pendingSubjectsCount === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {pendingSubjectsCount === 0 && assignedSubs.length > 0 ? (
                    <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-8 h-8 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {assignedSubs.length === 0
                        ? 'No Subjects Assigned to this Teacher'
                        : pendingSubjectsCount === 0
                        ? 'All Evaluation Levels Fully Completed!'
                        : `${pendingSubjectsCount} of ${assignedSubs.length} Subjects Pending Mark Entry`}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {assignedSubs.length === 0
                        ? 'Assign subjects from the Subject Management or Edit Teacher modal.'
                        : `${totalEnteredEntries} of ${totalExpectedEntries} total student-level marks entered (${overallPercentage}% overall completion).`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-center px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Completed</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {completedSubjectsCount}
                    </span>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pending</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                      {pendingSubjectsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {assignedSubs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Overall Mark Entry Completion</span>
                    <span className="font-mono">{overallPercentage}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        overallPercentage === 100 ? 'bg-emerald-600' : 'bg-purple-600'
                      }`}
                      style={{ width: `${overallPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Subject Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pt-1">
                  <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Assigned Subjects & Level Completion Breakdown
                  </h4>
                </div>

                {subjectProgressList.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    No subjects assigned yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjectProgressList.map((sp) => (
                      <div
                        key={sp.subject.id}
                        className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
                      >
                        {/* Subject Top Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {sp.subject.name}
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                                {sp.subject.code}
                              </span>
                              <span className="text-xs text-slate-500">
                                Class: <strong>{sp.cls?.name || 'Unassigned'}</strong> ({sp.studentsCount} Students)
                              </span>
                            </div>
                          </div>

                          <div>
                            {sp.isSubjectComplete ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                All Levels Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                {sp.pendingLevelsCount} Level{sp.pendingLevelsCount > 1 ? 's' : ''} Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Level Table */}
                        {sp.levelsDetail.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-1">
                            No evaluation levels configured for this subject.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                  <th className="pb-2 font-medium">Evaluation Level</th>
                                  <th className="pb-2 text-center font-medium">Max Mark</th>
                                  <th className="pb-2 text-center font-medium">Evaluated Students</th>
                                  <th className="pb-2 text-right font-medium">Level Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {sp.levelsDetail.map(({ level, enteredCount, totalStudents, isLevelComplete, percent }) => (
                                  <tr key={level.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                    <td className="py-2 text-slate-800 dark:text-slate-200 font-medium">
                                      {level.name}
                                    </td>
                                    <td className="py-2 text-center text-slate-500 font-mono">
                                      {level.maximumMark || level.maxMark || 25}
                                    </td>
                                    <td className="py-2 text-center font-mono">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {enteredCount}
                                      </span>
                                      <span className="text-slate-400"> / {totalStudents}</span>
                                      <span className="text-[10px] text-slate-400 ml-1.5">({percent}%)</span>
                                    </td>
                                    <td className="py-2 text-right">
                                      {isLevelComplete ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5" /> Complete
                                        </span>
                                      ) : (
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                                          {totalStudents - enteredCount} pending
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setViewingTeacher(null)}
                  className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Teacher Credentials Modal */}
      {viewingCredentialsTeacher && (
        <Modal
          isOpen={true}
          onClose={() => setViewingCredentialsTeacher(null)}
          title={`Login Credentials: ${viewingCredentialsTeacher.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-2.5">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  Super Admin Credential Authority
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Teachers log in using the credentials managed here. You can copy these details or set a new password.
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Portal Login URL / Role
                </label>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  DHDC Portal &gt; Teacher Tab
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Assigned Username
                </label>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{viewingCredentialsTeacher.username}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">
                    Email: {viewingCredentialsTeacher.email}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Current Password / Update Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuickPassword}
                    onChange={(e) => setNewQuickPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newQuickPassword.trim()) return;
                      const actor = currentUser
                        ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
                        : undefined;
                      dataService.updateTeacher(
                        viewingCredentialsTeacher.id,
                        {},
                        newQuickPassword.trim(),
                        actor
                      );
                      setQuickPasswordMsg('Password updated successfully!');
                      setTimeout(() => setQuickPasswordMsg(null), 3000);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shrink-0"
                  >
                    Save Password
                  </button>
                </div>
                {quickPasswordMsg && (
                  <p className="mt-1 text-[11px] text-emerald-600 font-medium">{quickPasswordMsg}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const text = `Portal: CCE Evaluation Portal (Teacher Tab)\nUsername: ${viewingCredentialsTeacher.username}\nPassword: ${newQuickPassword}\nEmail: ${viewingCredentialsTeacher.email}`;
                  navigator.clipboard.writeText(text);
                  setCopiedCredentials(true);
                  setTimeout(() => setCopiedCredentials(false), 2500);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition"
              >
                {copiedCredentials ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Login Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewingCredentialsTeacher(null)}
                className="px-4 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingTeacher && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingTeacher(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Teacher: ${deletingTeacher.name}`}
          message={`Are you sure you want to remove ${deletingTeacher.name}?\n\nTheir login credentials will be revoked and subject assignments unlinked.`}
          confirmText="Yes, Delete Teacher"
          isDestructive={true}
        />
      )}

      {/* Bulk Delete Confirmation */}
      {isBulkDeleteModalOpen && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDeleteConfirm}
          title={`Delete ${selectedTeacherIds.length} Teachers`}
          message={`Are you sure you want to delete the ${selectedTeacherIds.length} selected teachers?\n\nTheir login credentials will be revoked and subject assignments unlinked.`}
          confirmText="Yes, Delete Selected"
          isDestructive={true}
        />
      )}
    </div>
  );
};
