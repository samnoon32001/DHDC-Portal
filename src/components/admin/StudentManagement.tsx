import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import type { Student } from '../../types';
import { calculateCCETotal } from '../../utils/calculations';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Users,
  BookOpen,
  Award,
  CheckSquare,
  X,
  Layers,
  Check,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Badge } from '../common/Badge';
import { StudentDossierModal } from '../student/StudentDossierModal';

export const StudentManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setRerender((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Search, Filter, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Bulk Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkTargetClassId, setBulkTargetClassId] = useState<string>('');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Form inputs
  const [formAdmissionNumber, setFormAdmissionNumber] = useState('');
  const [formName, setFormName] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('student123');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter students
  const filteredStudents = state.students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      selectedClassFilter === 'ALL' || s.classId === selectedClassFilter;

    const matchesStatus =
      selectedStatusFilter === 'ALL' || s.status === selectedStatusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const openAddModal = () => {
    setEditingStudent(null);
    setFormAdmissionNumber('');
    setFormName('');
    setFormClassId(state.classes[0]?.id || '');
    setFormPhone('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('');
    setFormStatus('active');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormAdmissionNumber(student.admissionNumber);
    setFormName(student.name);
    setFormClassId(student.classId);
    setFormPhone(student.phone || '');
    setFormEmail(student.email || '');
    setFormUsername(student.username || student.admissionNumber);
    setFormPassword('');
    setFormStatus(student.status);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanAdmission = formAdmissionNumber.trim();
    const cleanName = formName.trim();
    const cleanUsername = formUsername.trim() || cleanAdmission;

    if (!cleanAdmission || !cleanName || !formClassId) {
      setFormError('Admission number, full name, and class are required.');
      return;
    }

    // Check unique admission number
    const duplicateAdmission = state.students.find(
      (s) =>
        s.admissionNumber.toLowerCase() === cleanAdmission.toLowerCase() &&
        s.id !== editingStudent?.id
    );
    if (duplicateAdmission) {
      setFormError(`Admission number "${cleanAdmission}" is already in use by ${duplicateAdmission.name}.`);
      return;
    }

    // Check unique username
    const duplicateUser = state.users.find(
      (u) =>
        u.username.toLowerCase() === cleanUsername.toLowerCase() &&
        u.admissionNumber !== editingStudent?.admissionNumber &&
        u.id !== `user-${editingStudent?.id}`
    );
    if (duplicateUser) {
      setFormError(`Username "${cleanUsername}" is already taken.`);
      return;
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    const defaultStudentPassword = `${cleanAdmission}${cleanAdmission}${cleanAdmission}`;

    if (editingStudent) {
      dataService.updateStudent(
        editingStudent.id,
        {
          admissionNumber: cleanAdmission,
          name: cleanName,
          classId: formClassId,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          username: cleanUsername,
          status: formStatus,
        },
        actor
      );

      // If a custom password was provided, update user password
      if (formPassword.trim()) {
        const user = state.users.find(
          (u) => u.id === `user-${editingStudent.id}` || u.admissionNumber === editingStudent.admissionNumber
        );
        if (user) {
          user.password = formPassword.trim();
          user.username = cleanUsername;
        }
      }
    } else {
      dataService.addStudent(
        {
          admissionNumber: cleanAdmission,
          name: cleanName,
          classId: formClassId,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          username: cleanUsername,
          status: formStatus,
        },
        formPassword.trim() || defaultStudentPassword,
        actor
      );
    }

    setIsAddEditModalOpen(false);
    setRerender((v) => v + 1);
  };

  const handleDeleteConfirm = () => {
    if (!deletingStudent) return;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    dataService.deleteStudent(deletingStudent.id, actor);
    setDeletingStudent(null);
    setRerender((v) => v + 1);
  };

  // Bulk Action Handlers
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === paginatedStudents.length && paginatedStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(paginatedStudents.map((s) => s.id));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const handleToggleRow = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkActivate = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.bulkUpdateStudentsStatus(selectedStudentIds, 'active', actor);
    setSelectedStudentIds([]);
    setRerender((v) => v + 1);
  };

  const handleBulkDeactivate = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.bulkUpdateStudentsStatus(selectedStudentIds, 'inactive', actor);
    setSelectedStudentIds([]);
    setRerender((v) => v + 1);
  };

  const handleBulkAssignClass = () => {
    if (!bulkTargetClassId) return;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.bulkAssignStudentsClass(selectedStudentIds, bulkTargetClassId, actor);
    setSelectedStudentIds([]);
    setBulkTargetClassId('');
    setRerender((v) => v + 1);
  };

  const handleBulkDeleteConfirm = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;
    dataService.bulkDeleteStudents(selectedStudentIds, actor);
    setSelectedStudentIds([]);
    setIsBulkDeleteModalOpen(false);
    setRerender((v) => v + 1);
  };

  const isAllSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedStudentIds.includes(s.id));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Student Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View, enroll, and manage student admission records and class assignments
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* Bulk Actions Toolbar (Visible when rows are selected) */}
      {selectedStudentIds.length > 0 && (
        <div className="p-3 sm:p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-bold font-mono">
              {selectedStudentIds.length} Selected
            </span>
            <span className="text-xs text-blue-900 dark:text-blue-200 font-medium">
              Actions for selected students:
            </span>
            {selectedStudentIds.length < filteredStudents.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs text-blue-700 dark:text-blue-300 underline hover:text-blue-900 cursor-pointer font-medium"
              >
                Select all {filteredStudents.length} filtered
              </button>
            )}
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

            {/* Reassign class */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkTargetClassId}
                onChange={(e) => setBulkTargetClassId(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="">Move to Class...</option>
                {state.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssignClass}
                disabled={!bulkTargetClassId}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                Move
              </button>
            </div>

            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>

            <button
              onClick={() => setSelectedStudentIds([])}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-blue-100/60 dark:hover:bg-blue-900/40 cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by admission no, name, username..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span>Class:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900"
            >
              <option value="ALL">All Classes ({state.students.length})</option>
              {state.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({state.students.filter((s) => s.classId === c.id).length})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span>Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Listing Table strictly matching Section 4 */}
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
                    aria-label="Select all students on page"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3 w-14 text-center">SI. No</th>
                <th className="py-3.5 px-4">Admission No</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No students found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((std, idx) => {
                  const siNo = (currentPage - 1) * pageSize + idx + 1;
                  const classRoom = state.classes.find((c) => c.id === std.classId);
                  const isSelected = selectedStudentIds.includes(std.id);

                  return (
                    <tr
                      key={std.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(std.id)}
                          aria-label={`Select student ${std.name}`}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-xs text-slate-500">
                        {siNo}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {std.admissionNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-100">
                          {std.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          @{std.username} {std.email ? `• ${std.email}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {classRoom ? classRoom.name : 'Unassigned'}
                        </span>
                        {classRoom && (
                          <span className="ml-1.5 text-[11px] text-slate-400">
                            ({classRoom.academicYear})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={std.status === 'active' ? 'success' : 'neutral'}>
                          {std.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingStudent(std)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                            title="View Student"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(std)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                            title="Edit Student"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(std)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete / Deactivate Student"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredStudents.length)} of{' '}
              {filteredStudents.length} students
            </div>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-lg border ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.name}` : 'Add New Student'}
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
                Admission Number *
              </label>
              <input
                type="text"
                required
                value={formAdmissionNumber}
                onChange={(e) => setFormAdmissionNumber(e.target.value)}
                placeholder="e.g. 1007"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Daniel Martinez"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assign Class *
              </label>
              <select
                required
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                {state.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academicYear})
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
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="student@school.edu"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone (Optional)
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(555) 111-0000"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-0.5">
              Systematic Student Login Rule:
            </span>
            <span className="text-emerald-700 dark:text-emerald-300">
              Username is <strong>Admission Number</strong>. Password defaults to <strong>Admission Number repeated 3 times</strong> (e.g. {formAdmissionNumber ? `${formAdmissionNumber}${formAdmissionNumber}${formAdmissionNumber}` : '100110011001'}).
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Login Username (Defaults to Admission No)
              </label>
              <input
                type="text"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder={formAdmissionNumber ? formAdmissionNumber : 'e.g. 1001'}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {editingStudent ? 'Override Password (Leave blank to keep)' : 'Custom Password (Optional)'}
              </label>
              <input
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={formAdmissionNumber ? `${formAdmissionNumber}${formAdmissionNumber}${formAdmissionNumber}` : 'e.g. 100110011001'}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
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
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              {editingStudent ? 'Save Changes' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Student Details Modal with Subjects and Marks */}
      {viewingStudent && (
        <StudentDossierModal
          student={viewingStudent}
          isOpen={true}
          onClose={() => setViewingStudent(null)}
          onSave={() => setRerender((v) => v + 1)}
        />
      )}
      {false && viewingStudent && (() => {
        const studentClass = state.classes.find((c) => c.id === viewingStudent.classId);
        const studentSubjects = state.subjects.filter((s) => s.classId === viewingStudent.classId);

        // Calculate aggregate statistics for this student
        let grandMaxMark = 0;
        let grandObtainedMark = 0;
        let grandFactor30Total = 0;
        let evaluatedSubjectsCount = 0;

        const subjectEvaluations = studentSubjects.map((subject) => {
          const teacher = state.teachers.find((t) => t.id === subject.assignedTeacherId);
          const levels = state.evaluationLevels
            .filter((l) => l.subjectId === subject.id && l.status === 'active')
            .sort((a, b) => a.displayOrder - b.displayOrder);

          const subjectMarks = state.marks.filter(
            (m) => m.studentId === viewingStudent.id && m.subjectId === subject.id
          );

          const markItems = levels.map((lvl) => {
            const m = subjectMarks.find((sm) => sm.evaluationLevelId === lvl.id);
            return {
              maximumMark: lvl.maximumMark || lvl.maxMark || 25,
              obtainedMark: m?.obtainedMark ?? null,
            };
          });

          const cceCalc = calculateCCETotal(markItems);
          const grade =
            cceCalc.percentage >= 90
              ? 'A+'
              : cceCalc.percentage >= 80
              ? 'A'
              : cceCalc.percentage >= 70
              ? 'B+'
              : cceCalc.percentage >= 60
              ? 'B'
              : cceCalc.percentage >= 50
              ? 'C+'
              : cceCalc.percentage >= 40
              ? 'C'
              : 'D';

          if (cceCalc.completedCount > 0) {
            evaluatedSubjectsCount++;
            grandMaxMark += cceCalc.totalMaximum;
            grandObtainedMark += cceCalc.totalObtained;
            grandFactor30Total += cceCalc.finalMarkOutOf30;
          }

          return {
            subject,
            teacher,
            levels,
            subjectMarks,
            cceCalc,
            grade,
          };
        });

        const overallPercentage =
          grandMaxMark > 0 ? ((grandObtainedMark / grandMaxMark) * 100).toFixed(1) : '—';

        return (
          <Modal
            isOpen={true}
            onClose={() => setViewingStudent(null)}
            title={`Student CCE Dossier: ${viewingStudent.name}`}
            maxWidth="2xl"
          >
            <div className="space-y-5 text-sm max-h-[75vh] overflow-y-auto pr-1">
              {/* Student Identification Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold font-mono text-lg text-white shadow-xs">
                    {viewingStudent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{viewingStudent.name}</h3>
                      <Badge variant={viewingStudent.status === 'active' ? 'success' : 'neutral'}>
                        {viewingStudent.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-0.5">
                      <span>Ad. No: <strong className="font-mono text-blue-300">{viewingStudent.admissionNumber}</strong></span>
                      <span>•</span>
                      <span>Class: <strong>{studentClass ? studentClass.name : 'Unassigned'}</strong></span>
                      <span>•</span>
                      <span>User: <span className="font-mono">@{viewingStudent.username}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Overall Score</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {grandFactor30Total.toFixed(1)} <span className="text-xs text-slate-400">/ 30</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Class & Year</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {studentClass ? `${studentClass.name} (${studentClass.academicYear})` : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Contact Phone</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingStudent.phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Contact Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {viewingStudent.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Enrolled Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingStudent.createdDate || '—'}
                  </span>
                </div>
              </div>

              {/* Subjects & Marks Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Subjects & Continuous Comprehensive Evaluation (CCE)
                  </h4>
                </div>
                <span className="text-xs text-slate-500">
                  {studentSubjects.length} Registered Subjects ({evaluatedSubjectsCount} with marks)
                </span>
              </div>

              {/* Subject Breakdown List */}
              {studentSubjects.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  No subjects configured for this class yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {subjectEvaluations.map(({ subject, teacher, levels, subjectMarks, cceCalc, grade }) => (
                    <div
                      key={subject.id}
                      className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
                    >
                      {/* Subject Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {subject.name}
                            </span>
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                              {subject.code}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            Teacher: {teacher?.name || 'Not assigned'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Factor 30 Score</span>
                            <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                              {cceCalc.finalMarkOutOf30.toFixed(1)} / 30
                            </span>
                          </div>
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                            {grade || '—'}
                          </div>
                        </div>
                      </div>

                      {/* Levels Table */}
                      {levels.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2">
                          No evaluation levels defined for this subject.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="pb-2 font-medium">Evaluation Level</th>
                                <th className="pb-2 text-center font-medium">Max Mark</th>
                                <th className="pb-2 text-center font-medium">Obtained</th>
                                <th className="pb-2 text-right font-medium">Score %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {levels.map((lvl) => {
                                const markRec = subjectMarks.find((m) => m.evaluationLevelId === lvl.id);
                                const hasMark = markRec !== undefined && markRec.obtainedMark !== null;
                                const max = lvl.maximumMark || lvl.maxMark || 25;
                                const obtained = hasMark ? markRec.obtainedMark : null;
                                const pct = hasMark ? (((obtained as number) / max) * 100).toFixed(0) : '—';

                                return (
                                  <tr key={lvl.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                    <td className="py-2 text-slate-700 dark:text-slate-300 font-medium">
                                      {lvl.name}
                                    </td>
                                    <td className="py-2 text-center text-slate-500 font-mono">
                                      {max}
                                    </td>
                                    <td className="py-2 text-center font-mono">
                                      {hasMark ? (
                                        <span className="font-bold text-slate-900 dark:text-white">
                                          {obtained}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">Not entered</span>
                                      )}
                                    </td>
                                    <td className="py-2 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                                      {pct !== '—' ? `${pct}%` : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Delete Confirmation Dialog */}
      {deletingStudent && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingStudent(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Student: ${deletingStudent.name}`}
          message={`Are you sure you want to remove ${deletingStudent.name} (Ad.No: ${deletingStudent.admissionNumber})?\n\nThis will remove their student record and all entered evaluation marks.`}
          confirmText="Yes, Delete Student"
          isDestructive={true}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {isBulkDeleteModalOpen && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDeleteConfirm}
          title={`Delete ${selectedStudentIds.length} Students`}
          message={`Are you sure you want to delete the ${selectedStudentIds.length} selected students? This will permanently remove their records, user logins, and all entered evaluation marks.`}
          confirmText="Yes, Delete Selected"
          isDestructive={true}
        />
      )}
    </div>
  );
};
