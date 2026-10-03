export type UserRole = 'super_admin' | 'teacher' | 'student';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  admissionNumber?: string;
  studentId?: string;
  status: 'active' | 'inactive';
  password?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentGuardianInfo {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherPhone?: string;
  motherOccupation?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianAddress?: string;
  guardianOccupation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  alternatePhone?: string;
  familyNotes?: string;
}

export interface ClassTeacherNotes {
  generalObservations?: string;
  strengths?: string;
  concerns?: string;
  areasOfImprovement?: string;
  behaviorRemarks?: string;
  personalDevelopment?: string;
  counselingNotes?: string;
  recommendations?: string;
  lastUpdated?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface Student {
  id: string;
  admissionNumber: string;
  name: string;
  classId: string;
  phone?: string;
  email?: string;
  username: string;
  status: 'active' | 'inactive';
  createdDate: string;
  enrollmentDate?: string;
  // Extended Profile
  photoUrl?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  address?: string;
  rollNumber?: string;
  guardian?: StudentGuardianInfo;
  classTeacherNotes?: ClassTeacherNotes;
  electiveSubjectIds?: string[]; // IDs of split/elective subjects enrolled in
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  email: string;
  username: string;
  status: 'active' | 'inactive';
  assignedSubjectIds: string[];
  assignedClassIds: string[];
  classTeacherOfClassIds: string[];
  createdDate: string;
  specialRoleTitle?: string; // e.g. "Principal", "Academic Assistant", "HoD", "HoS"
  canManageAllAttendance?: boolean; // Granted access to take/view attendance for all subjects
  roleIds?: string[]; // IDs of assigned institutional roles (e.g. ['role-principal', 'role-degree-hod'])
  customPermissions?: string[]; // Explicit directly granted permission keys
  deniedPermissions?: string[]; // Explicit denied permission keys
}

export type { AppPermission, RoleDefinition } from './utils/permissions';

export interface ClassRoom {
  id: string;
  name: string; // e.g. "Class 8 A"
  academicYear: string; // e.g. "2025-2026"
  classTeacherId?: string;
  status: 'active' | 'inactive';
  createdDate?: string;
  isAttendanceEnabled?: boolean;
}

export interface Subject {
  id: string;
  name: string; // e.g. "English"
  code: string; // e.g. "ENG101"
  classId: string;
  assignedTeacherId?: string;
  teacherId?: string; // alias for assignedTeacherId
  status: 'active' | 'inactive';
  trackAttendance?: boolean; // toggle in subject settings (default: true)
  isSplitSubject?: boolean; // true if this subject splits periods (e.g. Computer App vs Humanities)
  splitGroupName?: string; // e.g. "Computer Application" or "Humanities"
  enrolledStudentIds?: string[]; // specific students enrolled if split
  additionalTeacherIds?: string[]; // teachers given secondary/co-access for this subject
}

export interface EvaluationLevel {
  id: string;
  subjectId: string;
  name: string; // e.g. "Assignment", "Debate", "Presentation", "Project"
  maximumMark: number;
  maxMark?: number; // Optional alias for convenience
  displayOrder: number;
  status: 'active' | 'inactive';
}

export interface Mark {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  evaluationLevelId: string;
  maximumMark: number;
  obtainedMark: number | null; // null if not entered
  date: string;
  enteredBy: string; // Teacher name or ID
  lastUpdated: string;
  academicYear?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface AcademicYear {
  id: string;
  year: string;
  isCurrent: boolean;
}

export interface SystemLockSettings {
  isLevelAddingLocked: boolean;
  isMarkEntryLocked: boolean;
}

export interface StudentSubjectSummary {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  evaluationMarks: {
    levelId: string;
    levelName: string;
    maximumMark: number;
    obtainedMark: number | null;
    status: 'completed' | 'pending';
  }[];
  totalMaximum: number;
  totalObtained: number;
  percentage: number;
  finalWeightedMark: number; // out of 30
  isFullyCompleted: boolean;
}

// ==========================================
// 🏆 ACHIEVEMENTS
// ==========================================
export type AchievementCategory =
  | 'award'
  | 'competition'
  | 'certificate'
  | 'sports'
  | 'arts_cultural'
  | 'recognition'
  | 'special_recognition';

export interface Achievement {
  id: string;
  studentId: string;
  title: string;
  category: AchievementCategory;
  date: string;
  description: string;
  positionPrize?: string; // e.g. "1st Prize", "Gold Medal", "State Finalist"
  position?: string; // alias for positionPrize
  awardedBy?: string; // Organization / Institution / College
  issuer?: string; // alias for awardedBy
  level?: string; // e.g. "College", "State", "National"
  certificateUrl?: string;
  createdDate: string;
}

export type AchievementRecord = Achievement;

// ==========================================
// 🧭 BEHAVIOR & DISCIPLINE
// ==========================================
export type BehaviorType = 'positive' | 'incident' | 'warning' | 'observation' | 'action_taken';
export type IncidentSeverity = 'low' | 'medium' | 'high';

export interface BehaviorRecord {
  id: string;
  studentId: string;
  type: BehaviorType;
  title: string;
  description: string;
  severity?: IncidentSeverity;
  actionTaken?: string;
  points?: number;
  followUpStatus?: 'open' | 'under_review' | 'resolved';
  recordedBy: string;
  recordedById?: string;
  recordedByName?: string;
  recordedByRole: string;
  date: string;
}

// ==========================================
// 📅 DAY ACTIVE HOURS & LEAVE CALCULATION
// ==========================================
export interface ActiveHourSlot {
  id: string;
  label: string; // e.g. "Morning Session 1", "Session 2"
  startTime: string; // e.g. "07:00"
  endTime: string; // e.g. "09:15"
  durationMinutes: number; // calculated minutes e.g. 135
  isActive: boolean;
}

export type LeaveType =
  | 'official'
  | 'casual'
  | 'academic'
  | 'medical'
  | 'official_leave'
  | 'casual_leave'
  | 'academic_leave'
  | 'medical_leave';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'arrived';

export interface LeaveApplication {
  id: string;
  studentId: string;
  studentAdmissionNumber: string;
  studentName: string;
  classId: string;
  academicYear?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  slotsIncluded: string[]; // ActiveHourSlot IDs
  totalDurationMinutes: number; // Total active hours calculated from slots
  totalDurationFormatted: string; // e.g. "4h 30m"
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  hasArrived?: boolean;
  arrivedAt?: string;
  remarks?: string;
}

// ==========================================
// 📋 MULTI-PERIOD ATTENDANCE (Periods 1 - 9)
// ==========================================
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'official_leave'
  | 'casual_leave'
  | 'academic_leave'
  | 'medical_leave'
  | 'late';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  academicYear?: string; // Academic year e.g. '2026-2027'
  classId: string;
  subjectId: string;
  period: number; // 1 to 9
  studentId: string;
  status: AttendanceStatus;
  lateArrivalTime?: string; // e.g. "08:15 AM"
  lateReason?: string;
  markedBy: string;
  markedAt: string;
  remarks?: string;
}

export interface AttendanceClearance {
  id: string;
  studentId: string;
  subjectId?: string; // empty string or omitted for all-subject clearance
  grantedBy: string;
  grantedByName: string;
  clearedByName?: string; // alias for grantedByName
  grantedByRole: string; // e.g. "HoD", "HoS", "Academic Assistant", "Super Admin"
  clearedByRole?: string; // alias for grantedByRole
  approvedPercentage?: number;
  reason: string;
  clearedDate: string;
  academicYear: string;
  notes?: string;
}

export interface StudentLeaveClearanceApplication {
  id: string;
  studentId: string;
  studentName: string;
  studentAdmissionNumber: string;
  classId: string;
  className: string;
  academicYear?: string;
  subjectId: string;
  subjectName: string;
  recordIds: string[];
  dates: string[];
  periods: number[];
  clearanceType: 'academic_leave' | 'official_leave' | 'medical_leave';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
}

export interface AttendanceRulesConfig {
  maxOfficialLeavePercent: number; // default: 10
  maxCasualLeavePercent: number; // default: 15
  maxTotalLeavesPercent: number; // default: 25 (official + casual + medical)
  maxOfficialCasualCombinedPercent: number; // default: 15
  minRequiredAttendancePercent: number; // default: 85 (without medical)
  academicLeaveCountedAsPresent: boolean; // default: true
  clearanceAllowedRoles?: string[]; // e.g. ['super_admin', 'Principal', 'HoD', 'HoS', 'Academic Assistant']
  clearanceTeacherIds?: string[];
  customRoleRules?: Record<string, Partial<AttendanceRulesConfig>>;
}

// ==========================================
// ⏰ PERIOD TIMINGS & TIMETABLE SCHEDULE
// ==========================================
export interface TimetablePeriodDefinition {
  id: string;
  periodNumber: number; // 1, 2, 3...
  name: string; // e.g. "Period 1"
  startTime: string; // e.g. "07:45"
  endTime: string; // e.g. "08:30"
  isBreak?: boolean;
  breakLabel?: string; // e.g. "Interval", "Lunch & Prayer Break"
}

export type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export interface TimetableSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  classId: string;
  subjectId: string;
  teacherId?: string;
  room?: string;
  isSplitSlot?: boolean;
}

