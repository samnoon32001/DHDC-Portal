import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import type {
  User,
  Student,
  Teacher,
  ClassRoom,
  Subject,
  EvaluationLevel,
  Mark,
  AuditLog,
  AcademicYear,
  Achievement,
  BehaviorRecord,
  ActiveHourSlot,
  LeaveApplication,
  AttendanceRecord,
  AttendanceClearance,
  StudentLeaveClearanceApplication,
  ComplaintFeedback,
  AttendanceRulesConfig,
  MessageReceiverType,
  AttendanceStatus,
  ClassTeacherNotes,
  LeaveType,
  LeaveStatus,
  TimetablePeriodDefinition,
  DayOfWeek,
  TimetableSlot,
  ShowcaseCard,
} from '../types';
import { RoleDefinition, INITIAL_DEFAULT_ROLES } from '../utils/permissions';

const STORAGE_KEY = 'student_mark_system_db_v1';

export interface DatabaseState {
  users: User[];
  students: Student[];
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  evaluationLevels: EvaluationLevel[];
  marks: Mark[];
  auditLogs: AuditLog[];
  academicYears: AcademicYear[];
  currentAcademicYear: string;
  isLevelAddingLocked?: boolean;
  isMarkEntryLocked?: boolean;
  achievements: Achievement[];
  behaviorRecords: BehaviorRecord[];
  activeHourSlots: ActiveHourSlot[];
  leaveApplications: LeaveApplication[];
  attendanceRecords: AttendanceRecord[];
  attendanceClearances: AttendanceClearance[];
  studentLeaveClearanceApplications?: StudentLeaveClearanceApplication[];
  complaintsFeedback: ComplaintFeedback[];
  complaints?: ComplaintFeedback[];
  allowedReceiverTypes: MessageReceiverType[];
  attendanceRules: AttendanceRulesConfig;
  timetablePeriods?: TimetablePeriodDefinition[];
  timetableSlots?: TimetableSlot[];
  roles?: RoleDefinition[];
  showcaseCards?: ShowcaseCard[];
}

export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export const INITIAL_SHOWCASE_CARDS: ShowcaseCard[] = [];

export const INITIAL_TIMETABLE_PERIODS: TimetablePeriodDefinition[] = [
  { id: 'p-1', periodNumber: 1, name: 'Period 1', startTime: '07:45', endTime: '08:30', isBreak: false },
  { id: 'p-2', periodNumber: 2, name: 'Period 2', startTime: '08:30', endTime: '09:15', isBreak: false },
  { id: 'p-3', periodNumber: 3, name: 'Period 3', startTime: '09:15', endTime: '10:00', isBreak: false },
  { id: 'p-break-1', periodNumber: 4, name: 'Morning Interval', startTime: '10:00', endTime: '10:15', isBreak: true, breakLabel: 'Morning Interval' },
  { id: 'p-4', periodNumber: 4, name: 'Period 4', startTime: '10:15', endTime: '11:00', isBreak: false },
  { id: 'p-5', periodNumber: 5, name: 'Period 5', startTime: '11:00', endTime: '11:45', isBreak: false },
  { id: 'p-6', periodNumber: 6, name: 'Period 6', startTime: '11:45', endTime: '12:30', isBreak: false },
  { id: 'p-break-2', periodNumber: 7, name: 'Lunch & Dhuhr Prayer Break', startTime: '12:30', endTime: '14:00', isBreak: true, breakLabel: 'Lunch & Dhuhr Prayer Break' },
  { id: 'p-7', periodNumber: 7, name: 'Period 7', startTime: '14:00', endTime: '14:45', isBreak: false },
  { id: 'p-8', periodNumber: 8, name: 'Period 8', startTime: '14:45', endTime: '15:30', isBreak: false },
  { id: 'p-9', periodNumber: 9, name: 'Period 9', startTime: '15:30', endTime: '16:15', isBreak: false },
];

