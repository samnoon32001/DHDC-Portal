import { DatabaseState } from '../services/db';
import { User, Teacher } from '../types';

export type AppPermissionCategory =
  | 'attendance'
  | 'timetable'
  | 'academics'
  | 'administrative';

export type AppPermission =
  // Attendance & Leaves
  | 'attendance_mark'
  | 'attendance_summary'
  | 'attendance_clearance'
  | 'split_electives'
  | 'attendance_all_subjects'
  | 'leaves_manage'
  // Timetable
  | 'timetable_view'
  | 'timetable_manage'
  // Academics & Students
  | 'students_manage'
  | 'marks_entry'
  | 'evaluation_levels'
  | 'achievements_manage'
  | 'discipline_manage'
  | 'feedback_manage'
  // Administrative & Settings
  | 'classes_manage'
  | 'subjects_manage'
  | 'teachers_manage'
  | 'excel_import'
  | 'reports_view'
  | 'audit_logs'
  | 'attendance_settings'
  | 'showcase_manage'
  | 'system_settings';

export interface PermissionDefinition {
  id: AppPermission;
  name: string;
  category: AppPermissionCategory;
  categoryLabel: string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Attendance & Leaves
  {
    id: 'attendance_mark',
    name: 'Mark Attendance',
    category: 'attendance',
    categoryLabel: 'Attendance & Leaves',
    description: 'Mark daily subject attendance with present/casual leave toggles',
  },
  {
    id: 'attendance_summary',
    name: 'Attendance Summary & Reports',
    category: 'attendance',
    categoryLabel: 'Attendance & Leaves',
    description: 'View class attendance summaries, filter rates, and export to Excel',
  },
  {
    id: 'attendance_clearance',
    name: 'Attendance Clearance',
    category: 'attendance',
    categoryLabel: 'Attendance & Leaves',
    description: 'Approve condonations (<85%) and convert leaves to Academic, Official, or Medical',
  },
  {
    id: 'split_electives',
    name: 'Split Electives',
    category: 'attendance',
    categoryLabel: 'Attendance & Leaves',
    description: 'Manage cohort enrollments for split elective subjects',
  },
  {
    id: 'attendance_all_subjects',
    name: 'Mark Attendance for All Subjects',
    category: 'attendance',
    categoryLabel: 'Attendance & Leaves',
    description: 'Take attendance for any class subject across the institution',
  },
  {
    id: 'leaves_manage',
    name: 'Leave Applications',
    category: 'attendance',
    categoryLabel: 'Attendance & Leaves',
    description: 'Review and approve/reject student leave applications',
  },

  // Timetable
  {
    id: 'timetable_view',
    name: 'View Timetable',
    category: 'timetable',
    categoryLabel: 'Timetable & Scheduling',
    description: 'View daily timetable schedules across classes and teachers',
  },
  {
    id: 'timetable_manage',
    name: 'Manage Timetable',
    category: 'timetable',
    categoryLabel: 'Timetable & Scheduling',
    description: 'Configure timetable periods, class slots, and teacher assignments',
  },

  // Academics & Students
  {
    id: 'students_manage',
    name: 'Student Directory & Profiles',
    category: 'academics',
    categoryLabel: 'Students & Academics',
    description: 'View and edit student admission details, guardians, and profiles',
  },
  {
    id: 'marks_entry',
    name: 'Mark Entry',
    category: 'academics',
    categoryLabel: 'Students & Academics',
    description: 'Input exam marks and evaluation scores for assigned subjects',
  },
  {
    id: 'evaluation_levels',
    name: 'Evaluation Levels',
    category: 'academics',
    categoryLabel: 'Students & Academics',
    description: 'Configure terms, assessment components, and grade weightings',
  },
  {
    id: 'achievements_manage',
    name: 'Achievements Registry',
    category: 'academics',
    categoryLabel: 'Students & Academics',
    description: 'Record curricular, sports, and co-curricular awards for students',
  },
  {
    id: 'discipline_manage',
    name: 'Behavior & Discipline',
    category: 'academics',
    categoryLabel: 'Students & Academics',
    description: 'Log and monitor conduct incidents, merits, and counseling notes',
  },
  {
    id: 'feedback_manage',
    name: 'Complaints & Feedback',
    category: 'academics',
    categoryLabel: 'Students & Academics',
    description: 'Manage student and parent queries, complaints, and institutional feedback',
  },