// ==========================================
// 💬 COMPLAINTS & FEEDBACK WITH ROUTING
// ==========================================
export type MessageReceiverType =
  | 'principal'
  | 'academic_assistant'
  | 'class_teacher'
  | 'hod'
  | 'hos'
  | 'super_admin';

export interface ComplaintFeedback {
  id: string;
  studentId: string;
  studentAdmissionNumber: string;
  studentName: string;
  classId: string;
  receiverType: MessageReceiverType;
  title: string;
  subject?: string; // alias for title
  category:
    | 'complaint'
    | 'feedback'
    | 'academic'
    | 'facility'
    | 'facilities'
    | 'administration'
    | 'attendance'
    | 'general'
    | 'other';
  message: string;
  status:
    | 'pending'
    | 'in_progress'
    | 'resolved'
    | 'submitted'
    | 'acknowledged'
    | 'in_review';
  response?: string;
  respondedBy?: string;
  respondedByName?: string;
  respondedAt?: string;
  resolvedAt?: string; // alias for respondedAt when resolved
  submittedAt: string;
  createdAt?: string; // alias for submittedAt
  isAnonymous?: boolean;
}

// ==========================================
// 🏆 SHOWCASE BANNER & TOPPERS HUB
// ==========================================
export type ShowcaseCardPriority = 1 | 2 | 3; // 1 = Apex Hero (Largest and First), 2 = Section Topper Slide, 3 = Class Topper