export const INITIAL_STATE: DatabaseState = {
  isLevelAddingLocked: false,
  isMarkEntryLocked: false,
  academicYears: [
    { id: 'ay-2026-2027', year: '2026-2027', isCurrent: true },
    { id: 'ay-2025-2026', year: '2025-2026', isCurrent: false },
  ],
  currentAcademicYear: '2026-2027',
  users: [
    {
      id: 'user-admin',
      username: 'admin',
      role: 'super_admin',
      name: 'Ashiq CP Hudawi',
      email: 'admin@school.edu',
      phone: '(555) 100-0001',
      status: 'active',
      password: 'admin123',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
  ],
  classes: [],
  teachers: [],
  students: [],
  subjects: [],
  evaluationLevels: [],
  marks: [],
  auditLogs: [],
  achievements: [],
  behaviorRecords: [],
  activeHourSlots: [
    { id: 'slot-1', label: 'Morning Session 1', startTime: '07:00', endTime: '09:15', durationMinutes: 135, isActive: true },
    { id: 'slot-2', label: 'Morning Session 2', startTime: '09:45', endTime: '11:15', durationMinutes: 90, isActive: true },
    { id: 'slot-3', label: 'Mid-day Session', startTime: '11:25', endTime: '12:55', durationMinutes: 90, isActive: true },
    { id: 'slot-4', label: 'Afternoon Session 1', startTime: '14:00', endTime: '15:20', durationMinutes: 80, isActive: true },
    { id: 'slot-5', label: 'Afternoon Session 2', startTime: '15:30', endTime: '16:10', durationMinutes: 40, isActive: true },
  ],
  leaveApplications: [],
  attendanceRecords: [],
  attendanceClearances: [],
  studentLeaveClearanceApplications: [],
  complaintsFeedback: [],
  allowedReceiverTypes: ['super_admin', 'class_teacher', 'academic_assistant', 'principal', 'hod', 'hos'],
  attendanceRules: {
    maxOfficialLeavePercent: 10,
    maxCasualLeavePercent: 15,
    maxTotalLeavesPercent: 25,
    maxOfficialCasualCombinedPercent: 15,
    minRequiredAttendancePercent: 85,
    academicLeaveCountedAsPresent: true,
  },
  timetablePeriods: INITIAL_TIMETABLE_PERIODS,
  timetableSlots: [],
  roles: INITIAL_DEFAULT_ROLES,
  showcaseCards: [],
};

class DataService {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();
  private syncStatus: 'connected' | 'syncing' | 'offline' | 'error' | 'connecting' = 'connecting';
  private lastSyncTime: string | null = null;
  private syncError: string | null = null;
  private syncPromise: Promise<boolean> | null = null;

  constructor() {
    this.state = this.loadLocal();
    this.initFirestoreSync();
  }

  private loadLocal(): DatabaseState {
    let state: DatabaseState;
    try {
      const stored =
        typeof window !== 'undefined' && window.localStorage
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        state = {
          ...INITIAL_STATE,
          ...parsed,
        };
        // Preserve user's deleted/cleared state: only seed default if property was never in stored state
        if (!('showcaseCards' in parsed) || parsed.showcaseCards === undefined) {
          state.showcaseCards = JSON.parse(JSON.stringify(INITIAL_SHOWCASE_CARDS));
        }
      } else {
        state = JSON.parse(JSON.stringify(INITIAL_STATE));
      }
      if (!state.roles || state.roles.length === 0) {
        state.roles = JSON.parse(JSON.stringify(INITIAL_DEFAULT_ROLES));
      } else {
        // Guarantee all default system roles exist
        INITIAL_DEFAULT_ROLES.forEach((defRole) => {
          if (!state.roles!.some((r) => r.id === defRole.id || r.name.toLowerCase() === defRole.name.toLowerCase())) {
            state.roles!.push(JSON.parse(JSON.stringify(defRole)));
          }
        });
      }
      if (!state.achievements) state.achievements = JSON.parse(JSON.stringify(INITIAL_STATE.achievements));
      if (!state.behaviorRecords) state.behaviorRecords = JSON.parse(JSON.stringify(INITIAL_STATE.behaviorRecords));
      if (!state.activeHourSlots || state.activeHourSlots.length === 0) state.activeHourSlots = JSON.parse(JSON.stringify(INITIAL_STATE.activeHourSlots));
      if (!state.leaveApplications) state.leaveApplications = JSON.parse(JSON.stringify(INITIAL_STATE.leaveApplications));
      if (!state.attendanceRecords) state.attendanceRecords = JSON.parse(JSON.stringify(INITIAL_STATE.attendanceRecords));
      if (!state.attendanceClearances) state.attendanceClearances = [];
      if (!state.studentLeaveClearanceApplications || state.studentLeaveClearanceApplications.length === 0) {
        state.studentLeaveClearanceApplications = JSON.parse(JSON.stringify(INITIAL_STATE.studentLeaveClearanceApplications || []));
      }
      if (!state.complaintsFeedback) state.complaintsFeedback = JSON.parse(JSON.stringify(INITIAL_STATE.complaintsFeedback));
      if (!state.allowedReceiverTypes || state.allowedReceiverTypes.length === 0) state.allowedReceiverTypes = JSON.parse(JSON.stringify(INITIAL_STATE.allowedReceiverTypes));
      if (!state.attendanceRules) state.attendanceRules = JSON.parse(JSON.stringify(INITIAL_STATE.attendanceRules));
      if (!state.timetablePeriods || state.timetablePeriods.length === 0) {
        state.timetablePeriods = JSON.parse(JSON.stringify(INITIAL_STATE.timetablePeriods || []));
      }
      if (!state.timetableSlots || state.timetableSlots.length === 0) {
        state.timetableSlots = JSON.parse(JSON.stringify(INITIAL_STATE.timetableSlots || []));
      }
      // Ensure classes have attendance toggle enabled by default
      if (state.classes) {
        state.classes.forEach((c) => {
          if (c.isAttendanceEnabled === undefined) c.isAttendanceEnabled = true;
        });
      }
      if (state.subjects) {
        state.subjects.forEach((s) => {
          if (s.trackAttendance === undefined) s.trackAttendance = true;
        });
      }
      // Ensure current academic year defaults to 2026-2027
      if (!state.currentAcademicYear || state.currentAcademicYear === '2025-2026') {
        state.currentAcademicYear = '2026-2027';
      }
      if (!state.academicYears) {
        state.academicYears = [
          { id: 'ay-2026-2027', year: '2026-2027', isCurrent: true },
          { id: 'ay-2025-2026', year: '2025-2026', isCurrent: false },
        ];
      } else {
        if (!state.academicYears.some((ay) => ay.year === '2026-2027')) {
          state.academicYears.unshift({ id: 'ay-2026-2027', year: '2026-2027', isCurrent: true });
        }
        state.academicYears.forEach((ay) => {
          ay.isCurrent = ay.year === state.currentAcademicYear;
        });
      }
    } catch (e) {
      console.error('Error loading local state:', e);
      state = JSON.parse(JSON.stringify(INITIAL_STATE));
    }

    // System rule: ensure every student has a user account with username = admissionNumber
    // and password = admissionNumber repeated 3 times (e.g., '1001' -> '100110011001')
    if (state.students && state.users) {
      // First, ensure students list in local state is strictly deduplicated by admission number
      const seenAdmissions = new Set<string>();
      state.students = state.students.filter((s) => {
        const adm = String(s.admissionNumber || '').trim().toLowerCase();
        if (!adm) return true;
        if (seenAdmissions.has(adm)) return false;
        seenAdmissions.add(adm);
        return true;
      });

      state.students.forEach((s) => {
        const expectedStudentPass = `${s.admissionNumber}${s.admissionNumber}${s.admissionNumber}`;
        const existingUserIdx = state.users.findIndex(
          (u) =>
            u.admissionNumber === s.admissionNumber ||
            u.id === `user-${s.id}` ||
            u.username.toLowerCase() === s.admissionNumber.toLowerCase()
        );

        if (existingUserIdx === -1) {
          state.users.push({
            id: `user-${s.id}`,
            username: s.admissionNumber,
            admissionNumber: s.admissionNumber,
            role: 'student',
            name: s.name,
            email: s.email,
            phone: s.phone,
            status: s.status,
            password: expectedStudentPass,
            createdAt: new Date().toISOString(),
          });
        } else {
          state.users[existingUserIdx].admissionNumber = s.admissionNumber;
          state.users[existingUserIdx].username = s.admissionNumber;
          if (!state.users[existingUserIdx].password || state.users[existingUserIdx].password === 'student123') {
            state.users[existingUserIdx].password = expectedStudentPass;
          }
        }
      });
    }

    // Systematic rule: ensure super_admin user always exists with password admin123
    if (!state.users) {
      state.users = JSON.parse(JSON.stringify(INITIAL_STATE.users));
    }
    const adminUser = state.users.find((u) => u.role === 'super_admin' || u.username === 'admin');
    if (!adminUser) {
      state.users.unshift({
        id: 'user-admin',
        username: 'admin',
        role: 'super_admin',
        name: 'Ashiq CP Hudawi',
        email: 'admin@school.edu',
        phone: '(555) 100-0001',
        status: 'active',
        password: 'admin123',
        createdAt: new Date().toISOString(),
      });
    } else {
      if (adminUser.name === 'Dr. Evelyn Reed (Super Admin)' || !adminUser.name) {
        adminUser.name = 'Ashiq CP Hudawi';
      }
      if (!adminUser.password) {
        adminUser.password = 'admin123';
      }
    }

    // Systematic rule: ensure all teacher users have a password (defaults to teacher123)
    state.users.forEach((u) => {
      if (u.role === 'teacher' && !u.password) {
        u.password = 'teacher123';
      }
    });

    // Deduplicate student user accounts
    const seenUserKeys = new Set<string>();
    state.users = state.users.filter((u) => {
      const key = u.role === 'student' && u.admissionNumber
        ? `std-adm-${u.admissionNumber.trim().toLowerCase()}`
        : `usr-${u.username.trim().toLowerCase()}`;
      if (seenUserKeys.has(key)) return false;
      seenUserKeys.add(key);
      return true;
    });

    return state;
  }

  private saveLocal() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.error('Error saving local state:', e);
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getState(): DatabaseState & { complaints: ComplaintFeedback[] } {
    const rawComplaints = this.state.complaintsFeedback || [];
    const normalizedComplaints = rawComplaints.map((c) => ({
      ...c,
      title: c.title || c.subject || 'Grievance / Feedback',
      subject: c.subject || c.title || 'Grievance / Feedback',
      submittedAt: c.submittedAt || c.createdAt || new Date().toISOString(),
      createdAt: c.createdAt || c.submittedAt || new Date().toISOString(),
    }));

    return {
      ...this.state,
      complaints: normalizedComplaints,
    };
  }

  public getFirebaseInfo() {
    return {
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      error: this.syncError,
      databaseId: 'ai-studio-studentmarkmanag-a28635d8-791b-4e42-96e4-02e2dcc4ecd6',
      projectId: 'astute-runway-96shk',
    };
  }

  // Helper methods for robust batch Firestore operations
  private async batchDeleteFirestoreDocs(collectionName: string, docIds: string[]): Promise<void> {
    if (!docIds || docIds.length === 0) return;
    for (let i = 0; i < docIds.length; i += 400) {
      const chunk = docIds.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((id) => batch.delete(doc(db, collectionName, id)));
      try {
        await batch.commit();
      } catch (e) {
        console.warn(`Batch delete error in ${collectionName}:`, e);
      }
    }
  }

  private async batchDeleteFirestoreItems(items: { collection: string; id: string }[]): Promise<void> {
    if (!items || items.length === 0) return;
    for (let i = 0; i < items.length; i += 400) {
      const chunk = items.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((item) => batch.delete(doc(db, item.collection, item.id)));
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Batch delete items error:', e);
      }
    }
  }

  public async batchSetFirestoreItems(items: { collection: string; id: string; data: any }[]): Promise<boolean> {
    if (!items || items.length === 0) return true;
    let success = true;
    for (let i = 0; i < items.length; i += 300) {
      const chunk = items.slice(i, i + 300);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const cleaned = cleanForFirestore(item.data);
        batch.set(doc(db, item.collection, item.id), cleaned, { merge: true });
      });
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Batch set items in Firestore failed, retrying individually:', e);
        success = false;
        for (const item of chunk) {
          try {
            await setDoc(doc(db, item.collection, item.id), cleanForFirestore(item.data), { merge: true });
          } catch (singleErr) {
            console.error(`Individual set error in ${item.collection}/${item.id}:`, singleErr);
          }
        }
      }
    }
    return success;
  }

  public async syncWithFirestore(): Promise<boolean> {
    return this.initFirestoreSync();
  }

  // Synchronize with Firestore in background or on user request
  public async initFirestoreSync(): Promise<boolean> {
    if (this.syncPromise) {
      return this.syncPromise;
    }
    this.syncPromise = this.doFirestoreSync().finally(() => {
      this.syncPromise = null;
    });
    return this.syncPromise;
  }

  private async doFirestoreSync(): Promise<boolean> {
    this.syncStatus = 'syncing';
    this.notify();

    try {
      // Check if Firestore has users collection
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        // Seed initial data to Firestore
        const batch = writeBatch(db);
        this.state.users.forEach((u) => {
          batch.set(doc(db, 'users', u.id), u);
        });
        this.state.classes.forEach((c) => {
          batch.set(doc(db, 'classes', c.id), c);
        });
        this.state.students.forEach((s) => {
          batch.set(doc(db, 'students', s.id), s);
        });
        this.state.teachers.forEach((t) => {
          batch.set(doc(db, 'teachers', t.id), t);
        });
        this.state.subjects.forEach((sub) => {
          batch.set(doc(db, 'subjects', sub.id), sub);
        });
        this.state.evaluationLevels.forEach((el) => {
          batch.set(doc(db, 'evaluation_levels', el.id), el);
        });
        this.state.marks.forEach((m) => {
          batch.set(doc(db, 'marks', m.id), m);
        });
        await batch.commit();
        console.log('Successfully seeded database to Firestore');
      } else {
        // Load data from Firestore to keep client state synchronized
        const [
          classesSnap,
          studentsSnap,
          teachersSnap,
          subjectsSnap,
          evalSnap,
          marksSnap,
          logsSnap,
          achievementsSnap,
          behaviorSnap,
          slotsSnap,
          leavesSnap,
          attSnap,
          clearanceSnap,
          complaintsSnap,
          showcaseCardsSnap,
          ttPeriodsSnap,
          ttSlotsSnap,
          ttPeriodsConfigSnap,
          ttSlotsConfigSnap,
        ] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'teachers')),
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'evaluation_levels')),
          getDocs(collection(db, 'marks')),
          getDocs(collection(db, 'audit_logs')),
          getDocs(collection(db, 'achievements')),
          getDocs(collection(db, 'behavior_records')),
          getDocs(collection(db, 'active_hour_slots')),
          getDocs(collection(db, 'leave_applications')),
          getDocs(collection(db, 'attendance_records')),
          getDocs(collection(db, 'attendance_clearances')),
          getDocs(collection(db, 'complaints_feedback')),
          getDocs(collection(db, 'showcase_cards')),
          getDocs(collection(db, 'timetable_periods')).catch(() => ({ empty: true, docs: [] } as any)),
          getDocs(collection(db, 'timetable_slots')).catch(() => ({ empty: true, docs: [] } as any)),
          getDoc(doc(db, 'system_config', 'timetable_periods')).catch(() => ({ exists: () => false, data: () => null } as any)),
          getDoc(doc(db, 'system_config', 'timetable_slots')).catch(() => ({ exists: () => false, data: () => null } as any)),
        ]);

        if (!usersSnap.empty) {
          const uniqueUsersMap = new Map<string, User>();
          const duplicateUserDocIds: string[] = [];

          usersSnap.docs.forEach((d) => {
            const u = d.data() as User;
            if (u.role === 'super_admin' && !u.password) {
              u.password = 'admin123';
            } else if (u.role === 'teacher' && !u.password) {
              u.password = 'teacher123';
            } else if (u.role === 'student' && !u.password) {
              u.password = u.admissionNumber ? `${u.admissionNumber}${u.admissionNumber}${u.admissionNumber}` : 'student123';
            }

            const key = u.role === 'student' && u.admissionNumber
              ? `student-adm-${u.admissionNumber.trim().toLowerCase()}`
              : `user-${u.username?.trim().toLowerCase() || d.id}`;

            if (!uniqueUsersMap.has(key)) {
              uniqueUsersMap.set(key, { ...u, id: u.id || d.id });
            } else {
              duplicateUserDocIds.push(d.id);
            }
          });

          this.state.users = Array.from(uniqueUsersMap.values());

          if (duplicateUserDocIds.length > 0) {
            this.batchDeleteFirestoreDocs('users', duplicateUserDocIds).catch(() => {});
          }

          // Guarantee super_admin user exists
          const hasAdmin = this.state.users.some((u) => u.role === 'super_admin' || u.username === 'admin');
          if (!hasAdmin) {
            const defaultAdmin: User = {
              id: 'user-admin',
              username: 'admin',
              role: 'super_admin',
              name: 'Ashiq CP Hudawi',
              email: 'admin@school.edu',
              phone: '(555) 100-0001',
              status: 'active',
              password: 'admin123',
              createdAt: new Date().toISOString(),
            };
            this.state.users.unshift(defaultAdmin);
            setDoc(doc(db, 'users', 'user-admin'), defaultAdmin, { merge: true }).catch(() => {});
          } else {
            const adminDoc = this.state.users.find((u) => u.role === 'super_admin' || u.username === 'admin');
            if (adminDoc) {
              if (adminDoc.name === 'Dr. Evelyn Reed (Super Admin)' || !adminDoc.name) {
                adminDoc.name = 'Ashiq CP Hudawi';
                setDoc(doc(db, 'users', adminDoc.id), { name: 'Ashiq CP Hudawi' }, { merge: true }).catch(() => {});
              }
              if (!adminDoc.password) {
                adminDoc.password = 'admin123';
                setDoc(doc(db, 'users', adminDoc.id), { password: 'admin123' }, { merge: true }).catch(() => {});
              }
            }
          }
        }

        if (!classesSnap.empty) {
          this.state.classes = classesSnap.docs.map((d) => d.data() as ClassRoom);
        }

        if (!studentsSnap.empty) {
          // Strictly deduplicate students by admission number
          const uniqueStudentsMap = new Map<string, Student>();
          const duplicateStudentDocIds: string[] = [];

          studentsSnap.docs.forEach((d) => {
            const student = d.data() as Student;
            const adm = String(student.admissionNumber || '').trim().toLowerCase();
            const key = adm || d.id;

            if (!uniqueStudentsMap.has(key)) {
              uniqueStudentsMap.set(key, { ...student, id: student.id || d.id });
            } else {
              duplicateStudentDocIds.push(d.id);
            }
          });

          this.state.students = Array.from(uniqueStudentsMap.values());

          if (duplicateStudentDocIds.length > 0) {
            this.batchDeleteFirestoreDocs('students', duplicateStudentDocIds).catch(() => {});
          }
        }

        if (!teachersSnap.empty) {
          this.state.teachers = teachersSnap.docs.map((d) => d.data() as Teacher);
        }

        if (!subjectsSnap.empty) {
          this.state.subjects = subjectsSnap.docs.map((d) => d.data() as Subject);
        }

        if (!evalSnap.empty) {
          this.state.evaluationLevels = evalSnap.docs.map((d) => d.data() as EvaluationLevel);
        }

        if (!marksSnap.empty) {
          this.state.marks = marksSnap.docs.map((d) => {
            const m = d.data() as Mark;
            if (!m.academicYear) {
              const c = this.state.classes.find((cl) => cl.id === m.classId);
              m.academicYear = c?.academicYear || this.state.currentAcademicYear || '2026-2027';
            }
            return m;
          });
        }

        if (!logsSnap.empty) {
          this.state.auditLogs = logsSnap.docs.map((d) => d.data() as AuditLog);
        }

        if (!achievementsSnap.empty) {
          this.state.achievements = achievementsSnap.docs.map((d) => d.data() as Achievement);
        }

        if (!behaviorSnap.empty) {
          this.state.behaviorRecords = behaviorSnap.docs.map((d) => d.data() as BehaviorRecord);
        }

        if (!slotsSnap.empty) {
          this.state.activeHourSlots = slotsSnap.docs.map((d) => d.data() as ActiveHourSlot);
        }

        if (!leavesSnap.empty) {
          this.state.leaveApplications = leavesSnap.docs.map((d) => {
            const l = d.data() as LeaveApplication;
            if (!l.academicYear) {
              const c = this.state.classes.find((cl) => cl.id === l.classId);
              l.academicYear = c?.academicYear || this.state.currentAcademicYear || '2026-2027';
            }
            return l;
          });
        }

        if (!attSnap.empty) {
          this.state.attendanceRecords = attSnap.docs.map((d) => {
            const att = d.data() as AttendanceRecord;
            if (!att.academicYear) {
              const c = this.state.classes.find((cl) => cl.id === att.classId);
              att.academicYear = c?.academicYear || this.state.currentAcademicYear || '2026-2027';
            }
            return att;
          });
        }

        if (!clearanceSnap.empty) {
          this.state.attendanceClearances = clearanceSnap.docs.map((d) => d.data() as AttendanceClearance);
        }

        if (!complaintsSnap.empty) {
          this.state.complaintsFeedback = complaintsSnap.docs.map((d) => d.data() as ComplaintFeedback);
        }

        if (!showcaseCardsSnap.empty) {
          this.state.showcaseCards = showcaseCardsSnap.docs.map((d) => d.data() as ShowcaseCard);
        }

        // Timetable Periods Sync from Firestore (Strictly preserving user customized timings)
        let incomingPeriods: TimetablePeriodDefinition[] = [];
        if (ttPeriodsConfigSnap.exists && ttPeriodsConfigSnap.exists() && Array.isArray(ttPeriodsConfigSnap.data()?.periods)) {
          incomingPeriods = ttPeriodsConfigSnap.data().periods;
        } else if (!ttPeriodsSnap.empty) {
          incomingPeriods = ttPeriodsSnap.docs.map((d) => d.data() as TimetablePeriodDefinition);
        }

        if (incomingPeriods.length > 0) {
          if (!this.state.timetablePeriods || this.state.timetablePeriods.length === 0) {
            this.state.timetablePeriods = incomingPeriods;
          } else {
            // Intelligent merge by id: prioritize currently saved timings unless remote has periods not present locally
            const mergedMap = new Map<string, TimetablePeriodDefinition>();
            // Keep local user-saved periods first
            this.state.timetablePeriods.forEach((p) => {
              if (p?.id) mergedMap.set(p.id, p);
            });
            // Add any remote period that does not exist in local
            incomingPeriods.forEach((rp) => {
              if (rp?.id && !mergedMap.has(rp.id)) {
                mergedMap.set(rp.id, rp);
              }
            });
            this.state.timetablePeriods = Array.from(mergedMap.values());
          }
        }

        // Timetable Slots Sync from Firestore
        if (ttSlotsConfigSnap.exists && ttSlotsConfigSnap.exists() && ttSlotsConfigSnap.data()?.slots) {
          this.state.timetableSlots = ttSlotsConfigSnap.data().slots;
        } else if (!ttSlotsSnap.empty) {
          this.state.timetableSlots = ttSlotsSnap.docs.map((d) => d.data() as TimetableSlot);
        } else {
          this.state.timetableSlots = [];
        }

        // Auto-detect and sync academic years from real classes in Firestore
        const classYears = new Set<string>();
        this.state.classes.forEach((c) => {
          if (c.academicYear?.trim()) {
            classYears.add(c.academicYear.trim());
          }
        });
        if (classYears.size > 0) {
          classYears.forEach((year) => {
            if (!this.state.academicYears.some((ay) => ay.year === year)) {
              this.state.academicYears.push({ id: `ay-${year}`, year, isCurrent: false });
            }
          });
          if (classYears.has('2026-2027')) {
            this.state.currentAcademicYear = '2026-2027';
          } else {
            this.state.currentAcademicYear = Array.from(classYears)[0];
          }
          this.state.academicYears.forEach((ay) => {
            ay.isCurrent = ay.year === this.state.currentAcademicYear;
          });
        }

        // Link Ashiq teacher profile if present without injecting fake demo IDs
        const existingAshiqTeacher = this.state.teachers.find(
          (t) => t.id === 'teacher-1788446643444' || t.username === 'ashiqhudawi' || t.name?.toLowerCase().includes('ashiq')
        );
        if (!existingAshiqTeacher) {
          // If no teacher profile found, add default without fake subjects
          this.state.teachers.unshift({
            id: 'teacher-admin',
            name: 'Ashiq CP Hudawi',
            phone: '(555) 100-0001',
            email: 'admin@school.edu',
            username: 'admin',
            status: 'active',
            assignedSubjectIds: [],
            assignedClassIds: this.state.classes.map((c) => c.id),
            classTeacherOfClassIds: this.state.classes.slice(0, 1).map((c) => c.id),
            createdDate: '2026-09-01',
          });
        }

        this.saveLocal();
      }

      this.syncStatus = 'connected';
      this.lastSyncTime = new Date().toLocaleTimeString();
      this.syncError = null;
      this.notify();
      return true;
    } catch (e: any) {
      console.warn('Firestore sync note:', e);
      this.syncStatus = 'error';
      this.syncError = e?.message || 'Firestore connection or quota issue';
      this.lastSyncTime = new Date().toLocaleTimeString();
      this.notify();
      return false;
    }
  }

  public getSyncStatus() {
    return this.syncStatus;
  }

  public getSyncError() {
    return this.syncError;
  }

  // Restore complete state from exported JSON backup
  public restoreFullBackup(backupData: any): { success: boolean; message: string } {
    try {
      if (!backupData || typeof backupData !== 'object') {
        return { success: false, message: 'Invalid backup file structure.' };
      }
      const source = backupData.collections ? backupData.collections : backupData;

      let restoredCount = 0;
      if (Array.isArray(source.users) && source.users.length > 0) {
        this.state.users = source.users;
        restoredCount += source.users.length;
      }
      if (Array.isArray(source.classes)) {
        this.state.classes = source.classes;
        restoredCount += source.classes.length;
      }
      if (Array.isArray(source.students)) {
        this.state.students = source.students;
        restoredCount += source.students.length;
      }
      if (Array.isArray(source.teachers)) {
        this.state.teachers = source.teachers;
        restoredCount += source.teachers.length;
      }
      if (Array.isArray(source.subjects)) {
        this.state.subjects = source.subjects;
        restoredCount += source.subjects.length;
      }
      const evalLevels = source.evaluation_levels || source.evaluationLevels;
      if (Array.isArray(evalLevels)) {
        this.state.evaluationLevels = evalLevels;
        restoredCount += evalLevels.length;
      }
      if (Array.isArray(source.marks)) {
        this.state.marks = source.marks;
        restoredCount += source.marks.length;
      }
      const attRecords = source.attendance_records || source.attendanceRecords;
      if (Array.isArray(attRecords)) {
        this.state.attendanceRecords = attRecords;
        restoredCount += attRecords.length;
      }
      const leaves = source.leave_applications || source.leaveApplications;
      if (Array.isArray(leaves)) {
        this.state.leaveApplications = leaves;
        restoredCount += leaves.length;
      }
      if (Array.isArray(source.achievements)) {
        this.state.achievements = source.achievements;
        restoredCount += source.achievements.length;
      }
      const behavior = source.behavior_records || source.behaviorRecords;
      if (Array.isArray(behavior)) {
        this.state.behaviorRecords = behavior;
        restoredCount += behavior.length;
      }
      const complaints = source.complaints_feedback || source.complaintsFeedback;
      if (Array.isArray(complaints)) {
        this.state.complaintsFeedback = complaints;
        restoredCount += complaints.length;
      }
      const periods = source.timetable_periods || source.timetablePeriods;
      if (Array.isArray(periods) && periods.length > 0) {
        this.state.timetablePeriods = periods;
        restoredCount += periods.length;
      }
      const slots = source.timetable_slots || source.timetableSlots;
      if (Array.isArray(slots)) {
        this.state.timetableSlots = slots;
        restoredCount += slots.length;
      }
      const years = source.academic_years || source.academicYears;
      if (Array.isArray(years) && years.length > 0) {
        this.state.academicYears = years;
      }
      const cards = source.showcase_cards || source.showcaseCards;
      if (Array.isArray(cards)) {
        this.state.showcaseCards = cards;
        restoredCount += cards.length;
      }

      this.saveLocal();
      this.notify();
      return {
        success: true,
        message: `Successfully restored ${restoredCount} records from backup.`,
      };
    } catch (e: any) {
      console.error('Error restoring backup:', e);
      return { success: false, message: e?.message || 'Failed to restore backup.' };
    }
  }

  // --- USER AUTHENTICATION & CREDENTIALS ---
  public saveLocalState() {
    this.saveLocal();
  }

  // --- ACADEMIC YEAR & SYSTEM SETTINGS ---
  public setCurrentAcademicYear(year: string) {
    this.state.currentAcademicYear = year;
    this.state.academicYears.forEach(ay => {
      ay.isCurrent = ay.year === year;
    });
    this.saveLocal();
    this.notify();
  }

  public addAcademicYear(year: string) {
    const clean = year.trim();
    if (!clean || this.state.academicYears.some((ay) => ay.year.toLowerCase() === clean.toLowerCase())) return;
    const newAy: AcademicYear = { id: `ay-${Date.now()}`, year: clean, isCurrent: false };
    this.state.academicYears.push(newAy);
    this.saveLocal();
    this.notify();
  }

  public deleteAcademicYear(id: string): boolean {
    const target = this.state.academicYears.find((ay) => ay.id === id);
    if (!target) return false;
    if (target.year === this.state.currentAcademicYear) return false;
    this.state.academicYears = this.state.academicYears.filter((ay) => ay.id !== id);
    this.saveLocal();
    this.notify();
    return true;
  }

  public isLevelAddingLocked(): boolean {
    return !!this.state.isLevelAddingLocked;
  }

  public isMarkEntryLocked(): boolean {
    return !!this.state.isMarkEntryLocked;
  }

  public setLevelAddingLocked(locked: boolean, actor?: { id: string; name: string; role: string }) {
    this.state.isLevelAddingLocked = locked;
    this.saveLocal();
    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: locked ? 'Lock Levels' : 'Unlock Levels',
        entity: 'System Settings',
        entityId: 'settings-level-lock',
        details: locked ? 'Locked evaluation level creation and modification' : 'Unlocked evaluation level creation',
      });
    }
    this.notify();
  }

  public setMarkEntryLocked(locked: boolean, actor?: { id: string; name: string; role: string }) {
    this.state.isMarkEntryLocked = locked;
    this.saveLocal();
    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: locked ? 'Lock Mark Entry' : 'Unlock Mark Entry',
        entity: 'System Settings',
        entityId: 'settings-mark-lock',
        details: locked ? 'Locked mark entry system-wide for faculty' : 'Unlocked mark entry system-wide',
      });
    }
    this.notify();
  }

  // --- BULK OPERATIONS ---
  public bulkDeleteStudents(ids: string[], actor?: { id: string; name: string; role: string }) {
    if (!ids.length) return;
    const count = ids.length;
    const idsSet = new Set(ids);

    // Identify targeted students and their admission numbers
    const targetStudents = this.state.students.filter((s) => idsSet.has(s.id));
    const targetAdmissions = new Set(
      targetStudents.map((s) => s.admissionNumber?.trim().toLowerCase()).filter(Boolean) as string[]
    );

    // Filter local state
    this.state.students = this.state.students.filter(
      (s) => !idsSet.has(s.id) && (!s.admissionNumber || !targetAdmissions.has(s.admissionNumber.trim().toLowerCase()))
    );

    const userIdsToDelete: string[] = [];
    this.state.users = this.state.users.filter((u) => {
      const isIdMatch = idsSet.has(u.id.replace('user-', '')) || ids.some((id) => u.id === `user-${id}`);
      const adm = u.admissionNumber?.trim().toLowerCase();
      const isAdmMatch = !!adm && targetAdmissions.has(adm);
      const isMatch = isIdMatch || isAdmMatch;
      if (isMatch) userIdsToDelete.push(u.id);
      return !isMatch;
    });

    const markIdsToDelete: string[] = [];
    this.state.marks = this.state.marks.filter((m) => {
      const isMatch = idsSet.has(m.studentId);
      if (isMatch) markIdsToDelete.push(m.id);
      return !isMatch;
    });

    const achievementIdsToDelete: string[] = [];
    this.state.achievements = (this.state.achievements || []).filter((a) => {
      const isMatch = idsSet.has(a.studentId);
      if (isMatch) achievementIdsToDelete.push(a.id);
      return !isMatch;
    });

    const behaviorIdsToDelete: string[] = [];
    this.state.behaviorRecords = (this.state.behaviorRecords || []).filter((b) => {
      const isMatch = idsSet.has(b.studentId);
      if (isMatch) behaviorIdsToDelete.push(b.id);
      return !isMatch;
    });

    const leaveIdsToDelete: string[] = [];
    this.state.leaveApplications = (this.state.leaveApplications || []).filter((l) => {
      const isMatch = idsSet.has(l.studentId);
      if (isMatch) leaveIdsToDelete.push(l.id);
      return !isMatch;
    });

    const attendanceIdsToDelete: string[] = [];
    this.state.attendanceRecords = (this.state.attendanceRecords || []).filter((att) => {
      const isMatch = idsSet.has(att.studentId);
      if (isMatch) attendanceIdsToDelete.push(att.id);
      return !isMatch;
    });

    const clearanceIdsToDelete: string[] = [];
    this.state.attendanceClearances = (this.state.attendanceClearances || []).filter((clr) => {
      const isMatch = idsSet.has(clr.studentId);
      if (isMatch) clearanceIdsToDelete.push(clr.id);
      return !isMatch;
    });

    const complaintIdsToDelete: string[] = [];
    this.state.complaintsFeedback = (this.state.complaintsFeedback || []).filter((c) => {
      const isMatch = idsSet.has(c.studentId);
      if (isMatch) complaintIdsToDelete.push(c.id);
      return !isMatch;
    });

    this.saveLocal();
    this.notify();

    // Prepare robust Firestore deletions
    const firestoreDeletions: { collection: string; id: string }[] = [];
    ids.forEach((id) => firestoreDeletions.push({ collection: 'students', id }));
    userIdsToDelete.forEach((id) => firestoreDeletions.push({ collection: 'users', id }));
    markIdsToDelete.forEach((id) => firestoreDeletions.push({ collection: 'marks', id }));
    achievementIdsToDelete.forEach((id) => firestoreDeletions.push({ collection: 'achievements', id }));
    behaviorIdsToDelete.forEach((id) => firestoreDeletions.push({ collection: 'behavior_records', id }));
    leaveIdsToDelete.forEach((id) => firestoreDeletions.push({ collection: 'leave_applications', id }));
    attendanceIdsToDelete.forEach((id) => firestoreDeletions.push({ collection: 'attendance_records', id }));
    clearanceIdsToDelete.forEach((id) => firestoreDeletions.push({ collection: 'attendance_clearances', id }));
    complaintIdsToDelete.forEach((id) => firestoreDeletions.push({ collection: 'complaints_feedback', id }));

    this.batchDeleteFirestoreItems(firestoreDeletions).catch((err) => {
      console.warn('Firestore bulk delete error:', err);
    });

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Bulk Deleted Students',
        entity: 'Students',
        entityId: ids.slice(0, 5).join(',') + (ids.length > 5 ? ` +${ids.length - 5} more` : ''),
        details: `Bulk deleted ${count} students and associated records`,
      });
    }
  }

  public bulkUpdateStudentsStatus(
    ids: string[],
    status: 'active' | 'inactive',
    actor?: { id: string; name: string; role: string }
  ) {
    if (!ids.length) return;
    const idsSet = new Set(ids);
    const updatedItems: { collection: string; id: string; data: any }[] = [];

    this.state.students.forEach((s) => {
      if (idsSet.has(s.id)) {
        s.status = status;
        updatedItems.push({ collection: 'students', id: s.id, data: { status } });
      }
    });
    this.state.users.forEach((u) => {
      if (ids.some((id) => u.id === `user-${id}`) || idsSet.has(u.id.replace('user-', ''))) {
        u.status = status;
        updatedItems.push({ collection: 'users', id: u.id, data: { status } });
      }
    });

    this.saveLocal();
    this.notify();
    this.batchSetFirestoreItems(updatedItems).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: `Bulk Status: ${status.toUpperCase()}`,
        entity: 'Students',
        entityId: ids.slice(0, 5).join(',') + (ids.length > 5 ? ` +${ids.length - 5} more` : ''),
        details: `Updated status to ${status} for ${ids.length} students`,
      });
    }
  }

  public bulkAssignStudentsClass(
    ids: string[],
    classId: string,
    actor?: { id: string; name: string; role: string }
  ) {
    if (!ids.length) return;
    const idsSet = new Set(ids);
    const targetClass = this.state.classes.find((c) => c.id === classId);
    const updatedStudents: { collection: string; id: string; data: any }[] = [];

    this.state.students.forEach((s) => {
      if (idsSet.has(s.id)) {
        s.classId = classId;
        updatedStudents.push({ collection: 'students', id: s.id, data: { classId } });
      }
    });

    this.saveLocal();
    this.notify();
    this.batchSetFirestoreItems(updatedStudents).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Bulk Class Reassignment',
        entity: 'Students',
        entityId: ids.slice(0, 5).join(',') + (ids.length > 5 ? ` +${ids.length - 5} more` : ''),
        details: `Reassigned ${ids.length} students to class ${targetClass?.name || classId}`,
      });
    }
  }

  public bulkDeleteTeachers(ids: string[], actor?: { id: string; name: string; role: string }) {
    if (!ids.length) return;
    const idsSet = new Set(ids);
    this.state.teachers = this.state.teachers.filter((t) => !idsSet.has(t.id));
    const userIdsToDelete: string[] = [];
    this.state.users = this.state.users.filter((u) => {
      const isMatch = ids.some((id) => u.id === `user-${id}`) || idsSet.has(u.id.replace('user-', ''));
      if (isMatch) userIdsToDelete.push(u.id);
      return !isMatch;
    });
    this.state.subjects.forEach((s) => {
      if (s.assignedTeacherId && idsSet.has(s.assignedTeacherId)) {
        s.assignedTeacherId = undefined;
      }
    });
    this.state.classes.forEach((c) => {
      if (c.classTeacherId && idsSet.has(c.classTeacherId)) {
        c.classTeacherId = undefined;
      }
    });

    this.saveLocal();
    this.notify();

    const firestoreDeletions = [
      ...ids.map((id) => ({ collection: 'teachers', id })),
      ...userIdsToDelete.map((id) => ({ collection: 'users', id })),
    ];
    this.batchDeleteFirestoreItems(firestoreDeletions).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Bulk Deleted Teachers',
        entity: 'Teachers',
        entityId: ids.join(','),
        details: `Bulk deleted ${ids.length} teachers`,
      });
    }
  }

  public bulkUpdateTeachersStatus(
    ids: string[],
    status: 'active' | 'inactive',
    actor?: { id: string; name: string; role: string }
  ) {
    if (!ids.length) return;
    const idsSet = new Set(ids);
    const updatedItems: { collection: string; id: string; data: any }[] = [];

    this.state.teachers.forEach((t) => {
      if (idsSet.has(t.id)) {
        t.status = status;
        updatedItems.push({ collection: 'teachers', id: t.id, data: { status } });
      }
    });
    this.state.users.forEach((u) => {
      if (ids.some((id) => u.id === `user-${id}`) || idsSet.has(u.id.replace('user-', ''))) {
        u.status = status;
        updatedItems.push({ collection: 'users', id: u.id, data: { status } });
      }
    });

    this.saveLocal();
    this.notify();
    this.batchSetFirestoreItems(updatedItems).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: `Bulk Teacher Status: ${status.toUpperCase()}`,
        entity: 'Teachers',
        entityId: ids.join(','),
        details: `Updated status to ${status} for ${ids.length} teachers`,
      });
    }
  }

  public bulkDeleteClasses(ids: string[], actor?: { id: string; name: string; role: string }) {
    if (!ids.length) return;
    this.state.classes = this.state.classes.filter((c) => !ids.includes(c.id));
    this.saveLocal();
    this.notify();
    this.batchDeleteFirestoreDocs('classes', ids).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Bulk Deleted Classes',
        entity: 'Classes',
        entityId: ids.join(','),
        details: `Bulk deleted ${ids.length} classes`,
      });
    }
  }

  public bulkUpdateClassesAcademicYear(
    ids: string[],
    academicYear: string,
    actor?: { id: string; name: string; role: string }
  ) {
    if (!ids.length) return;
    const idsSet = new Set(ids);
    const updatedClasses: { collection: string; id: string; data: any }[] = [];

    this.state.classes.forEach((c) => {
      if (idsSet.has(c.id)) {
        c.academicYear = academicYear;
        updatedClasses.push({ collection: 'classes', id: c.id, data: { academicYear } });
      }
    });

    this.saveLocal();
    this.notify();
    this.batchSetFirestoreItems(updatedClasses).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Bulk Academic Year Reassignment',
        entity: 'Classes',
        entityId: ids.join(','),
        details: `Set academic year to ${academicYear} for ${ids.length} classes`,
      });
    }
  }

  public bulkUpdateClassesStatus(
    ids: string[],
    status: 'active' | 'inactive',
    actor?: { id: string; name: string; role: string }
  ) {
    if (!ids.length) return;
    const idsSet = new Set(ids);
    const updatedClasses: { collection: string; id: string; data: any }[] = [];

    this.state.classes.forEach((c) => {
      if (idsSet.has(c.id)) {
        c.status = status;
        updatedClasses.push({ collection: 'classes', id: c.id, data: { status } });
      }
    });

    this.saveLocal();
    this.notify();
    this.batchSetFirestoreItems(updatedClasses).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: `Bulk Class Status: ${status.toUpperCase()}`,
        entity: 'Classes',
        entityId: ids.join(','),
        details: `Updated status to ${status} for ${ids.length} classes`,
      });
    }
  }

  public bulkDeleteSubjects(ids: string[], actor?: { id: string; name: string; role: string }) {
    if (!ids.length) return;
    this.state.subjects = this.state.subjects.filter((s) => !ids.includes(s.id));
    const evalLevelIdsToDelete: string[] = [];
    this.state.evaluationLevels = this.state.evaluationLevels.filter((el) => {
      const isMatch = ids.includes(el.subjectId);
      if (isMatch) evalLevelIdsToDelete.push(el.id);
      return !isMatch;
    });
    const markIdsToDelete: string[] = [];
    this.state.marks = this.state.marks.filter((m) => {
      const isMatch = ids.includes(m.subjectId);
      if (isMatch) markIdsToDelete.push(m.id);
      return !isMatch;
    });

    this.saveLocal();
    this.notify();

    const firestoreDeletions = [
      ...ids.map((id) => ({ collection: 'subjects', id })),
      ...evalLevelIdsToDelete.map((id) => ({ collection: 'evaluation_levels', id })),
      ...markIdsToDelete.map((id) => ({ collection: 'marks', id })),
    ];
    this.batchDeleteFirestoreItems(firestoreDeletions).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Bulk Deleted Subjects',
        entity: 'Subjects',
        entityId: ids.join(','),
        details: `Bulk deleted ${ids.length} subjects and associated levels/marks`,
      });
    }
  }

  public bulkUpdateSubjectsStatus(
    ids: string[],
    status: 'active' | 'inactive',
    actor?: { id: string; name: string; role: string }
  ) {
    if (!ids.length) return;
    const idsSet = new Set(ids);
    const updatedSubjects: { collection: string; id: string; data: any }[] = [];

    this.state.subjects.forEach((s) => {
      if (idsSet.has(s.id)) {
        s.status = status;
        updatedSubjects.push({ collection: 'subjects', id: s.id, data: { status } });
      }
    });

    this.saveLocal();
    this.notify();
    this.batchSetFirestoreItems(updatedSubjects).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: `Bulk Subject Status: ${status.toUpperCase()}`,
        entity: 'Subjects',
        entityId: ids.join(','),
        details: `Updated status to ${status} for ${ids.length} subjects`,
      });
    }
  }

  public bulkAssignSubjectsTeacher(
    ids: string[],
    teacherId: string | undefined,
    actor?: { id: string; name: string; role: string }
  ) {
    if (!ids.length) return;
    const idsSet = new Set(ids);
    const targetTeacher = teacherId ? this.state.teachers.find((t) => t.id === teacherId) : null;
    const updatedSubjects: { collection: string; id: string; data: any }[] = [];

    this.state.subjects.forEach((s) => {
      if (idsSet.has(s.id)) {
        s.assignedTeacherId = teacherId || undefined;
        updatedSubjects.push({
          collection: 'subjects',
          id: s.id,
          data: { assignedTeacherId: teacherId || null },
        });
      }
    });

    this.saveLocal();
    this.notify();
    this.batchSetFirestoreItems(updatedSubjects).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Bulk Assign Teacher to Subjects',
        entity: 'Subjects',
        entityId: ids.join(','),
        details: `Assigned ${targetTeacher?.name || 'None'} to ${ids.length} subjects`,
      });
    }
  }

  // --- AUDIT LOG ---
  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    // Persist to firestore asynchronously
    setDoc(doc(db, 'audit_logs', log.id), log).catch(() => {});
    this.saveLocal();
  }

  // --- STUDENTS ---
  public addStudent(
    student: Omit<Student, 'id' | 'createdDate'>,
    tempPassword?: string,
    actor?: { id: string; name: string; role: string }
  ): Student {
    const cleanAdmission = String(student.admissionNumber || '').trim();
    // Deterministic ID derived from admission number to prevent duplicate document proliferation
    const id =
      (student as any).id ||
      (cleanAdmission
        ? `std-${cleanAdmission.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : `std-${Date.now()}`);

    const newStudent: Student = {
      ...student,
      id,
      admissionNumber: cleanAdmission,
      createdDate: (student as any).createdDate || new Date().toISOString().split('T')[0],
    };

    const defaultStudentPassword = `${cleanAdmission}${cleanAdmission}${cleanAdmission}`;

    // Systematic user account for login
    const userId = `user-${id}`;
    const user: User = {
      id: userId,
      username: cleanAdmission,
      admissionNumber: cleanAdmission,
      role: 'student',
      name: student.name,
      email: student.email,
      phone: student.phone,
      status: student.status,
      password: tempPassword || defaultStudentPassword,
      createdAt: new Date().toISOString(),
    };

    // Prevent duplicate insertion in local state
    const existingIdx = this.state.students.findIndex(
      (s) =>
        s.id === id ||
        (cleanAdmission && s.admissionNumber?.trim().toLowerCase() === cleanAdmission.toLowerCase())
    );
    if (existingIdx !== -1) {
      this.state.students[existingIdx] = newStudent;
    } else {
      this.state.students.push(newStudent);
    }

    const existingUserIdx = this.state.users.findIndex(
      (u) =>
        u.id === userId ||
        (cleanAdmission && u.admissionNumber?.trim().toLowerCase() === cleanAdmission.toLowerCase())
    );
    if (existingUserIdx !== -1) {
      this.state.users[existingUserIdx] = user;
    } else {
      this.state.users.push(user);
    }

    setDoc(doc(db, 'students', id), newStudent, { merge: true }).catch(() => {});
    setDoc(doc(db, 'users', user.id), user, { merge: true }).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Added Student',
        entity: 'Student',
        entityId: id,
        details: `Created student ${student.name} (Ad.No: ${student.admissionNumber})`,
      });
    }

    this.saveLocal();
    this.notify();
    return newStudent;
  }

  public updateStudent(
    id: string,
    updates: Partial<Student>,
    actor?: { id: string; name: string; role: string }
  ) {
    const idx = this.state.students.findIndex((s) => s.id === id);
    if (idx !== -1) {
      const prev = this.state.students[idx];
      this.state.students[idx] = { ...prev, ...updates };

      // Update associated user
      const userIdx = this.state.users.findIndex(
        (u) => u.id === `user-${id}` || (prev.admissionNumber && u.admissionNumber === prev.admissionNumber)
      );
      if (userIdx !== -1) {
        this.state.users[userIdx] = {
          ...this.state.users[userIdx],
          name: updates.name || this.state.users[userIdx].name,
          email: updates.email !== undefined ? updates.email : this.state.users[userIdx].email,
          phone: updates.phone !== undefined ? updates.phone : this.state.users[userIdx].phone,
          status: updates.status || this.state.users[userIdx].status,
          admissionNumber: updates.admissionNumber || this.state.users[userIdx].admissionNumber,
        };
        setDoc(doc(db, 'users', this.state.users[userIdx].id), this.state.users[userIdx], { merge: true }).catch(() => {});
      }

      setDoc(doc(db, 'students', id), this.state.students[idx], { merge: true }).catch(() => {});

      if (actor) {
        this.addAuditLog({
          userId: actor.id,
          userName: actor.name,
          role: actor.role,
          action: 'Updated Student',
          entity: 'Student',
          entityId: id,
          details: `Updated details for ${this.state.students[idx].name}`,
        });
      }

      this.saveLocal();
      this.notify();
    }
  }

  public deleteStudent(id: string, actor?: { id: string; name: string; role: string }) {
    const student = this.state.students.find((s) => s.id === id);
    const targetAdm = student?.admissionNumber?.trim().toLowerCase();

    // Filter local state
    this.state.students = this.state.students.filter(
      (s) => s.id !== id && (!targetAdm || s.admissionNumber?.trim().toLowerCase() !== targetAdm)
    );

    const userIdsToDelete: string[] = [];
    this.state.users = this.state.users.filter((u) => {
      const isIdMatch = u.id === `user-${id}` || u.id.replace('user-', '') === id;
      const isAdmMatch = !!targetAdm && u.admissionNumber?.trim().toLowerCase() === targetAdm;
      const isMatch = isIdMatch || isAdmMatch;
      if (isMatch) userIdsToDelete.push(u.id);
      return !isMatch;
    });

    const markIdsToDelete: string[] = [];
    this.state.marks = this.state.marks.filter((m) => {
      const isMatch = m.studentId === id;
      if (isMatch) markIdsToDelete.push(m.id);
      return !isMatch;
    });

    const achievementIdsToDelete: string[] = [];
    this.state.achievements = (this.state.achievements || []).filter((a) => {
      const isMatch = a.studentId === id;
      if (isMatch) achievementIdsToDelete.push(a.id);
      return !isMatch;
    });

    const behaviorIdsToDelete: string[] = [];
    this.state.behaviorRecords = (this.state.behaviorRecords || []).filter((b) => {
      const isMatch = b.studentId === id;
      if (isMatch) behaviorIdsToDelete.push(b.id);
      return !isMatch;
    });

    const leaveIdsToDelete: string[] = [];
    this.state.leaveApplications = (this.state.leaveApplications || []).filter((l) => {
      const isMatch = l.studentId === id;
      if (isMatch) leaveIdsToDelete.push(l.id);
      return !isMatch;
    });

    const attendanceIdsToDelete: string[] = [];
    this.state.attendanceRecords = (this.state.attendanceRecords || []).filter((att) => {
      const isMatch = att.studentId === id;
      if (isMatch) attendanceIdsToDelete.push(att.id);
      return !isMatch;
    });

    const clearanceIdsToDelete: string[] = [];
    this.state.attendanceClearances = (this.state.attendanceClearances || []).filter((clr) => {
      const isMatch = clr.studentId === id;
      if (isMatch) clearanceIdsToDelete.push(clr.id);
      return !isMatch;
    });

    const complaintIdsToDelete: string[] = [];
    this.state.complaintsFeedback = (this.state.complaintsFeedback || []).filter((c) => {
      const isMatch = c.studentId === id;
      if (isMatch) complaintIdsToDelete.push(c.id);
      return !isMatch;
    });

    this.saveLocal();
    this.notify();

    // Delete from Firestore
    const itemsToDelete: { collection: string; id: string }[] = [
      { collection: 'students', id },
      ...userIdsToDelete.map((uid) => ({ collection: 'users', id: uid })),
      ...markIdsToDelete.map((mid) => ({ collection: 'marks', id: mid })),
      ...achievementIdsToDelete.map((aid) => ({ collection: 'achievements', id: aid })),
      ...behaviorIdsToDelete.map((bid) => ({ collection: 'behavior_records', id: bid })),
      ...leaveIdsToDelete.map((lid) => ({ collection: 'leave_applications', id: lid })),
      ...attendanceIdsToDelete.map((attId) => ({ collection: 'attendance_records', id: attId })),
      ...clearanceIdsToDelete.map((cid) => ({ collection: 'attendance_clearances', id: cid })),
      ...complaintIdsToDelete.map((cmpId) => ({ collection: 'complaints_feedback', id: cmpId })),
    ];
    this.batchDeleteFirestoreItems(itemsToDelete).catch(() => {});

    // Resilient fallback direct deletion
    deleteDoc(doc(db, 'students', id)).catch(() => {});
    userIdsToDelete.forEach((uid) => deleteDoc(doc(db, 'users', uid)).catch(() => {}));

    if (actor && student) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Student',
        entity: 'Student',
        entityId: id,
        details: `Deleted student ${student.name} (Ad.No: ${student.admissionNumber})`,
      });
    }
  }

  // --- TEACHERS ---
  public addTeacher(teacher: Omit<Teacher, 'id' | 'createdDate'>, password?: string, actor?: { id: string; name: string; role: string }): Teacher {
    const id = `teacher-${Date.now()}`;
    const newTeacher: Teacher = {
      ...teacher,
      id,
      createdDate: new Date().toISOString().split('T')[0],
    };

    const user: User = {
      id: `user-${id}`,
      username: teacher.username,
      role: 'teacher',
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      status: teacher.status,
      password: password || 'teacher123',
      createdAt: new Date().toISOString(),
    };

    this.state.teachers.push(newTeacher);
    this.state.users.push(user);

    setDoc(doc(db, 'teachers', id), newTeacher).catch(() => {});
    setDoc(doc(db, 'users', user.id), user).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Added Teacher',
        entity: 'Teacher',
        entityId: id,
        details: `Created teacher ${teacher.name} (${teacher.email})`,
      });
    }

    this.saveLocal();
    return newTeacher;
  }

  public updateTeacher(
    id: string,
    updates: Partial<Teacher>,
    newPasswordOrActor?: string | { id: string; name: string; role: string },
    actor?: { id: string; name: string; role: string }
  ) {
    let newPassword: string | undefined;
    let actualActor = actor;
    if (typeof newPasswordOrActor === 'string') {
      newPassword = newPasswordOrActor;
    } else if (newPasswordOrActor && typeof newPasswordOrActor === 'object') {
      actualActor = newPasswordOrActor;
    }

    const idx = this.state.teachers.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const prev = this.state.teachers[idx];
      this.state.teachers[idx] = { ...prev, ...updates };

      const userIdx = this.state.users.findIndex(
        (u) => u.id === `user-${id}` || u.username === prev.username
      );
      if (userIdx !== -1) {
        this.state.users[userIdx] = {
          ...this.state.users[userIdx],
          name: updates.name || this.state.users[userIdx].name,
          username: updates.username || this.state.users[userIdx].username,
          email: updates.email !== undefined ? updates.email : this.state.users[userIdx].email,
          phone: updates.phone !== undefined ? updates.phone : this.state.users[userIdx].phone,
          status: updates.status || this.state.users[userIdx].status,
          password: newPassword ? newPassword : this.state.users[userIdx].password,
        };
        setDoc(doc(db, 'users', this.state.users[userIdx].id), this.state.users[userIdx]).catch(() => {});
      }

      setDoc(doc(db, 'teachers', id), this.state.teachers[idx]).catch(() => {});

      if (actualActor) {
        this.addAuditLog({
          userId: actualActor.id,
          userName: actualActor.name,
          role: actualActor.role,
          action: 'Updated Teacher',
          entity: 'Teacher',
          entityId: id,
          details: `Updated teacher profile for ${this.state.teachers[idx].name}${newPassword ? ' (including login credentials)' : ''}`,
        });
      }

      this.saveLocal();
    }
  }

  public getTeacherCredentials(teacherId: string): { username: string; password?: string } | null {
    const teacher = this.state.teachers.find((t) => t.id === teacherId);
    if (!teacher) return null;
    const user = this.state.users.find(
      (u) => u.id === `user-${teacherId}` || u.username === teacher.username || (teacher.email && u.email === teacher.email)
    );
    return {
      username: teacher.username,
      password: user?.password || 'teacher123',
    };
  }

  public deleteTeacher(id: string, actor?: { id: string; name: string; role: string }) {
    const teacher = this.state.teachers.find((t) => t.id === id);
    this.state.teachers = this.state.teachers.filter((t) => t.id !== id);
    this.state.users = this.state.users.filter((u) => u.id !== `user-${id}`);

    deleteDoc(doc(db, 'teachers', id)).catch(() => {});

    if (actor && teacher) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Teacher',
        entity: 'Teacher',
        entityId: id,
        details: `Deleted teacher ${teacher.name}`,
      });
    }

    this.saveLocal();
  }

  // --- CLASSES ---
  public addClass(classRoom: Omit<ClassRoom, 'id'>, actor?: { id: string; name: string; role: string }): ClassRoom {
    const id = `class-${Date.now()}`;
    const newClass: ClassRoom = {
      ...classRoom,
      id,
    };
    this.state.classes.push(newClass);
    setDoc(doc(db, 'classes', id), newClass).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Created Class',
        entity: 'Class',
        entityId: id,
        details: `Created class ${newClass.name} (${newClass.academicYear})`,
      });
    }

    this.saveLocal();
    return newClass;
  }

  public updateClass(id: string, updates: Partial<ClassRoom>, actor?: { id: string; name: string; role: string }) {
    const idx = this.state.classes.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.state.classes[idx] = { ...this.state.classes[idx], ...updates };
      setDoc(doc(db, 'classes', id), this.state.classes[idx]).catch(() => {});

      if (actor) {
        this.addAuditLog({
          userId: actor.id,
          userName: actor.name,
          role: actor.role,
          action: 'Updated Class',
          entity: 'Class',
          entityId: id,
          details: `Updated class ${this.state.classes[idx].name}`,
        });
      }

      this.saveLocal();
    }
  }

  public deleteClass(id: string, actor?: { id: string; name: string; role: string }) {
    const classRoom = this.state.classes.find((c) => c.id === id);
    this.state.classes = this.state.classes.filter((c) => c.id !== id);
    deleteDoc(doc(db, 'classes', id)).catch(() => {});

    if (actor && classRoom) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Class',
        entity: 'Class',
        entityId: id,
        details: `Deleted class ${classRoom.name}`,
      });
    }

    this.saveLocal();
  }

  // --- SUBJECTS ---
  public addSubject(subject: Omit<Subject, 'id'>, actor?: { id: string; name: string; role: string }): Subject {
    const id = `sub-${Date.now()}`;
    const newSubject: Subject = {
      ...subject,
      id,
    };
    this.state.subjects.push(newSubject);
    setDoc(doc(db, 'subjects', id), newSubject).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Created Subject',
        entity: 'Subject',
        entityId: id,
        details: `Created subject ${newSubject.name} (${newSubject.code})`,
      });
    }

    this.saveLocal();
    return newSubject;
  }

  public updateSubject(id: string, updates: Partial<Subject>, actor?: { id: string; name: string; role: string }) {
    const idx = this.state.subjects.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.state.subjects[idx] = { ...this.state.subjects[idx], ...updates };
      setDoc(doc(db, 'subjects', id), this.state.subjects[idx]).catch(() => {});

      if (actor) {
        this.addAuditLog({
          userId: actor.id,
          userName: actor.name,
          role: actor.role,
          action: 'Updated Subject',
          entity: 'Subject',
          entityId: id,
          details: `Updated subject ${this.state.subjects[idx].name}`,
        });
      }

      this.saveLocal();
    }
  }

  public deleteSubject(id: string, actor?: { id: string; name: string; role: string }) {
    const subject = this.state.subjects.find((s) => s.id === id);
    this.state.subjects = this.state.subjects.filter((s) => s.id !== id);
    this.state.evaluationLevels = this.state.evaluationLevels.filter((el) => el.subjectId !== id);
    this.state.marks = this.state.marks.filter((m) => m.subjectId !== id);

    deleteDoc(doc(db, 'subjects', id)).catch(() => {});

    if (actor && subject) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Subject',
        entity: 'Subject',
        entityId: id,
        details: `Deleted subject ${subject.name}`,
      });
    }

    this.saveLocal();
  }

  // --- EVALUATION LEVELS ---
  public addEvaluationLevel(level: Omit<EvaluationLevel, 'id'>, actor?: { id: string; name: string; role: string }): EvaluationLevel {
    const id = `eval-${Date.now()}`;
    const newLevel: EvaluationLevel = {
      ...level,
      id,
    };
    this.state.evaluationLevels.push(newLevel);
    setDoc(doc(db, 'evaluation_levels', id), newLevel).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Added Evaluation Level',
        entity: 'EvaluationLevel',
        entityId: id,
        details: `Added ${newLevel.name} (Max: ${newLevel.maximumMark}) to subject`,
      });
    }

    this.saveLocal();
    return newLevel;
  }

  public updateEvaluationLevel(id: string, updates: Partial<EvaluationLevel>, actor?: { id: string; name: string; role: string }) {
    const idx = this.state.evaluationLevels.findIndex((el) => el.id === id);
    if (idx !== -1) {
      const prev = this.state.evaluationLevels[idx];
      this.state.evaluationLevels[idx] = { ...prev, ...updates };

      // Update maximumMark in marks if changed
      if (updates.maximumMark !== undefined && updates.maximumMark !== prev.maximumMark) {
        this.state.marks = this.state.marks.map((m) => {
          if (m.evaluationLevelId === id) {
            return {
              ...m,
              maximumMark: updates.maximumMark!,
            };
          }
          return m;
        });
      }

      setDoc(doc(db, 'evaluation_levels', id), this.state.evaluationLevels[idx]).catch(() => {});

      if (actor) {
        this.addAuditLog({
          userId: actor.id,
          userName: actor.name,
          role: actor.role,
          action: 'Updated Evaluation Level',
          entity: 'EvaluationLevel',
          entityId: id,
          details: `Updated level ${prev.name} (Max: ${updates.maximumMark || prev.maximumMark})`,
        });
      }

      this.saveLocal();
    }
  }

  public deleteEvaluationLevel(id: string, actor?: { id: string; name: string; role: string }) {
    const level = this.state.evaluationLevels.find((el) => el.id === id);
    this.state.evaluationLevels = this.state.evaluationLevels.filter((el) => el.id !== id);
    this.state.marks = this.state.marks.filter((m) => m.evaluationLevelId !== id);

    deleteDoc(doc(db, 'evaluation_levels', id)).catch(() => {});

    if (actor && level) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Evaluation Level',
        entity: 'EvaluationLevel',
        entityId: id,
        details: `Deleted level ${level.name}`,
      });
    }

    this.saveLocal();
  }

  // --- MARKS ---
  public saveMarks(
    marksToSave: {
      studentId: string;
      classId: string;
      subjectId: string;
      evaluationLevelId: string;
      maximumMark: number;
      obtainedMark: number | null;
      date?: string;
    }[],
    actor: { id: string; name: string; role: string }
  ) {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    marksToSave.forEach((m) => {
      const classObj = this.state.classes.find((c) => c.id === m.classId);
      const targetAcademicYear = classObj?.academicYear || this.state.currentAcademicYear || '2026-2027';

      const existingIdx = this.state.marks.findIndex(
        (existing) =>
          existing.studentId === m.studentId &&
          existing.subjectId === m.subjectId &&
          existing.evaluationLevelId === m.evaluationLevelId
      );

      if (existingIdx !== -1) {
        if (m.obtainedMark === null) {
          // If cleared
          this.state.marks[existingIdx] = {
            ...this.state.marks[existingIdx],
            obtainedMark: null,
            lastUpdated: now,
            enteredBy: actor.name,
            academicYear: this.state.marks[existingIdx].academicYear || targetAcademicYear,
          };
        } else {
          this.state.marks[existingIdx] = {
            ...this.state.marks[existingIdx],
            obtainedMark: m.obtainedMark,
            maximumMark: m.maximumMark,
            date: m.date || today,
            enteredBy: actor.name,
            lastUpdated: now,
            academicYear: targetAcademicYear,
          };
        }
        setDoc(doc(db, 'marks', this.state.marks[existingIdx].id), cleanForFirestore(this.state.marks[existingIdx])).catch(() => {});
      } else if (m.obtainedMark !== null) {
        const id = `mark-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newMark: Mark = {
          id,
          studentId: m.studentId,
          classId: m.classId,
          subjectId: m.subjectId,
          evaluationLevelId: m.evaluationLevelId,
          maximumMark: m.maximumMark,
          obtainedMark: m.obtainedMark,
          date: m.date || today,
          enteredBy: actor.name,
          lastUpdated: now,
          academicYear: targetAcademicYear,
        };
        this.state.marks.push(newMark);
        setDoc(doc(db, 'marks', id), cleanForFirestore(newMark)).catch(() => {});
      }
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.name,
      role: actor.role,
      action: 'Saved Marks',
      entity: 'Mark',
      entityId: marksToSave[0]?.subjectId || 'bulk',
      details: `Saved ${marksToSave.length} mark entries`,
    });

    this.saveLocal();
  }

  // --- PASSWORD UPDATE ---
  public changePassword(userId: string, newPass: string) {
    const user = this.state.users.find((u) => u.id === userId);
    if (user) {
      user.password = newPass;
      user.updatedAt = new Date().toISOString();
      setDoc(doc(db, 'users', userId), user).catch(() => {});
      this.saveLocal();
      return true;
    }
    return false;
  }

  // --- BULK IMPORT ---
  public bulkImportStudents(students: any[], actor?: { id: string; name: string; role: string }) {
    let imported = 0;
    const defaultActor = actor || { id: 'admin', name: 'Administrator', role: 'super_admin' };
    const itemsToSave: { collection: string; id: string; data: any }[] = [];

    // 1. Deduplicate incoming array by admission number to prevent duplicate rows within the same file
    const seenInBatch = new Set<string>();
    const uniqueIncomingStudents = students.filter((s) => {
      const cleanAdm = String(s.admissionNumber || '').replace(/\.0$/, '').trim().toLowerCase();
      if (!cleanAdm) return false;
      if (seenInBatch.has(cleanAdm)) return false;
      seenInBatch.add(cleanAdm);
      return true;
    });

    uniqueIncomingStudents.forEach((s) => {
      let targetClassName = String(s.className || '').trim();
      let classRoom = null;

      if (s.classId) {
        classRoom = this.state.classes.find((c) => c.id === s.classId);
      }
      if (!classRoom && targetClassName) {
        classRoom = this.state.classes.find(
          (c) =>
            c.name.trim().toLowerCase() === targetClassName.toLowerCase() ||
            c.name.replace(/\s+/g, '').toLowerCase() === targetClassName.replace(/\s+/g, '').toLowerCase()
        );
      }
      if (!classRoom && targetClassName) {
        classRoom = this.addClass(
          {
            name: targetClassName,
            academicYear: this.state.currentAcademicYear || '2025-2026',
            status: 'active',
          },
          defaultActor
        );
      }
      if (!classRoom && this.state.classes.length > 0) {
        classRoom = this.state.classes[0];
      }

      if (classRoom) {
        const cleanAdmission = String(s.admissionNumber || '').replace(/\.0$/, '').trim();
        if (!cleanAdmission) return;

        const defaultStudentPassword = `${cleanAdmission}${cleanAdmission}${cleanAdmission}`;
        const pass = s.password || defaultStudentPassword;

        // Check if student already exists with this admission number
        const existingStudentIdx = this.state.students.findIndex(
          (std) => std.admissionNumber.trim().toLowerCase() === cleanAdmission.toLowerCase()
        );

        if (existingStudentIdx !== -1) {
          // Update existing student
          const existing = this.state.students[existingStudentIdx];
          const updatedStudent: Student = {
            ...existing,
            name: String(s.name || existing.name).trim(),
            classId: classRoom.id,
            phone: s.phone !== undefined ? String(s.phone).trim() : existing.phone,
            email: s.email !== undefined ? String(s.email).trim() : existing.email,
            username: cleanAdmission,
            status: 'active',
          };
          this.state.students[existingStudentIdx] = updatedStudent;
          itemsToSave.push({ collection: 'students', id: existing.id, data: updatedStudent });

          // Update user account
          const userIdx = this.state.users.findIndex(
            (u) =>
              u.id === `user-${existing.id}` ||
              u.admissionNumber?.trim().toLowerCase() === cleanAdmission.toLowerCase()
          );
          if (userIdx !== -1) {
            this.state.users[userIdx] = {
              ...this.state.users[userIdx],
              name: updatedStudent.name,
              email: updatedStudent.email,
              phone: updatedStudent.phone,
              status: 'active',
              username: cleanAdmission,
              admissionNumber: cleanAdmission,
            };
            itemsToSave.push({
              collection: 'users',
              id: this.state.users[userIdx].id,
              data: this.state.users[userIdx],
            });
          }
          imported++;
        } else {
          // Create new student with deterministic ID
          const id = `std-${cleanAdmission.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const newStudent: Student = {
            id,
            admissionNumber: cleanAdmission,
            name: String(s.name || '').trim(),
            classId: classRoom.id,
            phone: String(s.phone || '').trim(),
            email: String(s.email || '').trim(),
            username: cleanAdmission,
            status: 'active',
            createdDate: new Date().toISOString().split('T')[0],
          };

          const user: User = {
            id: `user-${id}`,
            username: cleanAdmission,
            admissionNumber: cleanAdmission,
            role: 'student',
            name: newStudent.name,
            email: newStudent.email,
            phone: newStudent.phone,
            status: 'active',
            password: pass,
            createdAt: new Date().toISOString(),
          };

          this.state.students.push(newStudent);
          this.state.users.push(user);

          itemsToSave.push({ collection: 'students', id, data: newStudent });
          itemsToSave.push({ collection: 'users', id: user.id, data: user });
          imported++;
        }
      }
    });

    this.saveLocal();
    this.notify();

    // Batch commit to Firestore
    if (itemsToSave.length > 0) {
      this.batchSetFirestoreItems(itemsToSave).catch((e) => {
        console.warn('Firestore bulkImportStudents batch set error:', e);
      });
    }

    this.addAuditLog({
      userId: defaultActor.id,
      userName: defaultActor.name,
      role: defaultActor.role,
      action: 'Bulk Imported Students',
      entity: 'Students',
      entityId: `batch-${Date.now()}`,
      details: `Bulk imported/synchronized ${imported} student records`,
    });

    return imported;
  }

  public bulkImportTeachers(teachers: any[], actor?: { id: string; name: string; role: string }) {
    let imported = 0;
    const defaultActor = actor || { id: 'admin', name: 'Administrator', role: 'super_admin' };
    const itemsToSave: { collection: string; id: string; data: any }[] = [];

    teachers.forEach((t) => {
      const name = String(t.name || '').trim();
      if (!name) return;

      // Map assigned class names to IDs if provided
      const assignedClassIds: string[] = [];
      if (Array.isArray(t.assignedClasses)) {
        t.assignedClasses.forEach((cName: string) => {
          const target = String(cName).trim();
          const c = this.state.classes.find(
            (cls) =>
              cls.name.trim().toLowerCase() === target.toLowerCase() ||
              cls.name.replace(/\s+/g, '').toLowerCase() === target.replace(/\s+/g, '').toLowerCase()
          );
          if (c) assignedClassIds.push(c.id);
        });
      }

      // Check if teacher already exists by username or email
      const username = String(t.username || t.email?.split('@')[0] || `teacher_${Date.now()}`).trim();
      const existing = this.state.teachers.find(
        (teach) =>
          teach.username.toLowerCase() === username.toLowerCase() ||
          (t.email && teach.email && teach.email.toLowerCase() === String(t.email).trim().toLowerCase())
      );

      if (!existing) {
        const id = `teacher-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newTeacher: Teacher = {
          id,
          name,
          phone: String(t.phone || '').trim(),
          email: String(t.email || '').trim(),
          username,
          status: 'active',
          assignedSubjectIds: [],
          assignedClassIds,
          classTeacherOfClassIds: [],
          createdDate: new Date().toISOString().split('T')[0],
        };

        const user: User = {
          id: `user-${id}`,
          username,
          role: 'teacher',
          name,
          email: newTeacher.email,
          phone: newTeacher.phone,
          status: 'active',
          password: t.password || 'teacher123',
          createdAt: new Date().toISOString(),
        };

        this.state.teachers.push(newTeacher);
        this.state.users.push(user);
        itemsToSave.push({ collection: 'teachers', id, data: newTeacher });
        itemsToSave.push({ collection: 'users', id: user.id, data: user });
        imported++;
      }
    });

    this.saveLocal();
    this.notify();

    if (itemsToSave.length > 0) {
      this.batchSetFirestoreItems(itemsToSave).catch(() => {});
    }

    return imported;
  }

  public bulkImportClasses(classes: any[], actor?: { id: string; name: string; role: string }) {
    let imported = 0;
    const defaultActor = actor || { id: 'admin', name: 'Administrator', role: 'super_admin' };
    const itemsToSave: { collection: string; id: string; data: any }[] = [];

    classes.forEach((c) => {
      const className = String(c.name || '').trim();
      if (!className) return;

      // Skip if class already exists
      const existing = this.state.classes.find(
        (cls) =>
          cls.name.trim().toLowerCase() === className.toLowerCase() ||
          cls.name.replace(/\s+/g, '').toLowerCase() === className.replace(/\s+/g, '').toLowerCase()
      );

      if (!existing) {
        let teacherId: string | undefined;
        if (c.classTeacher) {
          const teacherTarget = String(c.classTeacher).trim().toLowerCase();
          const teacher = this.state.teachers.find(
            (t) =>
              t.name.trim().toLowerCase() === teacherTarget ||
              t.email.trim().toLowerCase() === teacherTarget
          );
          if (teacher) teacherId = teacher.id;
        }

        const id = `class-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newClass: ClassRoom = {
          id,
          name: className,
          academicYear: String(c.academicYear || this.state.currentAcademicYear || '2025-2026').trim(),
          classTeacherId: teacherId,
          status: 'active',
        };

        this.state.classes.push(newClass);
        itemsToSave.push({ collection: 'classes', id, data: newClass });
        imported++;
      }
    });

    this.saveLocal();
    this.notify();

    if (itemsToSave.length > 0) {
      this.batchSetFirestoreItems(itemsToSave).catch(() => {});
    }

    return imported;
  }

  public bulkImportSubjects(subjects: any[], actor?: { id: string; name: string; role: string }) {
    let imported = 0;
    const defaultActor = actor || { id: 'admin', name: 'Administrator', role: 'super_admin' };
    const itemsToSave: { collection: string; id: string; data: any }[] = [];

    subjects.forEach((s) => {
      const targetClassName = String(s.className || '').trim();
      const subjectName = String(s.name || '').trim();
      const code = String(s.code || '').trim();
      if (!subjectName || !code) return;

      // Find class or auto-create
      let classRoom = this.state.classes.find(
        (c) =>
          c.name.trim().toLowerCase() === targetClassName.toLowerCase() ||
          c.name.replace(/\s+/g, '').toLowerCase() === targetClassName.replace(/\s+/g, '').toLowerCase()
      );

      if (!classRoom && targetClassName) {
        classRoom = this.addClass(
          {
            name: targetClassName,
            academicYear: this.state.currentAcademicYear || '2025-2026',
            status: 'active',
          },
          defaultActor
        );
      }

      if (classRoom) {
        // Skip duplicate subject in same class
        const existing = this.state.subjects.find(
          (sub) =>
            sub.classId === classRoom!.id &&
            (sub.code.toLowerCase() === code.toLowerCase() || sub.name.toLowerCase() === subjectName.toLowerCase())
        );

        if (!existing) {
          let teacherId: string | undefined;
          if (s.assignedTeacher) {
            const teacherTarget = String(s.assignedTeacher).trim().toLowerCase();
            const teacher = this.state.teachers.find(
              (t) =>
                t.name.trim().toLowerCase() === teacherTarget ||
                t.email.trim().toLowerCase() === teacherTarget
            );
            if (teacher) teacherId = teacher.id;
          }

          const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const newSubject: Subject = {
            id,
            name: subjectName,
            code,
            classId: classRoom.id,
            assignedTeacherId: teacherId,
            status: 'active',
          };

          this.state.subjects.push(newSubject);
          itemsToSave.push({ collection: 'subjects', id, data: newSubject });
          imported++;
        }
      }
    });

    this.saveLocal();
    this.notify();

    if (itemsToSave.length > 0) {
      this.batchSetFirestoreItems(itemsToSave).catch(() => {});
    }

    return imported;
  }

  // Alias methods for import
  public importStudents(students: any[], actor?: { id: string; name: string; role: string }) {
    return this.bulkImportStudents(students, actor);
  }

  public importTeachers(teachers: any[], actor?: { id: string; name: string; role: string }) {
    return this.bulkImportTeachers(teachers, actor);
  }

  public importClasses(classes: any[], actor?: { id: string; name: string; role: string }) {
    return this.bulkImportClasses(classes, actor);
  }

  public importSubjects(subjects: any[], actor?: { id: string; name: string; role: string }) {
    return this.bulkImportSubjects(subjects, actor);
  }

  public saveMarksBatch(
    subjectId: string,
    marks: { studentId: string; subjectId: string; evaluationLevelId: string; obtainedMark: number }[],
    actor?: { id: string; name: string; role: string }
  ): number {
    const defaultActor = actor || { id: 'admin', name: 'Administrator', role: 'super_admin' };
    const subject = this.state.subjects.find((s) => s.id === subjectId);
    const classId = subject?.classId || '';

    const payload = marks.map((m) => {
      const level = this.state.evaluationLevels.find((l) => l.id === m.evaluationLevelId);
      return {
        studentId: m.studentId,
        classId,
        subjectId: m.subjectId,
        evaluationLevelId: m.evaluationLevelId,
        maximumMark: level?.maximumMark ?? 100,
        obtainedMark: m.obtainedMark,
      };
    });

    this.saveMarks(payload, defaultActor);
    return marks.length;
  }

  // ==========================================
  // 👤 EXTENDED STUDENT PROFILE & TEACHER NOTES
  // ==========================================
  public updateStudentExtendedProfile(
    id: string,
    updates: Partial<Student>,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    const idx = this.state.students.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    const student = this.state.students[idx];
    const updated: Student = {
      ...student,
      ...updates,
      guardian: updates.guardian ? { ...(student.guardian || {}), ...updates.guardian } : student.guardian,
    };
    this.state.students[idx] = updated;

    // Sync corresponding user info if name, phone, or email changed
    const userIdx = this.state.users.findIndex(
      (u) => u.admissionNumber === student.admissionNumber || u.id === `user-${student.id}`
    );
    if (userIdx !== -1) {
      if (updates.name) this.state.users[userIdx].name = updates.name;
      if (updates.phone) this.state.users[userIdx].phone = updates.phone;
      if (updates.email) this.state.users[userIdx].email = updates.email;
      setDoc(doc(db, 'users', this.state.users[userIdx].id), this.state.users[userIdx], { merge: true }).catch(() => {});
    }

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Updated Student Profile',
        entity: 'Student',
        entityId: id,
        details: `Updated dossier for student ${student.name} (${student.admissionNumber})`,
      });
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'students', id), updated, { merge: true }).catch(() => {});
    return true;
  }

  public updateClassTeacherNotes(
    studentId: string,
    notes: Partial<ClassTeacherNotes>,
    actor: { id: string; name: string; role: string }
  ): boolean {
    const idx = this.state.students.findIndex((s) => s.id === studentId);
    if (idx === -1) return false;

    const student = this.state.students[idx];

    // RBAC Check: Only Super Admin or the appointed Class Teacher can edit notes
    if (actor && actor.role !== 'super_admin') {
      const studentClass = this.state.classes.find((c) => c.id === student.classId);
      const teacher = this.state.teachers.find(
        (t) => t.id === actor.id || t.username === actor.name || `user-${t.id}` === actor.id
      );
      const isClassTeacher =
        (studentClass && teacher && studentClass.classTeacherId === teacher.id) ||
        (student.classId && teacher?.classTeacherOfClassIds?.includes(student.classId));

      if (!isClassTeacher) {
        console.warn('Unauthorized class teacher notes modification attempt by', actor);
        return false;
      }
    }

    const updatedNotes: ClassTeacherNotes = {
      ...(student.classTeacherNotes || {}),
      ...notes,
      lastUpdated: new Date().toISOString(),
      updatedBy: actor.id,
      updatedByName: actor.name,
    };

    this.state.students[idx] = {
      ...student,
      classTeacherNotes: updatedNotes,
    };

    this.addAuditLog({
      userId: actor.id,
      userName: actor.name,
      role: actor.role,
      action: 'Updated Class Teacher Notes',
      entity: 'Student',
      entityId: studentId,
      details: `Class teacher notes saved for student ${student.name} (${student.admissionNumber})`,
    });

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'students', studentId), { classTeacherNotes: updatedNotes }, { merge: true }).catch(() => {});
    return true;
  }

  // ==========================================
  // 🏆 ACHIEVEMENTS CRUD
  // ==========================================
  public addAchievement(
    item: Omit<Achievement, 'id' | 'createdDate'>,
    actor?: { id: string; name: string; role: string }
  ): Achievement {
    const id = `ach-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAchievement: Achievement = {
      ...item,
      id,
      createdDate: new Date().toISOString(),
    };

    this.state.achievements.unshift(newAchievement);
    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Added Achievement',
        entity: 'Achievement',
        entityId: id,
        details: `Added ${item.category} achievement: "${item.title}" for student ${item.studentId}`,
      });
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'achievements', id), cleanForFirestore(newAchievement)).catch(() => {});
    return newAchievement;
  }

  public updateAchievement(
    id: string,
    updates: Partial<Achievement>,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    const idx = this.state.achievements.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    this.state.achievements[idx] = { ...this.state.achievements[idx], ...updates };
    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Updated Achievement',
        entity: 'Achievement',
        entityId: id,
        details: `Updated achievement "${this.state.achievements[idx].title}"`,
      });
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'achievements', id), cleanForFirestore(this.state.achievements[idx]), { merge: true }).catch(() => {});
    return true;
  }

  public deleteAchievement(id: string, actor?: { id: string; name: string; role: string }): boolean {
    const idx = this.state.achievements.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const removed = this.state.achievements.splice(idx, 1)[0];
    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Achievement',
        entity: 'Achievement',
        entityId: id,
        details: `Deleted achievement "${removed.title}"`,
      });
    }

    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'achievements', id)).catch(() => {});
    return true;
  }

  // ==========================================
  // 🧭 BEHAVIOR & DISCIPLINE CRUD
  // ==========================================
  public addBehaviorRecord(
    item: Omit<BehaviorRecord, 'id' | 'date'> & { date?: string },
    actor?: { id: string; name: string; role: string }
  ): BehaviorRecord {
    const id = `beh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: BehaviorRecord = {
      ...item,
      id,
      date: item.date || new Date().toISOString().split('T')[0],
    };

    this.state.behaviorRecords.unshift(newRecord);
    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Added Behavior Record',
        entity: 'BehaviorRecord',
        entityId: id,
        details: `Added ${item.type} record: "${item.title}" for student ${item.studentId}`,
      });
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'behavior_records', id), cleanForFirestore(newRecord)).catch(() => {});
    return newRecord;
  }

  public updateBehaviorRecord(
    id: string,
    updates: Partial<BehaviorRecord>,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    const idx = this.state.behaviorRecords.findIndex((b) => b.id === id);
    if (idx === -1) return false;

    const record = this.state.behaviorRecords[idx];

    // RBAC Check: Super Admin, Creator, or Class Teacher of the student only
    if (actor && actor.role !== 'super_admin') {
      const student = this.state.students.find((s) => s.id === record.studentId);
      const studentClass = student ? this.state.classes.find((c) => c.id === student.classId) : null;
      const teacher = this.state.teachers.find(
        (t) => t.id === actor.id || t.username === actor.name || `user-${t.id}` === actor.id
      );
      const isClassTeacher =
        (studentClass && teacher && studentClass.classTeacherId === teacher.id) ||
        (student?.classId && teacher?.classTeacherOfClassIds?.includes(student.classId));
      const isCreator =
        record.recordedBy === actor.id ||
        record.recordedById === actor.id ||
        record.recordedBy === actor.name;

      if (!isClassTeacher && !isCreator) {
        console.warn('Unauthorized behavior record modification attempt');
        return false;
      }
    }

    this.state.behaviorRecords[idx] = { ...this.state.behaviorRecords[idx], ...updates };
    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Updated Behavior Record',
        entity: 'BehaviorRecord',
        entityId: id,
        details: `Updated behavior record "${this.state.behaviorRecords[idx].title}"`,
      });
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'behavior_records', id), cleanForFirestore(this.state.behaviorRecords[idx]), { merge: true }).catch(() => {});
    return true;
  }

  public deleteBehaviorRecord(id: string, actor?: { id: string; name: string; role: string }): boolean {
    const idx = this.state.behaviorRecords.findIndex((b) => b.id === id);
    if (idx === -1) return false;

    const record = this.state.behaviorRecords[idx];

    // RBAC Check: Super Admin, Creator, or Class Teacher of the student only
    if (actor && actor.role !== 'super_admin') {
      const student = this.state.students.find((s) => s.id === record.studentId);
      const studentClass = student ? this.state.classes.find((c) => c.id === student.classId) : null;
      const teacher = this.state.teachers.find(
        (t) => t.id === actor.id || t.username === actor.name || `user-${t.id}` === actor.id
      );
      const isClassTeacher =
        (studentClass && teacher && studentClass.classTeacherId === teacher.id) ||
        (student?.classId && teacher?.classTeacherOfClassIds?.includes(student.classId));
      const isCreator =
        record.recordedBy === actor.id ||
        record.recordedById === actor.id ||
        record.recordedBy === actor.name;

      if (!isClassTeacher && !isCreator) {
        console.warn('Unauthorized behavior record deletion attempt');
        return false;
      }
    }

    const removed = this.state.behaviorRecords.splice(idx, 1)[0];
    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Behavior Record',
        entity: 'BehaviorRecord',
        entityId: id,
        details: `Deleted behavior record "${removed.title}"`,
      });
    }

    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'behavior_records', id)).catch(() => {});
    return true;
  }

  // ==========================================
  // ⏰ ACTIVE HOUR SLOTS & LEAVE CALCULATION
  // ==========================================
  private calculateMinutesFromTimes(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 60;
    const diff = endH * 60 + endM - (startH * 60 + startM);
    return diff > 0 ? diff : 60;
  }

  public updateActiveHourSlot(id: string, updates: Partial<ActiveHourSlot>): boolean {
    const idx = this.state.activeHourSlots.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    const updated = { ...this.state.activeHourSlots[idx], ...updates };
    if (updates.startTime || updates.endTime) {
      updated.durationMinutes = this.calculateMinutesFromTimes(updated.startTime, updated.endTime);
    }

    this.state.activeHourSlots[idx] = updated;
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'active_hour_slots', id), updated, { merge: true }).catch(() => {});
    return true;
  }

  public addActiveHourSlot(
    slot: Omit<ActiveHourSlot, 'id' | 'durationMinutes'> | any,
    actor?: { id: string; name: string; role: string }
  ): ActiveHourSlot {
    const id = `slot-${Date.now()}`;
    const durationMinutes = slot.durationMinutes || this.calculateMinutesFromTimes(slot.startTime, slot.endTime);
    const newSlot: ActiveHourSlot = {
      ...slot,
      id,
      durationMinutes,
    };

    this.state.activeHourSlots.push(newSlot);
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'active_hour_slots', id), newSlot).catch(() => {});
    return newSlot;
  }

  public deleteActiveHourSlot(id: string, actor?: { id: string; name: string; role: string }): boolean {
    const idx = this.state.activeHourSlots.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    this.state.activeHourSlots.splice(idx, 1);
    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'active_hour_slots', id)).catch(() => {});
    return true;
  }

  public resetActiveHourSlotsToDefault(actor?: { id: string; name: string; role: string }): void {
    const defaults = [
      { id: 'slot-1', label: 'Morning Session 1', startTime: '07:00', endTime: '09:15', durationMinutes: 135, isActive: true },
      { id: 'slot-2', label: 'Morning Session 2', startTime: '09:45', endTime: '11:15', durationMinutes: 90, isActive: true },
      { id: 'slot-3', label: 'Mid-day Session', startTime: '11:25', endTime: '12:55', durationMinutes: 90, isActive: true },
      { id: 'slot-4', label: 'Afternoon Session 1', startTime: '14:00', endTime: '15:20', durationMinutes: 80, isActive: true },
      { id: 'slot-5', label: 'Afternoon Session 2', startTime: '15:30', endTime: '16:10', durationMinutes: 40, isActive: true },
    ];
    this.state.activeHourSlots = defaults;
    this.saveLocal();
    this.notify();
    this.batchSetFirestoreItems(defaults.map((d) => ({ collection: 'active_hour_slots', id: d.id, data: d }))).catch(() => {});
  }

  public formatMinutesToHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  // ==========================================
  // 📝 LEAVE APPLICATIONS WORKFLOW
  // ==========================================
  public applyLeave(
    app: {
      studentId: string;
      studentAdmissionNumber?: string;
      studentName?: string;
      classId?: string;
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      startTime?: string;
      endTime?: string;
      slotsIncluded?: string[];
      activeHourSlotIds?: string[];
      totalDurationMinutes?: number;
      totalDurationFormatted?: string;
      reason: string;
      appliedByTeacher?: boolean;
      reviewerName?: string;
      reviewerId?: string;
    } | any,
    actor?: { id: string; name: string; role: string }
  ): LeaveApplication {
    const id = `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const student = this.state.students.find((s) => s.id === app.studentId);
    const resolvedAdmissionNumber = app.studentAdmissionNumber || student?.admissionNumber || 'ADM000';
    const resolvedName = app.studentName || student?.name || 'Student';
    const resolvedClassId = app.classId || student?.classId || '';
    const classObj = this.state.classes.find((c) => c.id === resolvedClassId);
    const targetAcademicYear =
      app.academicYear ||
      classObj?.academicYear ||
      this.state.currentAcademicYear ||
      '2026-2027';
    const slots = app.slotsIncluded || app.activeHourSlotIds || [];

    // Calculate total active hours from selected slots or start/end times
    let totalMinutes = app.totalDurationMinutes || 0;
    if (!totalMinutes) {
      if (slots && slots.length > 0) {
        slots.forEach((slotId: string) => {
          const slot = this.state.activeHourSlots.find((s) => s.id === slotId);
          if (slot) totalMinutes += slot.durationMinutes;
        });
      } else if (app.startTime && app.endTime) {
        totalMinutes = this.calculateMinutesFromTimes(app.startTime, app.endTime);
      } else {
        totalMinutes = this.state.activeHourSlots.reduce((acc, s) => acc + s.durationMinutes, 0);
      }
    }

    const newApp: LeaveApplication = {
      id,
      studentId: app.studentId,
      studentAdmissionNumber: resolvedAdmissionNumber,
      studentName: resolvedName,
      classId: resolvedClassId,
      academicYear: targetAcademicYear,
      leaveType: app.leaveType,
      startDate: app.startDate,
      endDate: app.endDate,
      startTime: app.startTime,
      endTime: app.endTime,
      slotsIncluded: slots,
      totalDurationMinutes: totalMinutes,
      totalDurationFormatted: app.totalDurationFormatted || this.formatMinutesToHours(totalMinutes),
      reason: app.reason,
      status: app.appliedByTeacher ? 'approved' : 'pending',
      appliedAt: new Date().toISOString(),
      reviewedBy: app.appliedByTeacher ? app.reviewerId : undefined,
      reviewedByName: app.appliedByTeacher ? app.reviewerName : undefined,
      reviewedAt: app.appliedByTeacher ? new Date().toISOString() : undefined,
    };

    this.state.leaveApplications.unshift(newApp);
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'leave_applications', id), cleanForFirestore(newApp)).catch(() => {});
    return newApp;
  }

  public reviewLeave(
    id: string,
    status: 'approved' | 'rejected',
    reviewerNameOrId?: string,
    reviewerIdOrName?: string,
    remarksOrActor?: string | any,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    const idx = this.state.leaveApplications.findIndex((l) => l.id === id);
    if (idx === -1) return false;

    let byName = reviewerNameOrId || 'Staff';
    let byId = reviewerIdOrName || 'staff';
    let remarks = typeof remarksOrActor === 'string' ? remarksOrActor : undefined;

    this.state.leaveApplications[idx] = {
      ...this.state.leaveApplications[idx],
      status,
      reviewedBy: byId,
      reviewedByName: byName,
      reviewedAt: new Date().toISOString(),
      remarks: remarks || this.state.leaveApplications[idx].remarks,
    };

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'leave_applications', id), cleanForFirestore(this.state.leaveApplications[idx]), { merge: true }).catch(() => {});
    return true;
  }

  public markLeaveArrived(id: string, arrivedAtOrActor?: string | any, actor?: any): boolean {
    const idx = this.state.leaveApplications.findIndex((l) => l.id === id);
    if (idx === -1) return false;

    const arrivalTimestamp = typeof arrivedAtOrActor === 'string' ? arrivedAtOrActor : new Date().toISOString();
    this.state.leaveApplications[idx] = {
      ...this.state.leaveApplications[idx],
      status: 'arrived',
      hasArrived: true,
      arrivedAt: arrivalTimestamp,
      remarks: `Student checked in and marked arrived at ${new Date(arrivalTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'leave_applications', id), cleanForFirestore(this.state.leaveApplications[idx]), { merge: true }).catch(() => {});
    return true;
  }

  public deleteLeaveApplication(id: string, actor?: any): boolean {
    const idx = this.state.leaveApplications.findIndex((l) => l.id === id);
    if (idx === -1) return false;

    this.state.leaveApplications.splice(idx, 1);
    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'leave_applications', id)).catch(() => {});
    return true;
  }

  // ==========================================
  // 📋 MULTI-PERIOD ATTENDANCE (Periods 1 - 9)
  // ==========================================
  public async savePeriodAttendance(
    params: {
      date: string;
      classId: string;
      subjectId: string;
      period: number;
      academicYear?: string;
      records: {
        studentId: string;
        status: AttendanceStatus;
        lateArrivalTime?: string;
        lateReason?: string;
        remarks?: string;
      }[];
      markedBy?: string;
    } | any,
    actor?: { id: string; name: string; role: string }
  ): Promise<{ savedCount: number }> {
    const itemsToSave: { collection: string; id: string; data: any }[] = [];
    const markedBy = params.markedBy || actor?.name || 'Staff';
    const classObj = this.state.classes.find((c) => c.id === params.classId);
    const targetAcademicYear =
      params.academicYear ||
      classObj?.academicYear ||
      this.state.currentAcademicYear ||
      '2026-2027';

    params.records.forEach((rec: any) => {
      // Deterministic key for exact period attendance
      const recordId = `att-${params.date}-${params.subjectId}-p${params.period}-${rec.studentId}`;
      const existingIdx = this.state.attendanceRecords.findIndex(
        (a) =>
          a.date === params.date &&
          a.subjectId === params.subjectId &&
          a.period === params.period &&
          a.studentId === rec.studentId
      );

      const record: AttendanceRecord = {
        id: recordId,
        date: params.date,
        academicYear: targetAcademicYear,
        classId: params.classId,
        subjectId: params.subjectId,
        period: params.period,
        studentId: rec.studentId,
        status: rec.status,
        markedBy,
        markedAt: new Date().toISOString(),
        ...(rec.lateArrivalTime ? { lateArrivalTime: rec.lateArrivalTime } : {}),
        ...(rec.lateReason ? { lateReason: rec.lateReason } : {}),
        ...(rec.remarks ? { remarks: rec.remarks } : {}),
      };

      if (existingIdx >= 0) {
        this.state.attendanceRecords[existingIdx] = record;
      } else {
        this.state.attendanceRecords.push(record);
      }

      itemsToSave.push({ collection: 'attendance_records', id: recordId, data: record });
    });

    this.saveLocal();
    this.notify();

    if (itemsToSave.length > 0) {
      await this.batchSetFirestoreItems(itemsToSave);
    }

    return { savedCount: params.records.length };
  }

  public recordAttendance(
    date: string,
    classId: string,
    subjectId: string,
    period: number,
    studentId: string,
    status: AttendanceStatus,
    markedBy: string
  ): void {
    this.savePeriodAttendance({
      date,
      classId,
      subjectId,
      period,
      records: [{ studentId, status }],
      markedBy,
    });
  }

  public recordLeaveArrival(id: string, actorName?: string): boolean {
    return this.markLeaveArrived(id, new Date().toISOString(), { name: actorName || 'Staff' });
  }

  public grantAttendanceClearance(
    clearance: Omit<AttendanceClearance, 'id' | 'clearedDate'> | any,
    actor?: { id: string; name: string; role: string }
  ): AttendanceClearance {
    const id = `clr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newClr: AttendanceClearance = {
      ...clearance,
      id,
      academicYear: clearance.academicYear || this.state.currentAcademicYear || '2026-2027',
      clearedDate: new Date().toISOString(),
    };

    this.state.attendanceClearances.unshift(newClr);
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'attendance_clearances', id), cleanForFirestore(newClr)).catch(() => {});
    return newClr;
  }

  public revokeAttendanceClearance(id: string, actor?: { id: string; name: string; role: string }): boolean {
    const idx = this.state.attendanceClearances.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    this.state.attendanceClearances.splice(idx, 1);
    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'attendance_clearances', id)).catch(() => {});
    return true;
  }

  public updateAttendanceRecordStatus(
    recordId: string,
    newStatus: AttendanceStatus,
    remarks?: string,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    const idx = this.state.attendanceRecords.findIndex((r) => r.id === recordId);
    if (idx === -1) return false;

    this.state.attendanceRecords[idx] = {
      ...this.state.attendanceRecords[idx],
      status: newStatus,
      remarks: remarks ? `${remarks} (Updated by ${actor?.name || 'Authority'})` : this.state.attendanceRecords[idx].remarks,
      markedAt: new Date().toISOString(),
    };

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'attendance_records', recordId), cleanForFirestore(this.state.attendanceRecords[idx]), { merge: true }).catch(() => {});
    return true;
  }

  public batchClearAttendanceRecords(
    params: {
      recordIds: string[];
      newStatus: AttendanceStatus;
      reason?: string;
    },
    actor?: { id: string; name: string; role: string }
  ): { count: number } {
    let count = 0;
    const itemsToSave: { collection: string; id: string; data: any }[] = [];
    const actorLabel = actor?.name || 'Authority';

    params.recordIds.forEach((recordId) => {
      const idx = this.state.attendanceRecords.findIndex((r) => r.id === recordId);
      if (idx !== -1) {
        const current = this.state.attendanceRecords[idx];
        const statusLabel =
          params.newStatus === 'academic_leave'
            ? 'Academic Leave'
            : params.newStatus === 'official_leave'
            ? 'Official Leave'
            : params.newStatus === 'medical_leave'
            ? 'Medical Leave'
            : params.newStatus;
        const updated: AttendanceRecord = {
          ...current,
          status: params.newStatus,
          remarks: params.reason
            ? `${params.reason} (Cleared as ${statusLabel} by ${actorLabel})`
            : `Cleared as ${statusLabel} by ${actorLabel}`,
          markedAt: new Date().toISOString(),
        };
        this.state.attendanceRecords[idx] = updated;
        itemsToSave.push({ collection: 'attendance_records', id: recordId, data: updated });
        count++;
      }
    });

    if (count > 0) {
      this.saveLocal();
      this.notify();
      if (itemsToSave.length > 0) {
        this.batchSetFirestoreItems(itemsToSave).catch(() => {});
      }
      if (actor) {
        this.addAuditLog({
          userId: actor.id,
          userName: actor.name,
          role: actor.role,
          action: 'Batch Attendance Clearance',
          entity: 'AttendanceRecord',
          entityId: params.recordIds.join(', '),
          details: `Cleared ${count} attendance records as ${params.newStatus}. Reason: ${params.reason || 'None provided'}`,
        });
      }
    }
    return { count };
  }

  public applyStudentLeaveClearance(
    app: Omit<StudentLeaveClearanceApplication, 'id' | 'appliedAt' | 'status'>
  ): StudentLeaveClearanceApplication {
    const id = `slc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const student = this.state.students.find((s) => s.id === app.studentId);
    const classObj = this.state.classes.find((c) => c.id === (app.classId || student?.classId));
    const targetAcademicYear =
      app.academicYear ||
      classObj?.academicYear ||
      this.state.currentAcademicYear ||
      '2026-2027';

    const newApp: StudentLeaveClearanceApplication = {
      ...app,
      id,
      academicYear: targetAcademicYear,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };

    if (!this.state.studentLeaveClearanceApplications) {
      this.state.studentLeaveClearanceApplications = [];
    }
    this.state.studentLeaveClearanceApplications.unshift(newApp);

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'student_leave_clearance_applications', id), cleanForFirestore(newApp)).catch(() => {});
    return newApp;
  }

  public reviewStudentLeaveClearance(
    id: string,
    status: 'approved' | 'rejected',
    remarks?: string,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    if (!this.state.studentLeaveClearanceApplications) return false;
    const idx = this.state.studentLeaveClearanceApplications.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const currentApp = this.state.studentLeaveClearanceApplications[idx];
    const updatedApp: StudentLeaveClearanceApplication = {
      ...currentApp,
      status,
      reviewedBy: actor?.id,
      reviewedByName: actor?.name,
      reviewedByRole: actor?.role,
      reviewedAt: new Date().toISOString(),
      reviewRemarks: remarks || currentApp.reviewRemarks,
    };

    this.state.studentLeaveClearanceApplications[idx] = updatedApp;

    // If approved, automatically convert all associated attendance records to requested clearanceType
    if (status === 'approved') {
      const actorLabel = actor?.name ? `${actor.name} (${actor.role})` : 'Clearance Authority';
      const statusLabel =
        currentApp.clearanceType === 'academic_leave'
          ? 'Academic Leave'
          : currentApp.clearanceType === 'official_leave'
          ? 'Official Leave'
          : 'Medical Leave';

      currentApp.recordIds.forEach((recId) => {
        const recIdx = this.state.attendanceRecords.findIndex((r) => r.id === recId);
        if (recIdx !== -1) {
          const rec = this.state.attendanceRecords[recIdx];
          this.state.attendanceRecords[recIdx] = {
            ...rec,
            status: currentApp.clearanceType,
            remarks: `Cleared as ${statusLabel} by ${actorLabel}. Student reason: ${currentApp.reason}`,
            markedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'attendance_records', recId), cleanForFirestore(this.state.attendanceRecords[recIdx]), { merge: true }).catch(() => {});
        }
      });

      // Also create an AttendanceClearance audit record
      this.grantAttendanceClearance(
        {
          studentId: currentApp.studentId,
          subjectId: currentApp.subjectId,
          grantedBy: actor?.id || 'admin',
          grantedByName: actor?.name || 'Authority',
          grantedByRole: actor?.role || 'Authority',
          reason: `Student clearance application approved: ${currentApp.reason}`,
          academicYear: currentApp.academicYear || this.state.currentAcademicYear || '2026-2027',
          notes: `Cleared ${currentApp.recordIds.length} session(s) on dates: ${currentApp.dates.join(', ')} as ${statusLabel}`,
        },
        actor
      );
    }

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: `Clearance Application ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        entity: 'StudentLeaveClearanceApplication',
        entityId: id,
        details: `${status === 'approved' ? 'Approved and cleared' : 'Rejected'} clearance application for ${currentApp.studentName} (${currentApp.studentAdmissionNumber}) - ${currentApp.subjectName}. Remark: ${remarks || 'None'}`,
      });
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'student_leave_clearance_applications', id), cleanForFirestore(updatedApp), { merge: true }).catch(() => {});
    return true;
  }

  public updateAttendanceRules(rules: Partial<AttendanceRulesConfig>): AttendanceRulesConfig {
    this.state.attendanceRules = {
      ...this.state.attendanceRules,
      ...rules,
    };
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'system_config', 'attendance_rules'), this.state.attendanceRules, { merge: true }).catch(() => {});
    return this.state.attendanceRules;
  }

  // ==========================================
  // 💬 COMPLAINTS & FEEDBACK WITH ROUTING
  // ==========================================
  public submitComplaint(
    item: (Omit<ComplaintFeedback, 'id' | 'submittedAt' | 'status' | 'title'> & { title?: string; subject?: string }) | any,
    actor?: { id: string; name: string; role: string }
  ): ComplaintFeedback {
    const id = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveTitle = item.title || item.subject || 'Complaint/Feedback';
    const newComplaint: ComplaintFeedback = {
      ...item,
      title: effectiveTitle,
      subject: item.subject || effectiveTitle,
      id,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.state.complaintsFeedback.unshift(newComplaint);
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'complaints_feedback', id), newComplaint).catch(() => {});
    return newComplaint;
  }

  public respondToComplaint(
    id: string,
    responseOrUpdates: string | { response: string; respondedByName?: string; respondedBy?: string; status?: any },
    responderName?: string | any,
    responderId?: string,
    status: 'in_progress' | 'resolved' = 'resolved'
  ): boolean {
    const idx = this.state.complaintsFeedback.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    let text = '';
    let byName = '';
    let byId = '';
    let finalStatus = status;

    if (typeof responseOrUpdates === 'object' && responseOrUpdates !== null) {
      text = responseOrUpdates.response || '';
      byName = responseOrUpdates.respondedByName || (responderName?.name || 'Administrator');
      byId = responseOrUpdates.respondedBy || (responderName?.id || 'admin');
      finalStatus = responseOrUpdates.status || 'resolved';
    } else {
      text = String(responseOrUpdates || '');
      byName = typeof responderName === 'string' ? responderName : 'Administrator';
      byId = responderId || 'admin';
    }

    this.state.complaintsFeedback[idx] = {
      ...this.state.complaintsFeedback[idx],
      response: text,
      respondedBy: byId,
      respondedByName: byName,
      respondedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      status: finalStatus,
    };

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'complaints_feedback', id), this.state.complaintsFeedback[idx], { merge: true }).catch(() => {});
    return true;
  }

  public deleteComplaint(id: string, operator?: { id: string; name: string; role: string }): boolean {
    const idx = this.state.complaintsFeedback.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    this.state.complaintsFeedback.splice(idx, 1);
    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'complaints_feedback', id)).catch(() => {});
    return true;
  }

  public updateAllowedReceivers(types: MessageReceiverType[]): void {
    this.state.allowedReceiverTypes = types;
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'system_config', 'allowed_receivers'), { types }, { merge: true }).catch(() => {});
  }

  // ==========================================
  // ⚙️ SUBJECT & TEACHER PERMISSIONS
  // ==========================================
  public setSubjectAttendanceTracking(subjectId: string, track: boolean, operator?: any): boolean {
    return this.updateSubjectAttendanceSettings(subjectId, { trackAttendance: track });
  }
  public updateSubjectAttendanceSettings(
    subjectId: string,
    settings: {
      trackAttendance?: boolean;
      isSplitSubject?: boolean;
      splitGroupName?: string;
      enrolledStudentIds?: string[];
    }
  ): boolean {
    const idx = this.state.subjects.findIndex((s) => s.id === subjectId);
    if (idx === -1) return false;

    this.state.subjects[idx] = {
      ...this.state.subjects[idx],
      ...settings,
    };

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'subjects', subjectId), this.state.subjects[idx], { merge: true }).catch(() => {});
    return true;
  }

  public updateTeacherAttendanceAccess(
    teacherId: string,
    canManageAllAttendance: boolean,
    specialRoleTitle?: string
  ): boolean {
    const idx = this.state.teachers.findIndex((t) => t.id === teacherId);
    if (idx === -1) return false;

    this.state.teachers[idx] = {
      ...this.state.teachers[idx],
      canManageAllAttendance,
      specialRoleTitle: specialRoleTitle || this.state.teachers[idx].specialRoleTitle,
    };

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'teachers', teacherId), this.state.teachers[idx], { merge: true }).catch(() => {});
    return true;
  }

  // ==========================================
  // 📅 TIMETABLE & CLASS ATTENDANCE CONTROLS
  // ==========================================
  public toggleClassAttendance(classId: string, isAttendanceEnabled: boolean): boolean {
    const idx = this.state.classes.findIndex((c) => c.id === classId);
    if (idx === -1) return false;

    this.state.classes[idx] = {
      ...this.state.classes[idx],
      isAttendanceEnabled,
    };
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'classes', classId), this.state.classes[idx], { merge: true }).catch(() => {});
    return true;
  }

  public updateSubjectTeacherAccess(
    subjectId: string,
    assignedTeacherId?: string,
    additionalTeacherIds?: string[]
  ): boolean {
    const idx = this.state.subjects.findIndex((s) => s.id === subjectId);
    if (idx === -1) return false;

    this.state.subjects[idx] = {
      ...this.state.subjects[idx],
      ...(assignedTeacherId !== undefined ? { assignedTeacherId } : {}),
      ...(additionalTeacherIds !== undefined ? { additionalTeacherIds } : {}),
    };

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'subjects', subjectId), this.state.subjects[idx], { merge: true }).catch(() => {});
    return true;
  }

  public updateSubjectEnrolledStudents(subjectId: string, studentIds: string[]): boolean {
    const idx = this.state.subjects.findIndex((s) => s.id === subjectId);
    if (idx === -1) return false;

    this.state.subjects[idx] = {
      ...this.state.subjects[idx],
      enrolledStudentIds: studentIds,
    };
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'subjects', subjectId), this.state.subjects[idx], { merge: true }).catch(() => {});
    return true;
  }

  public getTimetablePeriods(): TimetablePeriodDefinition[] {
    return (this.state.timetablePeriods || []).slice().sort((a, b) => {
      if (a.startTime && b.startTime) {
        const cmp = a.startTime.localeCompare(b.startTime);
        if (cmp !== 0) return cmp;
      }
      return (a.periodNumber || 0) - (b.periodNumber || 0);
    });
  }

  public saveTimetablePeriods(periods: TimetablePeriodDefinition[]): void {
    this.state.timetablePeriods = periods.slice().sort((a, b) => {
      if (a.startTime && b.startTime) {
        const cmp = a.startTime.localeCompare(b.startTime);
        if (cmp !== 0) return cmp;
      }
      return (a.periodNumber || 0) - (b.periodNumber || 0);
    });
    this.saveLocal();
    this.notify();
    const allCleaned = this.state.timetablePeriods.map((p) => cleanForFirestore(p));
    setDoc(doc(db, 'system_config', 'timetable_periods'), { periods: allCleaned }, { merge: true }).catch(() => {});
    periods.forEach((p) => {
      setDoc(doc(db, 'timetable_periods', p.id), cleanForFirestore(p), { merge: true }).catch(() => {});
    });
  }

  public addTimetablePeriod(period: TimetablePeriodDefinition): TimetablePeriodDefinition {
    if (!this.state.timetablePeriods) this.state.timetablePeriods = [];
    const newPeriod: TimetablePeriodDefinition = {
      ...period,
      id: period.id || `period-${Date.now()}`,
    };
    this.state.timetablePeriods.push(newPeriod);
    this.state.timetablePeriods.sort((a, b) => {
      if (a.startTime && b.startTime) {
        const cmp = a.startTime.localeCompare(b.startTime);
        if (cmp !== 0) return cmp;
      }
      return (a.periodNumber || 0) - (b.periodNumber || 0);
    });
    this.saveLocal();
    this.notify();
    const cleaned = cleanForFirestore(newPeriod);
    setDoc(doc(db, 'timetable_periods', newPeriod.id), cleaned, { merge: true }).catch(() => {});
    const allCleaned = this.state.timetablePeriods.map((p) => cleanForFirestore(p));
    setDoc(doc(db, 'system_config', 'timetable_periods'), { periods: allCleaned }, { merge: true }).catch(() => {});
    return newPeriod;
  }

  public updateTimetablePeriod(id: string, updates: Partial<TimetablePeriodDefinition>): boolean {
    if (!this.state.timetablePeriods) return false;
    const idx = this.state.timetablePeriods.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    this.state.timetablePeriods[idx] = {
      ...this.state.timetablePeriods[idx],
      ...updates,
    };
    this.state.timetablePeriods.sort((a, b) => {
      if (a.startTime && b.startTime) {
        const cmp = a.startTime.localeCompare(b.startTime);
        if (cmp !== 0) return cmp;
      }
      return (a.periodNumber || 0) - (b.periodNumber || 0);
    });
    this.saveLocal();
    this.notify();
    const cleaned = cleanForFirestore(this.state.timetablePeriods[idx]);
    setDoc(doc(db, 'timetable_periods', id), cleaned, { merge: true }).catch(() => {});
    const allCleaned = this.state.timetablePeriods.map((p) => cleanForFirestore(p));
    setDoc(doc(db, 'system_config', 'timetable_periods'), { periods: allCleaned }, { merge: true }).catch(() => {});
    return true;
  }

  public deleteTimetablePeriod(id: string): boolean {
    if (!this.state.timetablePeriods) return false;
    const idx = this.state.timetablePeriods.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    this.state.timetablePeriods.splice(idx, 1);
    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'timetable_periods', id)).catch(() => {});
    const allCleaned = this.state.timetablePeriods.map((p) => cleanForFirestore(p));
    setDoc(doc(db, 'system_config', 'timetable_periods'), { periods: allCleaned }, { merge: true }).catch(() => {});
    return true;
  }

  public resetTimetablePeriodsToDefault(): TimetablePeriodDefinition[] {
    const defaults: TimetablePeriodDefinition[] = [
      { id: 'p-1', periodNumber: 1, name: 'Period 1', startTime: '07:45', endTime: '08:30', isBreak: false },
      { id: 'p-2', periodNumber: 2, name: 'Period 2', startTime: '08:30', endTime: '09:15', isBreak: false },
      { id: 'p-3', periodNumber: 3, name: 'Period 3', startTime: '09:15', endTime: '10:00', isBreak: false },
      { id: 'p-break-1', periodNumber: 4, name: 'Morning Interval', startTime: '10:00', endTime: '10:15', isBreak: true, breakLabel: 'Morning Interval' },
      { id: 'p-4', periodNumber: 4, name: 'Period 4', startTime: '10:15', endTime: '11:00', isBreak: false },
      { id: 'p-5', periodNumber: 5, name: 'Period 5', startTime: '11:00', endTime: '11:45', isBreak: false },
      { id: 'p-6', periodNumber: 6, name: 'Period 6', startTime: '11:45', endTime: '12:30', isBreak: false },
      { id: 'p-break-2', periodNumber: 7, name: 'Lunch & Dhuhr Prayer Break', startTime: '12:30', endTime: '14:00', isBreak: true, breakLabel: 'Lunch & Dhuhr Prayer Break' },
      { id: 'p-7', periodNumber: 7, name: 'Period 7', startTime: '14:00', endTime: '14:45', isBreak: false },
      { id: 'p-8', periodNumber: 8, name: 'Period 8', startTime: '14:45', endTime: '15:30', isBreak: false },
      { id: 'p-9', periodNumber: 9, name: 'Period 9', startTime: '15:30', endTime: '16:15', isBreak: false },
    ];
    this.saveTimetablePeriods(defaults);
    return defaults;
  }

  public getTimetableSlots(): TimetableSlot[] {
    return (this.state.timetableSlots || []).slice();
  }

  public saveTimetableSlots(slots: TimetableSlot[]): void {
    this.state.timetableSlots = slots;
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'system_config', 'timetable_slots'), cleanForFirestore({ slots }), { merge: true }).catch(() => {});
  }

  public saveTimetableSlot(slot: TimetableSlot): TimetableSlot {
    if (!this.state.timetableSlots) this.state.timetableSlots = [];
    const id = slot.id || `tt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullSlot = { ...slot, id };
    const existingIdx = this.state.timetableSlots.findIndex((s) => s.id === id);

    if (existingIdx !== -1) {
      this.state.timetableSlots[existingIdx] = fullSlot;
    } else {
      this.state.timetableSlots.push(fullSlot);
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'timetable_slots', id), cleanForFirestore(fullSlot), { merge: true }).catch(() => {});
    return fullSlot;
  }

  public deleteTimetableSlot(id: string): boolean {
    if (!this.state.timetableSlots) return false;
    const idx = this.state.timetableSlots.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    this.state.timetableSlots.splice(idx, 1);
    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'timetable_slots', id)).catch(() => {});
    return true;
  }

  public getTimetableForDay(classId: string, dayOfWeek: DayOfWeek): TimetableSlot[] {
    if (!this.state.timetableSlots) return [];
    return this.state.timetableSlots
      .filter((s) => s.classId === classId && s.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase())
      .sort((a, b) => a.periodNumber - b.periodNumber);
  }

  // ==========================================
  // 🔐 ROLES & PERMISSIONS MANAGEMENT
  // ==========================================
  public getRoles(): RoleDefinition[] {
    return (this.state.roles || INITIAL_DEFAULT_ROLES).slice();
  }

  public saveRole(
    role: RoleDefinition,
    actor?: { id: string; name: string; role: string }
  ): RoleDefinition {
    if (!this.state.roles) {
      this.state.roles = JSON.parse(JSON.stringify(INITIAL_DEFAULT_ROLES));
    }

    const id = role.id || `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullRole: RoleDefinition = { ...role, id };
    const existingIdx = this.state.roles.findIndex((r) => r.id === id);

    if (existingIdx !== -1) {
      this.state.roles[existingIdx] = fullRole;
    } else {
      this.state.roles.push(fullRole);
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'roles', id), fullRole).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: existingIdx !== -1 ? 'Updated Role' : 'Created Role',
        entity: 'Role',
        entityId: id,
        details: `${existingIdx !== -1 ? 'Updated' : 'Created'} role ${fullRole.name} with ${fullRole.permissions.length} permissions`,
      });
    }

    return fullRole;
  }

  public deleteRole(
    id: string,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    if (!this.state.roles) return false;
    const idx = this.state.roles.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    const roleToDelete = this.state.roles[idx];
    // Remove this role from any assigned teachers
    this.state.teachers.forEach((t) => {
      if (t.roleIds && t.roleIds.includes(id)) {
        t.roleIds = t.roleIds.filter((rid) => rid !== id);
      }
    });

    this.state.roles.splice(idx, 1);
    this.saveLocal();
    this.notify();
    deleteDoc(doc(db, 'roles', id)).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Role',
        entity: 'Role',
        entityId: id,
        details: `Deleted role ${roleToDelete.name}`,
      });
    }

    return true;
  }

  public assignTeacherRoles(
    teacherId: string,
    roleIds: string[],
    customPermissions?: string[],
    deniedPermissions?: string[],
    actor?: { id: string; name: string; role: string }
  ): void {
    const teacher = this.state.teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    teacher.roleIds = roleIds;
    if (customPermissions !== undefined) {
      teacher.customPermissions = customPermissions;
    }
    if (deniedPermissions !== undefined) {
      teacher.deniedPermissions = deniedPermissions;
    }

    // Set primary specialRoleTitle from first assigned role
    const activeRoles = this.state.roles || INITIAL_DEFAULT_ROLES;
    const firstRole = activeRoles.find((r) => roleIds.includes(r.id));
    if (firstRole) {
      teacher.specialRoleTitle = firstRole.name;
    } else if (roleIds.length === 0) {
      teacher.specialRoleTitle = undefined;
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'teachers', teacherId), teacher).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Assigned Teacher Roles',
        entity: 'Teacher',
        entityId: teacherId,
        details: `Updated roles and permissions for ${teacher.name}`,
      });
    }
  }

  public toggleTeacherPermission(
    teacherId: string,
    permission: string,
    grant: boolean,
    actor?: { id: string; name: string; role: string }
  ): void {
    const teacher = this.state.teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    const currentCustom = teacher.customPermissions || [];
    const currentDenied = teacher.deniedPermissions || [];

    if (grant) {
      // Add to customPermissions, remove from deniedPermissions
      teacher.customPermissions = Array.from(new Set([...currentCustom, permission]));
      teacher.deniedPermissions = currentDenied.filter((p) => p !== permission);
    } else {
      // Remove from customPermissions, add to deniedPermissions
      teacher.customPermissions = currentCustom.filter((p) => p !== permission);
      teacher.deniedPermissions = Array.from(new Set([...currentDenied, permission]));
    }

    // Legacy sync
    if (permission === 'attendance_all_subjects') {
      teacher.canManageAllAttendance = grant;
    }

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'teachers', teacherId), teacher).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: grant ? 'Granted Permission' : 'Revoked Permission',
        entity: 'Teacher',
        entityId: teacherId,
        details: `${grant ? 'Granted' : 'Revoked'} ${permission} for ${teacher.name}`,
      });
    }
  }

  // ==========================================
  // 🏆 SHOWCASE & TOPPER SPOTLIGHT MANAGEMENT
  // ==========================================
  public getShowcaseCards(): ShowcaseCard[] {
    const cards = this.state.showcaseCards || [];
    return [...cards].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }

  public getVisibleShowcaseCards(
    userRole?: string,
    classId?: string,
    studentAdmissionNumber?: string,
    studentId?: string
  ): ShowcaseCard[] {
    const cards = this.getShowcaseCards().filter((c) => c.isActive);
    if (!userRole) return cards;

    return cards.filter((card) => {
      switch (card.targetAudience) {
        case 'all':
          return true;
        case 'students_only':
          return userRole === 'student';
        case 'teachers_only':
          return userRole === 'teacher';
        case 'admins_only':
          return userRole === 'super_admin';
        case 'teachers_and_students':
          return userRole === 'teacher' || userRole === 'student';
        case 'admins_and_teachers':
          return userRole === 'super_admin' || userRole === 'teacher';
        case 'specific_roles':
          if (!card.targetRoles || card.targetRoles.length === 0) return true;
          return card.targetRoles.includes(userRole as any);
        case 'specific_classes':
          if (userRole === 'super_admin' || userRole === 'teacher') return true;
          if (!classId || !card.targetClassIds || card.targetClassIds.length === 0) return true;
          return card.targetClassIds.includes(classId);
        case 'specific_student':
          if (userRole === 'super_admin' || userRole === 'teacher') return true;
          if (card.targetStudentIds && card.targetStudentIds.length > 0) {
            if (studentId && card.targetStudentIds.includes(studentId)) return true;
          }
          if (card.studentAdmissionNumber && studentAdmissionNumber) {
            return card.studentAdmissionNumber.trim().toLowerCase() === studentAdmissionNumber.trim().toLowerCase();
          }
          if (card.studentId && studentId) {
            return card.studentId === studentId;
          }
          return false;
        default:
          return true;
      }
    });
  }

  public addShowcaseCard(
    card: Omit<ShowcaseCard, 'id' | 'createdAt'>,
    actor?: { id: string; name: string; role: string }
  ): ShowcaseCard {
    if (!this.state.showcaseCards) {
      this.state.showcaseCards = [];
    }
    const newCard: ShowcaseCard = {
      ...card,
      id: `sc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    this.state.showcaseCards.push(newCard);
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'showcase_cards', newCard.id), newCard).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Created Showcase Card',
        entity: 'ShowcaseCard',
        entityId: newCard.id,
        details: `Created showcase card "${newCard.title}" (${newCard.studentName} - Priority ${newCard.priority})`,
      });
    }

    return newCard;
  }

  public updateShowcaseCard(
    id: string,
    updates: Partial<ShowcaseCard>,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    if (!this.state.showcaseCards) return false;
    const index = this.state.showcaseCards.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.state.showcaseCards[index] = {
      ...this.state.showcaseCards[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'showcase_cards', id), this.state.showcaseCards[index]).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Updated Showcase Card',
        entity: 'ShowcaseCard',
        entityId: id,
        details: `Updated showcase card "${this.state.showcaseCards[index].title}"`,
      });
    }

    return true;
  }

  public deleteShowcaseCard(
    id: string,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    if (!this.state.showcaseCards) {
      this.state.showcaseCards = [];
      return false;
    }
    const cleanId = (id || '').trim();
    const card = this.state.showcaseCards.find((c) => c.id === cleanId || c.id === id);
    const title = card ? card.title : cleanId;

    this.state = {
      ...this.state,
      showcaseCards: this.state.showcaseCards.filter((c) => c.id !== cleanId && c.id !== id),
    };
    this.saveLocal();
    this.notify();

    if (cleanId) {
      deleteDoc(doc(db, 'showcase_cards', cleanId)).catch((err) => {
        console.warn(`Error deleting showcase card ${cleanId} from Firestore:`, err);
      });
    }

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Deleted Showcase Card',
        entity: 'ShowcaseCard',
        entityId: cleanId || id,
        details: `Deleted showcase card "${title}"`,
      });
    }

    return true;
  }

  public deleteAllShowcaseCards(actor?: { id: string; name: string; role: string }): boolean {
    const existing = this.state.showcaseCards || [];
    const count = existing.length;
    const ids = existing.map((c) => c.id);

    this.state = {
      ...this.state,
      showcaseCards: [],
    };
    this.saveLocal();
    this.notify();

    // Delete known card IDs from Firestore
    if (ids.length > 0) {
      this.batchDeleteFirestoreDocs('showcase_cards', ids).catch(() => {});
    }

    // Query and wipe any lingering docs in showcase_cards collection
    getDocs(collection(db, 'showcase_cards'))
      .then((snap) => {
        if (!snap.empty) {
          const allDocIds = snap.docs.map((d) => d.id);
          this.batchDeleteFirestoreDocs('showcase_cards', allDocIds).catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('Error querying showcase_cards for collection wipe:', err);
      });

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Cleared All Showcase Cards',
        entity: 'ShowcaseCard',
        entityId: 'all',
        details: `Deleted all ${count} added cards from the Spotlight & Toppers Hub`,
      });
    }

    return true;
  }

  public resetShowcaseCardsToDefault(actor?: { id: string; name: string; role: string }): boolean {
    // Delete existing from Firestore
    if (this.state.showcaseCards && this.state.showcaseCards.length > 0) {
      const ids = this.state.showcaseCards.map((c) => c.id);
      this.batchDeleteFirestoreDocs('showcase_cards', ids).catch(() => {});
    }

    // Clone initial
    const cloned = JSON.parse(JSON.stringify(INITIAL_SHOWCASE_CARDS)) as ShowcaseCard[];
    this.state = {
      ...this.state,
      showcaseCards: cloned,
    };
    cloned.forEach((c) => {
      setDoc(doc(db, 'showcase_cards', c.id), c).catch(() => {});
    });

    this.saveLocal();
    this.notify();

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Reset Showcase Cards to Default',
        entity: 'ShowcaseCard',
        entityId: 'all',
        details: `Restored default ${cloned.length} showcase topper cards`,
      });
    }

    return true;
  }

  public reorderShowcaseCards(
    cardIds: string[],
    actor?: { id: string; name: string; role: string }
  ): boolean {
    if (!this.state.showcaseCards) return false;

    cardIds.forEach((id, idx) => {
      const card = this.state.showcaseCards?.find((c) => c.id === id);
      if (card) {
        card.order = idx + 1;
        setDoc(doc(db, 'showcase_cards', id), card).catch(() => {});
      }
    });

    this.saveLocal();
    this.notify();

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'Reordered Showcase Cards',
        entity: 'ShowcaseCard',
        entityId: 'multiple',
        details: `Updated order for ${cardIds.length} showcase cards`,
      });
    }

    return true;
  }

  public toggleShowcaseCardActive(
    id: string,
    actor?: { id: string; name: string; role: string }
  ): boolean {
    if (!this.state.showcaseCards) return false;
    const card = this.state.showcaseCards.find((c) => c.id === id);
    if (!card) return false;

    card.isActive = !card.isActive;
    card.updatedAt = new Date().toISOString();
    this.saveLocal();
    this.notify();
    setDoc(doc(db, 'showcase_cards', id), card).catch(() => {});

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: card.isActive ? 'Activated Showcase Card' : 'Deactivated Showcase Card',
        entity: 'ShowcaseCard',
        entityId: id,
        details: `${card.isActive ? 'Activated' : 'Deactivated'} showcase card "${card.title}"`,
      });
    }

    return true;
  }

  public getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  // Reset to initial seed demo
  public resetToSeedDemo() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.saveLocal();
    this.initFirestoreSync();
  }
}

export const dataService = new DataService();
