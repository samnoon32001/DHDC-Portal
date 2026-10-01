import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/db';
import {
  ALL_PERMISSIONS,
  AppPermission,
  AppPermissionCategory,
  RoleDefinition,
  hasPermission,
  getUserPermissions,
} from '../../utils/permissions';
import {
  ShieldCheck,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Sliders,
  Sparkles,
  Lock,
  ChevronRight,
  Info,
  Calendar,
  Clock,
  BookOpen,
  Award,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const RolesPermissionsManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const dbState = dataService.getState();
  const [, setRerender] = useState(0);

  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'faculty'>('roles');
  const [searchQuery, setSearchQuery] = useState('');

  // Role Modal states
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDescription, setRoleFormDescription] = useState('');
  const [roleFormPermissions, setRoleFormPermissions] = useState<AppPermission[]>([]);

  // Teacher Overrides Modal state
  const [isTeacherOverrideModalOpen, setIsTeacherOverrideModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const roles = dataService.getRoles();
  const teachers = dbState.teachers || [];

  const actor = currentUser
    ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    : undefined;

  // Categories helper
  const categories: { id: AppPermissionCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'attendance', label: 'Attendance & Leaves', icon: <Clock className="w-4 h-4 text-emerald-600" /> },
    { id: 'timetable', label: 'Timetable & Scheduling', icon: <Calendar className="w-4 h-4 text-blue-600" /> },
    { id: 'academics', label: 'Students & Academics', icon: <Award className="w-4 h-4 text-purple-600" /> },
    { id: 'administrative', label: 'Portal Administration', icon: <Settings className="w-4 h-4 text-indigo-600" /> },
  ];

  // Open Edit Role
  const handleOpenEditRole = (role: RoleDefinition) => {
    setEditingRoleId(role.id);
    setRoleFormName(role.name);
    setRoleFormDescription(role.description);
    setRoleFormPermissions([...role.permissions]);
    setIsRoleModalOpen(true);
  };

  // Open Create Role
  const handleOpenCreateRole = () => {
    setEditingRoleId(null);
    setRoleFormName('');
    setRoleFormDescription('');
    setRoleFormPermissions([
      'attendance_mark',
      'timetable_view',
      'marks_entry',
    ]);
    setIsRoleModalOpen(true);
  };

  // Save Role
  const handleSaveRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) return;

    const roleToSave: RoleDefinition = {
      id: editingRoleId || `role-${Date.now()}`,
      name: roleFormName.trim(),
      description: roleFormDescription.trim(),
      permissions: roleFormPermissions,
      isSystem: editingRoleId ? roles.find((r) => r.id === editingRoleId)?.isSystem : false,
    };

    dataService.saveRole(roleToSave, actor);
    setIsRoleModalOpen(false);
    setRerender((v) => v + 1);
  };

  // Delete Role
  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (window.confirm(`Are you sure you want to delete the role "${roleName}"? Teachers assigned to it will lose its permissions.`)) {
      dataService.deleteRole(roleId, actor);
      setRerender((v) => v + 1);
    }
  };

  // Toggle permission in role form
  const handleTogglePermissionInForm = (permId: AppPermission) => {
    setRoleFormPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  // Select all permissions in category
  const handleToggleCategoryInForm = (catId: AppPermissionCategory, enable: boolean) => {
    const catPerms = ALL_PERMISSIONS.filter((p) => p.category === catId).map((p) => p.id);
    setRoleFormPermissions((prev) => {
      if (enable) {
        return Array.from(new Set([...prev, ...catPerms]));
      } else {
        return prev.filter((p) => !catPerms.includes(p));
      }
    });
  };

  // Quick toggle teacher permission
  const handleToggleTeacherQuickPermission = (
    teacherId: string,
    permId: AppPermission,
    currentHas: boolean
  ) => {
    dataService.toggleTeacherPermission(teacherId, permId, !currentHas, actor);
    setRerender((v) => v + 1);
  };

  // Update teacher primary role selection
  const handleUpdateTeacherRole = (teacherId: string, roleId: string) => {
    const targetRole = roles.find((r) => r.id === roleId);
    const newRoleIds = roleId ? [roleId] : [];
    dataService.assignTeacherRoles(teacherId, newRoleIds, undefined, undefined, actor);
    if (targetRole) {
      dataService.updateTeacher(teacherId, { specialRoleTitle: targetRole.name }, actor);
    } else {
      dataService.updateTeacher(teacherId, { specialRoleTitle: undefined }, actor);
    }
    setRerender((v) => v + 1);
  };

  // Selected teacher for modal
  const activeModalTeacher = useMemo(() => {
    return teachers.find((t) => t.id === selectedTeacherId);
  }, [teachers, selectedTeacherId]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q) ||
        (t.specialRoleTitle && t.specialRoleTitle.toLowerCase().includes(q))
    );
  }, [teachers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center border border-indigo-100 dark:border-indigo-800 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Roles & Permissions Architecture
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Super Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Configure institutional designations (Principal, Academic Assistant, Degree HoD/HoS, Secondary HoS, Class Teacher, Faculty) and granular access to Attendance Clearance, Split Electives, Timetables, and Marks.
            </p>
          </div>
        </div>

        {/* Tab switchers & Add Role Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveSubTab('roles')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'roles'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Institutional Roles ({roles.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('faculty')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'faculty'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Faculty Assignments ({teachers.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateRole}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Role</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUBTAB 1: INSTITUTIONAL ROLES MATRIX
      ========================================================================= */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {roles.map((role) => {
              const assignedCount = teachers.filter((t) => {
                if (t.roleIds && t.roleIds.includes(role.id)) return true;
                if (t.specialRoleTitle && t.specialRoleTitle.toLowerCase() === role.name.toLowerCase()) return true;
                if (!t.roleIds?.length && !t.specialRoleTitle && role.id === 'role-faculty') return true;
                return false;
              }).length;

              const hasClearance = role.permissions.includes('attendance_clearance');
              const hasSplitElectives = role.permissions.includes('split_electives');
              const hasSummary = role.permissions.includes('attendance_summary');

              return (
                <div
                  key={role.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {role.name}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          {role.permissions.length} Permissions
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {assignedCount} Faculty
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {role.description}
                    </p>

                    {/* Key Highlights Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {hasClearance && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Clearance
                        </span>
                      )}
                      {hasSplitElectives && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                          <CheckCircle2 className="w-3 h-3" /> Split Electives
                        </span>
                      )}
                      {hasSummary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          <CheckCircle2 className="w-3 h-3" /> Reports
                        </span>
                      )}
                      {!hasClearance && !hasSplitElectives && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Standard Marking
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRole(role)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Permissions</span>
                    </button>

                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                        title="Delete custom role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUBTAB 2: FACULTY ASSIGNMENTS & SPECIFIC OVERRIDES
      ========================================================================= */}
      {activeSubTab === 'faculty' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-64 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredTeachers.length} of {teachers.length} faculty members
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-3 text-center">Attendance Clearance</th>
                  <th className="py-3 px-3 text-center">Split Electives</th>
                  <th className="py-3 px-3 text-center">All Subjects Attendance</th>
                  <th className="py-3 px-4 text-right">Effective Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeachers.map((teacher) => {
                  const teacherFakeUser = {
                    id: teacher.id,
                    username: teacher.username,
                    name: teacher.name,
                    role: 'teacher' as const,
                    status: teacher.status,
                    createdAt: teacher.createdDate,
                  };

                  const canClearance = hasPermission(teacherFakeUser, 'attendance_clearance', dbState);
                  const canSplit = hasPermission(teacherFakeUser, 'split_electives', dbState);
                  const canAllAttendance = hasPermission(teacherFakeUser, 'attendance_all_subjects', dbState);
                  const allPerms = getUserPermissions(teacherFakeUser, dbState);

                  // Current role ID
                  const assignedRoleId =
                    teacher.roleIds?.[0] ||
                    roles.find((r) => r.name.toLowerCase() === teacher.specialRoleTitle?.toLowerCase())?.id ||
                    'role-faculty';

                  return (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {teacher.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          @{teacher.username} • {teacher.assignedSubjectIds?.length || 0} subjects
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={assignedRoleId}
                          onChange={(e) => handleUpdateTeacherRole(teacher.id, e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-600 cursor-pointer"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quick Toggle: Attendance Clearance */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleTeacherQuickPermission(
                              teacher.id,
                              'attendance_clearance',
                              canClearance
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            canClearance
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {canClearance ? '✓ Granted' : 'Off'}
                        </button>
                      </td>

                      {/* Quick Toggle: Split Electives */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleTeacherQuickPermission(
                              teacher.id,
                              'split_electives',
                              canSplit
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            canSplit
                              ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {canSplit ? '✓ Granted' : 'Off'}
                        </button>
                      </td>

                      {/* Quick Toggle: All Subjects Attendance */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleTeacherQuickPermission(
                              teacher.id,
                              'attendance_all_subjects',
                              canAllAttendance
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            canAllAttendance
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {canAllAttendance ? '✓ All Subjects' : 'Assigned Only'}
                        </button>
                      </td>

                      {/* Effective Access / Details Modal */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacherId(teacher.id);
                            setIsTeacherOverrideModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{allPerms.length} Perms</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT OR CREATE INSTITUTIONAL ROLE
      ========================================================================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingRoleId ? `Edit Role: ${roleFormName}` : 'Create Institutional Role'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define granted capabilities for this designation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveRoleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role Title / Designation Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleFormName}
                    onChange={(e) => setRoleFormName(e.target.value)}
                    placeholder="e.g. Academic Assistant, Degree HoD, Secondary HoS..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description & Institutional Scope
                  </label>
                  <textarea
                    rows={2}
                    value={roleFormDescription}
                    onChange={(e) => setRoleFormDescription(e.target.value)}
                    placeholder="Brief description of duties, clearances, and authority..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Permissions Checklist by Category */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Permissions Included in this Role ({roleFormPermissions.length} of {ALL_PERMISSIONS.length})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRoleFormPermissions(ALL_PERMISSIONS.map((p) => p.id))}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setRoleFormPermissions([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {categories.map((cat) => {
                    const catPerms = ALL_PERMISSIONS.filter((p) => p.category === cat.id);
                    const allCatActive = catPerms.every((p) => roleFormPermissions.includes(p.id));

                    return (
                      <div
                        key={cat.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            {cat.icon}
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {cat.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryInForm(cat.id, !allCatActive)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                          >
                            {allCatActive ? 'Deselect Category' : 'Select All in Category'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catPerms.map((perm) => {
                            const isChecked = roleFormPermissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 shadow-2xs'
                                    : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermissionInForm(perm.id)}
                                  className="mt-0.5 rounded text-indigo-600 cursor-pointer"
                                />
                                <div>
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {perm.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                    {perm.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit / Cancel Bar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  Save Role Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TEACHER PERMISSIONS OVERVIEW & FINE-GRAINED OVERRIDES
      ========================================================================= */}
      {isTeacherOverrideModalOpen && activeModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permissions Audit: {activeModalTeacher.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Role: {activeModalTeacher.specialRoleTitle || 'Faculty'} • @{activeModalTeacher.username}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTeacherOverrideModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  Click any permission to toggle an individual override for this teacher. Overrides take precedence over the base role.
                </div>
              </div>

              <div className="space-y-3">
                {ALL_PERMISSIONS.map((perm) => {
                  const teacherUser = {
                    id: activeModalTeacher.id,
                    username: activeModalTeacher.username,
                    name: activeModalTeacher.name,
                    role: 'teacher' as const,
                    status: activeModalTeacher.status,
                    createdAt: activeModalTeacher.createdDate,
                  };
                  const isGranted = hasPermission(teacherUser, perm.id, dbState);
                  const isExplicitGrant = activeModalTeacher.customPermissions?.includes(perm.id);
                  const isExplicitDeny = activeModalTeacher.deniedPermissions?.includes(perm.id);

                  return (
                    <div
                      key={perm.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{perm.name}</span>
                          {isExplicitGrant && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                              Override Granted
                            </span>
                          )}
                          {isExplicitDeny && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                              Override Denied
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {perm.description}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleTeacherQuickPermission(
                            activeModalTeacher.id,
                            perm.id,
                            isGranted
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                          isGranted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isGranted ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTeacherOverrideModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