  // Administrative & Settings
  {
    id: 'classes_manage',
    name: 'Class Management',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'Create and configure classrooms, academic divisions, and sections',
  },
  {
    id: 'subjects_manage',
    name: 'Subject Management',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'Define curricula, subject codes, and teacher assignments',
  },
  {
    id: 'teachers_manage',
    name: 'Teacher & Faculty Management',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'Add faculty accounts, login credentials, and subject mappings',
  },
  {
    id: 'excel_import',
    name: 'Excel Data Import',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'Bulk import students, teachers, marks, and historical data',
  },
  {
    id: 'reports_view',
    name: 'Academic Reports & Analytics',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'Generate report cards, mark sheets, and semester analytics',
  },
  {
    id: 'audit_logs',
    name: 'Audit Logs',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'View institutional change histories, logins, and modification records',
  },
  {
    id: 'attendance_settings',
    name: 'Attendance & Subject Settings',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'Configure period tracking toggles, rules, roles and permissions',
  },
  {
    id: 'showcase_manage',
    name: 'Showcase & Toppers Hub',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'Create and configure spotlight topper announcement cards, priority slides, class toppers, and dashboard visibility',
  },
  {
    id: 'system_settings',
    name: 'Portal Settings',
    category: 'administrative',
    categoryLabel: 'Portal Administration',
    description: 'Institutional branding, academic years, and system configuration',
  },
];

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean;
  color?: string;
  permissions: AppPermission[];
}

export const INITIAL_DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'role-principal',
    name: 'Principal',
    description: 'Head of Institution with supreme oversight across academic, operational, clearance, and administrative functions.',
    isSystem: true,
    color: 'emerald',
    permissions: [
      'attendance_mark',
      'attendance_summary',
      'attendance_clearance',
      'split_electives',
      'attendance_all_subjects',
      'leaves_manage',
      'timetable_view',
      'timetable_manage',
      'students_manage',
      'marks_entry',
      'evaluation_levels',
      'achievements_manage',
      'discipline_manage',
      'feedback_manage',
      'classes_manage',
      'subjects_manage',
      'teachers_manage',
      'reports_view',
      'audit_logs',
      'attendance_settings',
      'showcase_manage',
      'system_settings',
    ],
  },
  {
    id: 'role-academic-assistant',
    name: 'Academic Assistant',
    description: 'Academic office authority for attendance condonations, leave conversions, timetable management, and student records.',
    isSystem: true,
    color: 'blue',
    permissions: [
      'attendance_mark',
      'attendance_summary',
      'attendance_clearance',
      'split_electives',
      'attendance_all_subjects',
      'leaves_manage',
      'timetable_view',
      'timetable_manage',
      'students_manage',
      'marks_entry',
      'evaluation_levels',
      'reports_view',
      'attendance_settings',
      'showcase_manage',
    ],
  },
  {
    id: 'role-administrator',
    name: 'Administrator',
    description: 'Institutional administrator overseeing day-to-day operations, classes, teachers, student directories, and records.',
    isSystem: true,
    color: 'purple',
    permissions: [
      'attendance_mark',
      'attendance_summary',
      'attendance_clearance',
      'split_electives',
      'attendance_all_subjects',
      'leaves_manage',
      'timetable_view',
      'timetable_manage',
      'students_manage',
      'marks_entry',
      'evaluation_levels',
      'achievements_manage',
      'discipline_manage',
      'feedback_manage',
      'classes_manage',
      'subjects_manage',
      'teachers_manage',
      'excel_import',
      'reports_view',
      'audit_logs',
      'attendance_settings',
      'showcase_manage',
      'system_settings',
    ],
  },
  {
    id: 'role-degree-hod',
    name: 'Degree HoD',
    description: 'Head of Department for Degree programs with authority over department attendance, condonation, subjects, and student evaluations.',
    isSystem: true,
    color: 'indigo',
    permissions: [
      'attendance_mark',
      'attendance_summary',
      'attendance_clearance',
      'split_electives',
      'leaves_manage',
      'timetable_view',
      'students_manage',
      'marks_entry',
      'evaluation_levels',
      'achievements_manage',
      'discipline_manage',
      'feedback_manage',
      'reports_view',
    ],
  },
  {
    id: 'role-degree-hos',
    name: 'Degree HoS',
    description: 'Head of School for Degree programs with institutional supervisory authority over degree academic operations and clearances.',
    isSystem: true,
    color: 'cyan',
    permissions: [
      'attendance_mark',
      'attendance_summary',
      'attendance_clearance',
      'split_electives',
      'leaves_manage',
      'timetable_view',
      'students_manage',
      'marks_entry',
      'evaluation_levels',
      'achievements_manage',
      'discipline_manage',
      'feedback_manage',
      'reports_view',
    ],
  },
  {
    id: 'role-secondary-hos',
    name: 'Secondary HoS',
    description: 'Head of School for Secondary education with leadership oversight of secondary classes, clearances, discipline, and academics.',
    isSystem: true,
    color: 'teal',
    permissions: [
      'attendance_mark',
      'attendance_summary',
      'attendance_clearance',
      'split_electives',
      'leaves_manage',
      'timetable_view',
      'students_manage',
      'marks_entry',
      'evaluation_levels',
      'achievements_manage',
      'discipline_manage',
      'feedback_manage',
      'reports_view',
    ],
  },
  {
    id: 'role-class-teacher',
    name: 'Class Teacher',
    description: 'Assigned classroom mentor with direct responsibility for class attendance, leave validation, student observations, and marks.',
    isSystem: true,
    color: 'amber',
    permissions: [
      'attendance_mark',
      'attendance_summary',
      'leaves_manage',
      'timetable_view',
      'students_manage',
      'marks_entry',
      'achievements_manage',
      'discipline_manage',
      'feedback_manage',
    ],
  },
  {
    id: 'role-faculty',
    name: 'Faculty',
    description: 'Standard academic faculty member authorized to mark attendance and input evaluation marks for assigned subjects only.',
    isSystem: true,
    color: 'slate',
    permissions: [
      'attendance_mark',
      'timetable_view',
      'marks_entry',
      'achievements_manage',
      'discipline_manage',
    ],
  },
];