export type ShowcaseCardCategory =
  | 'apex_topper'
  | 'section_topper'
  | 'class_topper'
  | 'announcement'
  | 'award';

export type ShowcaseCardTargetAudience =
  | 'all'
  | 'students_only'
  | 'teachers_only'
  | 'admins_only'
  | 'teachers_and_students'
  | 'admins_and_teachers'
  | 'specific_roles'
  | 'specific_classes'
  | 'specific_student';

export interface ShowcaseCard {
  id: string;
  title: string; // e.g. "Topper of the Rabee' Semester Examination 2026-27"
  subtitle?: string; // e.g. "Apex Institutional Distinction"
  studentName: string; // e.g. "Zayd Ahmed Hudawi"
  studentAdmissionNumber?: string;
  studentId?: string;
  percentage: string; // e.g. "98.4%" or "98%"
  scoreDetails?: string; // e.g. "Score: 492 / 500 • Rank #1"
  sectionOrClass: string; // e.g. "Degree Department", "Secondary Section", "Class 10 A", "Class 1"
  classId?: string;
  category: ShowcaseCardCategory;
  priority: ShowcaseCardPriority; // 1 = Grand Hero, 2 = Section Topper Slide, 3 = Class Topper
  badgeText?: string; // e.g. "Apex Institutional Topper 🏆", "Secondary Gold Medalist 🥇"
  imageUrl?: string;
  description?: string; // quote or congratulatory message
  accentGradient?: 'gold' | 'emerald' | 'sapphire' | 'ruby' | 'violet' | 'amber';
  
  // Visibility & Target Audience ("in selected and specific user login first dashboards")
  targetAudience: ShowcaseCardTargetAudience;
  targetRoles?: UserRole[];
  targetClassIds?: string[];
  targetStudentIds?: string[];
  
  order: number;
  isActive: boolean;
  examName?: string;
  academicYear?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  createdByName?: string;
}

// ==========================================
// 🏛️ INSTITUTION & SYSTEM BRANDING SETTINGS
// ==========================================
export interface InstitutionSettings {
  id?: string;
  name: string; // e.g. "DARUL HIDAYA DA'WA COLLEGE, MANOOR"
  shortName: string; // e.g. "DHDC Portal"
  subtitle?: string; // e.g. "College Management & Academic Portal"
  address?: string; // e.g. "Manoor, P.O. Edappal, Malappuram Dt., Kerala 679578"
  logoUrl?: string; // Custom Logo data URL / URL
  faviconUrl?: string; // Custom Favicon data URL / URL
  appIconUrl?: string; // PWA Web App Icon data URL / URL
  phone?: string;
  email?: string;
  website?: string;
  affiliationNumber?: string;
  establishedYear?: string;
  reportCardHeader?: string;
  reportCardFooter?: string;
  updatedAt?: string;
}