/**
 * Checks whether a given user has a specific permission based on roles and explicit overrides
 */
export function hasPermission(
  user: User | null,
  permission: AppPermission,
  state?: DatabaseState
): boolean {
  if (!user) return false;

  // Super admin always has all permissions
  if (user.role === 'super_admin') {
    return true;
  }

  // If user is student, check if it is student-safe
  if (user.role === 'student') {
    return false;
  }

  if (!state) return false;

  // Find teacher record for this user
  const teachers = state.teachers || [];
  const teacher = teachers.find(
    (t) => t.id === user.id || t.username === user.username || `user-${t.id}` === user.id
  );

  if (!teacher) {
    return false;
  }

  // 1. Explicit denial override
  if (teacher.deniedPermissions && teacher.deniedPermissions.includes(permission)) {
    return false;
  }

  // 2. Explicit direct grant override
  if (teacher.customPermissions && teacher.customPermissions.includes(permission)) {
    return true;
  }

  // 3. Legacy shortcuts
  if (permission === 'attendance_all_subjects' && teacher.canManageAllAttendance) {
    return true;
  }

  // 4. Resolve assigned roles
  const activeRoles = state.roles || INITIAL_DEFAULT_ROLES;
  const assignedRoleIds = teacher.roleIds || [];

  // Also match by specialRoleTitle if roleIds not yet populated
  const roleMatches = activeRoles.filter((r) => {
    if (assignedRoleIds.includes(r.id)) return true;
    if (teacher.specialRoleTitle && r.name.toLowerCase() === teacher.specialRoleTitle.toLowerCase()) {
      return true;
    }
    // Default fallback to 'Faculty' if no roles assigned
    if (assignedRoleIds.length === 0 && !teacher.specialRoleTitle && r.id === 'role-faculty') {
      return true;
    }
    return false;
  });

  // Check if any matched role contains this permission
  for (const role of roleMatches) {
    if (role.permissions.includes(permission)) {
      return true;
    }
  }

  // Legacy fallback for clearance if defined in attendanceRules
  if (permission === 'attendance_clearance') {
    const rules = state.attendanceRules;
    if (rules?.clearanceTeacherIds?.includes(teacher.id)) return true;
    if (teacher.specialRoleTitle) {
      const allowedRoles = rules?.clearanceAllowedRoles || [
        'Principal',
        'Academic Assistant',
        'HoD',
        'Degree HoD',
        'HoS',
        'Degree HoS',
        'Secondary HoS',
        'Administrator',
      ];
      if (allowedRoles.some((ar) => teacher.specialRoleTitle?.toLowerCase().includes(ar.toLowerCase()))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns all active permissions granted to a user
 */
export function getUserPermissions(
  user: User | null,
  state?: DatabaseState
): AppPermission[] {
  if (!user) return [];
  if (user.role === 'super_admin') {
    return ALL_PERMISSIONS.map((p) => p.id);
  }
  return ALL_PERMISSIONS.filter((p) => hasPermission(user, p.id, state)).map((p) => p.id);
}
