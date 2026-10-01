import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Filter,
  Download,
  Printer,
  ShieldCheck,
  UserCheck,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  Lock,
  Split,
  BookOpen,
  Info,
  ChevronDown,
  User,
  CheckSquare,
  Square,
  FileText,
  Activity,
  HeartPulse,
  Award,
  BarChart2,
  Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/db';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceClearance,
  Student,
  ClassRoom,
  Subject,
  Teacher,
  TimetablePeriodDefinition,
  TimetableSlot,
  DayOfWeek,
} from '../../types';
import { calculateStudentSubjectAttendance } from '../../utils/attendanceCalculator';
import { hasPermission } from '../../utils/permissions';
import { AttendanceClearanceView } from './AttendanceClearanceView';
import { StudentAttendanceClearanceView } from './StudentAttendanceClearanceView';
import { StudentAttendanceStatsModal } from './StudentAttendanceStatsModal';

export const normalizeRecordDate = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0].trim();
  }
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    return dateVal.toDate().toISOString().split('T')[0];
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal.toISOString().split('T')[0];
  }
  if (typeof dateVal.seconds === 'number') {
    return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
  }
  return String(dateVal).split('T')[0].trim();
};

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const AttendanceLeaveView: React.FC = () => {
  const { currentUser } = useAuth();
  const user = currentUser;
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isSuperAdmin = user?.role === 'super_admin';

  const [dbState, setDbState] = useState(() => dataService.getState());
  const [activeTab, setActiveTab] = useState<'mark' | 'summary' | 'clearance' | 'split-subjects'>('mark');

  // Selected date (Defaults to Today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Toggle: Show All Assigned Subjects (Includes other days & unscheduled)
  const [showAllSubjects, setShowAllSubjects] = useState<boolean>(false);

  // Active Subject and Period Selection
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  // For Super Admin: teacher selector (defaults to first teacher or current user)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Search filter for students
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Local in-memory session status map: studentId -> boolean (true = present, false = casual_leave)
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  // Clearance Modal State
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
  const [clearanceTargetStudentId, setClearanceTargetStudentId] = useState<string>('');
  const [clearanceTargetSubjectId, setClearanceTargetSubjectId] = useState<string>('ALL');
  const [clearanceApprovedPercentage, setClearanceApprovedPercentage] = useState<number>(85);
  const [clearanceRemarks, setClearanceRemarks] = useState<string>('');

  // Leave Conversion Modal State (for Academic, Official, Medical leave conversion by HoD/Academic Assistant)
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [conversionTargetRecord, setConversionTargetRecord] = useState<AttendanceRecord | null>(null);
  const [conversionTargetStatus, setConversionTargetStatus] = useState<'academic_leave' | 'official_leave' | 'medical_leave'>('academic_leave');
  const [conversionReason, setConversionReason] = useState<string>('');

  // Split Elective Enrollment Modal State
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentSubjectId, setEnrollmentSubjectId] = useState<string>('');
  const [tempEnrolledStudentIds, setTempEnrolledStudentIds] = useState<string[]>([]);

  // Attendance Submission Confirmation Alert Modal State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Student Attendance Statistics & Leave Days Modal Target
  const [selectedStudentForStats, setSelectedStudentForStats] = useState<Student | null>(null);

  // Print view state
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  // Summary filter state
  const [summaryAcademicYear, setSummaryAcademicYear] = useState<string>(() => dbState.currentAcademicYear || '2026-2027');
  const [summaryClassId, setSummaryClassId] = useState<string>(() => dbState.classes?.[0]?.id || '');
  const [summarySubjectId, setSummarySubjectId] = useState<string>('ALL');
  const [summaryFilterByDate, setSummaryFilterByDate] = useState<boolean>(false);

  useEffect(() => {
    return dataService.subscribe(() => {
      setDbState(dataService.getState());
    });
  }, []);

  const students = dbState.students || [];
  const subjects = dbState.subjects || [];
  const classes = dbState.classes || [];
  const teachers = dbState.teachers || [];
  const attendanceRecords = dbState.attendanceRecords || [];
  const clearances = dbState.attendanceClearances || [];
  const studentApplications = dbState.studentLeaveClearanceApplications || [];
  const rules = dbState.attendanceRules;

  // Keep academic year synchronized
  useEffect(() => {
    if (dbState.currentAcademicYear && !summaryAcademicYear) {
      setSummaryAcademicYear(dbState.currentAcademicYear);
    }
  }, [dbState.currentAcademicYear, summaryAcademicYear]);

  // Classes filtered by selected academic year for summary
  const availableSummaryClasses = useMemo(() => {
    if (!summaryAcademicYear) return classes;
    const filtered = classes.filter((c) => c.academicYear === summaryAcademicYear);
    return filtered.length > 0 ? filtered : classes;
  }, [classes, summaryAcademicYear]);

  // Keep summaryClassId pointing to a valid class
  useEffect(() => {
    if (availableSummaryClasses.length > 0) {
      if (!summaryClassId || !availableSummaryClasses.some((c) => c.id === summaryClassId)) {
        setSummaryClassId(availableSummaryClasses[0].id);
      }
    }
  }, [availableSummaryClasses, summaryClassId]);

  // Filter attendance records by academic year and optional selectedDate for reports
  const recordsForSummaryYear = useMemo(() => {
    return attendanceRecords.filter((r) => {
      if (summaryFilterByDate && r.date?.split('T')[0] !== selectedDate && r.date !== selectedDate) {
        return false;
      }
      if (summaryAcademicYear && r.academicYear) {
        return r.academicYear === summaryAcademicYear;
      }
      const c = classes.find((cl) => cl.id === r.classId);
      if (c?.academicYear && summaryAcademicYear) {
        return c.academicYear === summaryAcademicYear;
      }
      return true;
    });
  }, [attendanceRecords, summaryAcademicYear, summaryFilterByDate, selectedDate, classes]);

  const pendingClearanceAppsCount = useMemo(() => {
    return studentApplications.filter((a) => a.status === 'pending').length;
  }, [studentApplications]);
  const periods = useMemo(() => {
    return (dbState.timetablePeriods || []).slice().sort((a, b) => a.periodNumber - b.periodNumber);
  }, [dbState.timetablePeriods]);

  // Determine active teacher object
  const currentTeacherObj = useMemo(() => {
    if (isTeacher) {
      return (
        teachers.find(
          (t) => t.id === user?.id || t.username === user?.name || `user-${t.id}` === user?.id
        ) || teachers[0]
      );
    }
    if (isSuperAdmin) {
      if (selectedTeacherId) {
        return teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
      }
      return teachers[0];
    }
    return null;
  }, [teachers, user, isTeacher, isSuperAdmin, selectedTeacherId]);

  // Set default teacher ID for super admin
  useEffect(() => {
    if (isSuperAdmin && !selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [isSuperAdmin, selectedTeacherId, teachers]);

  // Day of week derived from selectedDate
  const currentDayOfWeek: DayOfWeek = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    const dayIndex = d.getDay();
    return DAYS_OF_WEEK[dayIndex] || 'Monday';
  }, [selectedDate]);

  // Check RBAC Permissions via centralized hasPermission utility
  const canClearance = useMemo(() => {
    return hasPermission(user, 'attendance_clearance', dbState);
  }, [user, dbState]);

  const canSplitElectives = useMemo(() => {
    return hasPermission(user, 'split_electives', dbState);
  }, [user, dbState]);

  const canSummary = useMemo(() => {
    return hasPermission(user, 'attendance_summary', dbState);
  }, [user, dbState]);

  // Backward-compatible alias for clearance components
  const canGrantClearance = canClearance;

  // Auto-switch away from restricted tabs if permissions change
  useEffect(() => {
    if (activeTab === 'clearance' && !canClearance) {
      setActiveTab('mark');
    } else if (activeTab === 'split-subjects' && !canSplitElectives) {
      setActiveTab('mark');
    } else if (activeTab === 'summary' && !canSummary) {
      setActiveTab('mark');
    }
  }, [activeTab, canClearance, canSplitElectives, canSummary]);

  // All subjects assigned to the effective teacher
  const teacherAllAssignedSubjects = useMemo(() => {
    if (!currentTeacherObj) {
      return subjects.filter((s) => s.status !== 'inactive' && s.trackAttendance !== false);
    }
    return subjects.filter((s) => {
      if (s.status === 'inactive' || s.trackAttendance === false) return false;
      if (isSuperAdmin && !selectedTeacherId) return true;
      if (s.assignedTeacherId === currentTeacherObj.id) return true;
      if (s.additionalTeacherIds?.includes(currentTeacherObj.id)) return true;
      if (currentTeacherObj.assignedSubjectIds?.includes(s.id)) return true;
      if (currentTeacherObj.canManageAllAttendance) return true;
      return false;
    });
  }, [subjects, currentTeacherObj, isSuperAdmin, selectedTeacherId]);

  // Timetable slots for this teacher today
  const teacherTodayScheduledSlots = useMemo(() => {
    const slots = dbState.timetableSlots || [];
    if (!currentTeacherObj) return [];
    return slots.filter((slot) => {
      if (slot.dayOfWeek !== currentDayOfWeek) return false;
      // Match by teacher ID directly or subject assigned to this teacher
      const slotSubject = subjects.find((s) => s.id === slot.subjectId);
      if (!slotSubject || slotSubject.trackAttendance === false) return false;

      const isTeacherSlot =
        slot.teacherId === currentTeacherObj.id ||
        slotSubject.assignedTeacherId === currentTeacherObj.id ||
        slotSubject.additionalTeacherIds?.includes(currentTeacherObj.id);

      return isTeacherSlot;
    }).sort((a, b) => a.periodNumber - b.periodNumber);
  }, [dbState.timetableSlots, currentDayOfWeek, currentTeacherObj, subjects]);

  // Available subjects to display in the selector:
  // When showAllSubjects is FALSE: Only subjects scheduled for today!
  // When showAllSubjects is TRUE: All assigned subjects of that teacher across all days!
  const visibleSubjectsToMark = useMemo(() => {
    if (!showAllSubjects) {
      // Return subjects scheduled for today
      // Extract unique subjects from today's slots
      const subjectMap = new Map<string, Subject>();
      teacherTodayScheduledSlots.forEach((slot) => {
        const sub = subjects.find((s) => s.id === slot.subjectId);
        if (sub) subjectMap.set(sub.id, sub);
      });
      return Array.from(subjectMap.values());
    } else {
      // Return all assigned subjects
      return teacherAllAssignedSubjects;
    }
  }, [showAllSubjects, teacherTodayScheduledSlots, teacherAllAssignedSubjects, subjects]);

  // Auto-select subject and period if not selected or invalid
  useEffect(() => {
    if (!showAllSubjects && teacherTodayScheduledSlots.length > 0) {
      const currentSelectedStillValid = teacherTodayScheduledSlots.some(
        (s) => s.subjectId === selectedSubjectId && s.periodNumber === selectedPeriod
      );
      if (!currentSelectedStillValid) {
        setSelectedSubjectId(teacherTodayScheduledSlots[0].subjectId);
        setSelectedPeriod(teacherTodayScheduledSlots[0].periodNumber);
      }
    } else if (visibleSubjectsToMark.length > 0) {
      const exists = visibleSubjectsToMark.some((s) => s.id === selectedSubjectId);
      if (!exists) {
        setSelectedSubjectId(visibleSubjectsToMark[0].id);
      }
    }
  }, [
    showAllSubjects,
    teacherTodayScheduledSlots,
    visibleSubjectsToMark,
    selectedSubjectId,
    selectedPeriod,
  ]);

  // Active Subject Object
  const currentSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  // Class of active subject
  const currentClass = useMemo(() => {
    if (!currentSubject) return null;
    return classes.find((c) => c.id === currentSubject.classId);
  }, [classes, currentSubject]);

  // Students of current subject (respecting split subject enrollment)
  const currentSubjectStudents = useMemo(() => {
    if (!currentSubject) return [];
    const list = students.filter(
      (s) => s.classId === currentSubject.classId && s.status === 'active'
    );
    if (currentSubject.isSplitSubject) {
      const enrolled = currentSubject.enrolledStudentIds || [];
      return list.filter((s) => enrolled.includes(s.id));
    }
    return list;
  }, [students, currentSubject]);

  // Filtered students based on search query
  const displayedStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return currentSubjectStudents;
    const q = studentSearchQuery.toLowerCase();
    return currentSubjectStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q)
    );
  }, [currentSubjectStudents, studentSearchQuery]);

  // All attendance records on this selectedDate across all classes
  const allRecordsOnSelectedDate = useMemo(() => {
    return attendanceRecords.filter((r) => normalizeRecordDate(r.date) === selectedDate);
  }, [attendanceRecords, selectedDate]);

  // Attendance records for current session (date + class + subject + period)
  const currentSessionRecords = useMemo(() => {
    if (!currentSubject) return [];
    return attendanceRecords.filter(
      (r) =>
        normalizeRecordDate(r.date) === selectedDate &&
        r.classId === currentSubject.classId &&
        r.subjectId === selectedSubjectId &&
        Number(r.period) === Number(selectedPeriod)
    );
  }, [attendanceRecords, selectedDate, currentSubject, selectedSubjectId, selectedPeriod]);

  // All attendance records on this selectedDate for current class
  const classRecordsOnSelectedDate = useMemo(() => {
    if (!currentClass) return [];
    return allRecordsOnSelectedDate.filter((r) => r.classId === currentClass.id);
  }, [allRecordsOnSelectedDate, currentClass]);

  // Map of periods that have recorded attendance on this selectedDate
  const recordedPeriodsOnSelectedDate = useMemo(() => {
    const map = new Map<number, {
      period: number;
      total: number;
      present: number;
      casualLeave: number;
      medicalLeave: number;
      academicLeave: number;
      subjectName: string;
      subjectId: string;
      markedBy?: string;
      markedAt?: string;
    }>();

    const targetList = currentClass ? classRecordsOnSelectedDate : allRecordsOnSelectedDate;
    targetList.forEach((r) => {
      const pNum = Number(r.period);
      const existing = map.get(pNum) || {
        period: pNum,
        total: 0,
        present: 0,
        casualLeave: 0,
        medicalLeave: 0,
        academicLeave: 0,
        subjectName: subjects.find((s) => s.id === r.subjectId)?.name || 'Subject',
        subjectId: r.subjectId,
        markedBy: r.markedBy,
        markedAt: r.markedAt,
      };
      existing.total++;
      if (r.status === 'present' || r.status === 'academic_leave') {
        existing.present++;
        if (r.status === 'academic_leave') existing.academicLeave++;
      } else if (r.status === 'medical_leave') {
        existing.medicalLeave++;
      } else {
        existing.casualLeave++;
      }
      map.set(pNum, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.period - b.period);
  }, [classRecordsOnSelectedDate, allRecordsOnSelectedDate, currentClass, subjects]);

  // When selectedDate changes, automatically switch to recorded period if available, or first slot
  const prevDateRef = useRef(selectedDate);
  useEffect(() => {
    if (prevDateRef.current !== selectedDate) {
      prevDateRef.current = selectedDate;
      const dateRecords = attendanceRecords.filter((r) => normalizeRecordDate(r.date) === selectedDate);
      if (dateRecords.length > 0) {
        // If there's a record matching the current class or teacher, select that session
        const matchingRecord =
          dateRecords.find((r) => {
            if (currentClass && r.classId === currentClass.id) return true;
            if (visibleSubjectsToMark.some((s) => s.id === r.subjectId)) return true;
            return false;
          }) || dateRecords[0];

        if (matchingRecord) {
          setSelectedSubjectId(matchingRecord.subjectId);
          setSelectedPeriod(Number(matchingRecord.period));
          return;
        }
      }

      // If no attendance records on that date, pick timetable slot if available
      if (teacherTodayScheduledSlots.length > 0) {
        setSelectedSubjectId(teacherTodayScheduledSlots[0].subjectId);
        setSelectedPeriod(Number(teacherTodayScheduledSlots[0].periodNumber));
      }
    }
  }, [selectedDate, attendanceRecords, currentClass, visibleSubjectsToMark, teacherTodayScheduledSlots]);

  // Initialize in-memory presentMap when session changes or records update
  useEffect(() => {
    const initialMap: Record<string, boolean> = {};
    if (currentSessionRecords.length > 0) {
      // Existing records: present if status is present or academic_leave
      currentSubjectStudents.forEach((student) => {
        const rec = currentSessionRecords.find((r) => r.studentId === student.id);
        if (rec) {
          initialMap[student.id] = rec.status === 'present' || rec.status === 'academic_leave';
        } else {
          initialMap[student.id] = false; // Default unchecked is casual leave
        }
      });
    } else {
      // Fresh session: default all students to present for speed, or user can toggle/untoggle
      currentSubjectStudents.forEach((student) => {
        initialMap[student.id] = true;
      });
    }
    setPresentMap(initialMap);
  }, [selectedSubjectId, selectedPeriod, selectedDate, currentSubjectStudents, currentSessionRecords]);

  // Clear success feedback when navigating away from subject/period/date
  useEffect(() => {
    setSubmitFeedback(null);
  }, [selectedSubjectId, selectedPeriod, selectedDate]);

  // Check if session is already saved in DB
  const isSessionAlreadySaved = currentSessionRecords.length > 0;

  // Toggle single student present checkbox
  const handleToggleStudentPresent = (studentId: string) => {
    setPresentMap((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // Check if all displayed students are marked present
  const allPresentChecked = useMemo(() => {
    if (displayedStudents.length === 0) return false;
    return displayedStudents.every((s) => !!presentMap[s.id]);
  }, [displayedStudents, presentMap]);

  // Toggle select / deselect all
  const handleToggleSelectDeselectAll = () => {
    const next = { ...presentMap };
    if (allPresentChecked) {
      displayedStudents.forEach((s) => {
        next[s.id] = false;
      });
    } else {
      displayedStudents.forEach((s) => {
        next[s.id] = true;
      });
    }
    setPresentMap(next);
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const next: Record<string, boolean> = {};
    currentSubjectStudents.forEach((s) => {
      next[s.id] = true;
    });
    setPresentMap(next);
  };

  // Uncheck all (all become Casual Leave)
  const handleUncheckAll = () => {
    const next: Record<string, boolean> = {};
    currentSubjectStudents.forEach((s) => {
      next[s.id] = false;
    });
    setPresentMap(next);
  };

  // List of students who will be marked as casual leave in this session (unchecked students)
  const casualLeaveStudents = useMemo(() => {
    return currentSubjectStudents.filter((std) => !presentMap[std.id]);
  }, [currentSubjectStudents, presentMap]);

  // Open confirmation alert modal informing of casual leave students before submitting
  const handleSubmitAttendance = () => {
    if (!currentSubject || !currentClass) return;
    setShowConfirmModal(true);
  };

  // Submit attendance to database after user confirms in the alert modal
  const handleConfirmSubmitAttendance = async () => {
    if (!currentSubject || !currentClass) return;

    const recordsToSave = currentSubjectStudents.map((std) => {
      const isPresent = presentMap[std.id] ?? false;
      const status: AttendanceStatus = isPresent ? 'present' : 'casual_leave';
      return {
        studentId: std.id,
        status,
      };
    });

    const targetAcademicYear = currentClass.academicYear || dbState.currentAcademicYear || '2026-2027';

    await dataService.savePeriodAttendance({
      date: selectedDate,
      classId: currentClass.id,
      subjectId: currentSubject.id,
      period: selectedPeriod,
      academicYear: targetAcademicYear,
      records: recordsToSave,
      markedBy: user?.name || currentTeacherObj?.name || 'Teacher',
    });

    const presentCount = recordsToSave.filter((r) => r.status === 'present').length;
    const casualLeaveCount = recordsToSave.length - presentCount;

    setSubmitFeedback(
      `Attendance saved to database: ${presentCount} Present, ${casualLeaveCount} Casual Leave (Academic Year ${targetAcademicYear}).`
    );

    setShowConfirmModal(false);

    setTimeout(() => {
      setSubmitFeedback(null);
    }, 5000);
  };

  // =========================================================================
  // SUMMARY STATISTICS FOR ACTIVE SUBJECT
  // =========================================================================
  const subjectSummaryStats = useMemo(() => {
    if (!currentSubject) {
      return {
        totalClassesHeld: 0,
        totalEnrolled: 0,
        presentThisSession: 0,
        casualLeaveThisSession: 0,
        sessionRate: 0,
        historicalRate: 0,
      };
    }

    const allSubjectRecords = attendanceRecords.filter(
      (r) => r.subjectId === currentSubject.id
    );

    // Total classes held = distinct sessions (date + period)
    const distinctSessions = new Set(
      allSubjectRecords.map((r) => `${r.date}_P${r.period}`)
    );
    const totalClassesHeld = distinctSessions.size;

    const totalEnrolled = currentSubjectStudents.length;
    const presentThisSession = currentSubjectStudents.filter((s) => presentMap[s.id]).length;
    const casualLeaveThisSession = totalEnrolled - presentThisSession;
    const sessionRate = totalEnrolled > 0 ? Math.round((presentThisSession / totalEnrolled) * 100) : 0;

    // Historical attendance rate across all conducted sessions
    const totalPresentOrAcademic = allSubjectRecords.filter(
      (r) => r.status === 'present' || r.status === 'academic_leave'
    ).length;
    const historicalRate =
      allSubjectRecords.length > 0
        ? Math.round((totalPresentOrAcademic / allSubjectRecords.length) * 100)
        : 100;

    return {
      totalClassesHeld,
      totalEnrolled,
      presentThisSession,
      casualLeaveThisSession,
      sessionRate,
      historicalRate,
    };
  }, [currentSubject, attendanceRecords, currentSubjectStudents, presentMap]);

  // Clearance save handler
  const handleSaveClearance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearanceTargetStudentId) return;

    dataService.grantAttendanceClearance({
      studentId: clearanceTargetStudentId,
      subjectId: clearanceTargetSubjectId === 'ALL' ? undefined : clearanceTargetSubjectId,
      academicYear: dbState.currentAcademicYear || '2025-2026',
      reason: clearanceRemarks || 'Attendance condonation approved by authority',
      approvedPercentage: clearanceApprovedPercentage,
      grantedBy: user?.id || 'admin',
      grantedByName: user?.name || currentTeacherObj?.name || 'Authority',
      grantedByRole: currentTeacherObj?.specialRoleTitle || user?.role || 'HoD / Authority',
    });

    setIsClearanceModalOpen(false);
    setClearanceTargetStudentId('');
    setClearanceRemarks('');
  };

  // Leave conversion save handler (Converting casual leave/absence to Academic, Official, or Medical leave)
  const handleSaveConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversionTargetRecord) return;

    dataService.updateAttendanceRecordStatus(
      conversionTargetRecord.id,
      conversionTargetStatus,
      conversionReason || `Converted to ${conversionTargetStatus.replace('_', ' ')}`,
      {
        id: user?.id || 'admin',
        name: user?.name || currentTeacherObj?.name || 'Authority',
        role: currentTeacherObj?.specialRoleTitle || user?.role || 'HoD / Authority',
      }
    );

    setIsConversionModalOpen(false);
    setConversionTargetRecord(null);
    setConversionReason('');
  };

  // Split Subject enrollment save
  const handleSaveEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentSubjectId) return;

    dataService.updateSubjectEnrolledStudents(enrollmentSubjectId, tempEnrolledStudentIds);
    setIsEnrollmentModalOpen(false);
  };

  // Export Attendance Summary to Excel (.xlsx)
  const handleExportExcel = () => {
    const targetStudents = students.filter(
      (s) => s.classId === summaryClassId && s.status === 'active'
    );

    const summaryData = targetStudents.map((student) => {
      const stats = calculateStudentSubjectAttendance(
        student.id,
        summarySubjectId,
        recordsForSummaryYear,
        clearances,
        rules
      );

      return {
        'Academic Year': summaryAcademicYear || dbState.currentAcademicYear || '2026-2027',
        'Admission No': student.admissionNumber,
        'Student Name': student.name,
        Class: classes.find((c) => c.id === summaryClassId)?.name || summaryClassId,
        Subject: summarySubjectId === 'ALL' ? 'All Subjects' : subjects.find((s) => s.id === summarySubjectId)?.name,
        'Total Classes': stats.totalPeriods,
        Present: stats.presentCount,
        'Academic Leave (Present)': stats.academicLeaveCount,
        'Official Leave': stats.officialLeaveCount,
        'Casual Leave': stats.casualLeaveCount,
        'Medical Leave': stats.medicalLeaveCount,
        'Effective Present %': `${stats.effectivePresentPercent}%`,
        'Overall Attendance % (Without Medical)': `${stats.overallPercentWithoutMedical}%`,
        'Status (85% Req)': stats.isCleared
          ? 'Cleared / Condoned'
          : stats.isShortage
          ? 'Shortage (<85%)'
          : 'Eligible',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(summaryData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Attendance ${summaryAcademicYear}`);

    const fileName = `Attendance_Report_${summaryClassId}_${summaryAcademicYear}_${selectedDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // =========================================================================
  // 🎓 DEDICATED STUDENT VIEW (Restricted to own data)
  // =========================================================================
  if (isStudent) {
    const studentAdmissionNumber = user?.admissionNumber;
    const currentStudent = students.find(
      (s) =>
        s.admissionNumber === studentAdmissionNumber ||
        s.id === user?.studentId ||
        s.id === user?.id
    );

    if (!currentStudent) {
      return (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-800">Student Profile Not Linked</h2>
          <p className="text-xs text-slate-600 mt-1">
            Could not find attendance records for admission #{studentAdmissionNumber}.
          </p>
        </div>
      );
    }

    const studentClassSubjects = subjects.filter(
      (s) =>
        s.classId === currentStudent.classId &&
        s.trackAttendance !== false &&
        (!s.isSplitSubject || s.enrolledStudentIds?.includes(currentStudent.id))
    );

    return (
      <StudentAttendanceClearanceView
        currentStudent={currentStudent}
        classes={classes}
        subjects={subjects}
        attendanceRecords={attendanceRecords}
        clearances={clearances}
        rules={rules}
        studentApplications={studentApplications}
        onRefresh={() => setDbState(dataService.getState())}
      />
    );
  }

  // =========================================================================
  // 👨‍🏫 TEACHER & STAFF ATTENDANCE WORKSPACE
  // =========================================================================
  return (
    <div id="attendance-hajar-view" className="space-y-6 pb-12">
      {/* Prominent Floating Submission Success Banner */}
      {submitFeedback && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md animate-bounce-short shadow-2xl">
          <div className="flex items-center gap-3 p-4 bg-emerald-700 text-white rounded-2xl border-2 border-emerald-400 shadow-xl">
            <div className="p-2 bg-emerald-800 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-200" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black tracking-wide">Attendance Submitted Successfully!</div>
              <div className="text-xs text-emerald-100 mt-0.5 font-medium">{submitFeedback}</div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitFeedback(null)}
              className="p-1 text-emerald-200 hover:text-white hover:bg-emerald-600/60 rounded-lg transition-colors cursor-pointer"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sleek Compact Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              Hajar Attendance
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Fast Roll Call
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto shrink-0">
          <button
            id="tab-mark-attendance"
            type="button"
            onClick={() => setActiveTab('mark')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === 'mark'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mark Attendance
          </button>

          {canSummary && (
            <button
              id="tab-attendance-summary"
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Summary & Reports
            </button>
          )}

          {canClearance && (
            <button
              id="tab-attendance-clearance"
              type="button"
              onClick={() => setActiveTab('clearance')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'clearance'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Attendance Clearance</span>
              {pendingClearanceAppsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                  {pendingClearanceAppsCount}
                </span>
              )}
            </button>
          )}

          {canSplitElectives && (
            <button
              id="tab-split-subjects"
              type="button"
              onClick={() => setActiveTab('split-subjects')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === 'split-subjects'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Split Electives
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: TEACHER-CENTRIC MARK ATTENDANCE
          - Shows that day's assigned subjects only (no need to select class)
          - Toggle "Show All" to see all assigned subjects across all days
          - Select subject -> Shows all students of that subject
          - Checkbox to tick Present (only), default unchecked is Casual Leave
          - Submit option
          - Summary statistics: Total classes, enrolled, session rates
      ========================================================================= */}
      {activeTab === 'mark' && (
        <div className="space-y-5">
          {/* Controls Bar: Date Picker, "Show all subjects", and Today's/Assigned Subjects */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* For Super Admin: Teacher Selector */}
                {isSuperAdmin && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                      Viewing as Teacher
                    </label>
                    <select
                      id="select-teacher-view"
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="text-xs font-semibold py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.specialRoleTitle ? `(${t.specialRoleTitle})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                    Attendance Date
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-attendance-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-xs font-medium py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                    />
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {currentDayOfWeek}
                    </span>
                  </div>
                </div>
              </div>

              {/* Show all subjects checkbox */}
              <div className="self-start sm:self-end">
                <label
                  id="toggle-show-all-teacher-subjects"
                  className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold ${
                    showAllSubjects
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showAllSubjects}
                    onChange={(e) => setShowAllSubjects(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Show all subjects</span>
                </label>
              </div>
            </div>

            {/* Below the date display today's subjects (or all assigned subjects if toggled) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {!showAllSubjects
                      ? `Scheduled Subjects for ${selectedDate} (${currentDayOfWeek})`
                      : `All Assigned Subjects (${currentTeacherObj?.name || 'Teacher'})`}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {visibleSubjectsToMark.length} subjects
                </span>
              </div>

              {visibleSubjectsToMark.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  {!showAllSubjects ? (
                    <div>
                      No subjects scheduled for {currentTeacherObj?.name || 'you'} on {currentDayOfWeek}.
                      <button
                        type="button"
                        onClick={() => setShowAllSubjects(true)}
                        className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-bold underline cursor-pointer"
                      >
                        Show all subjects
                      </button>
                    </div>
                  ) : (
                    <div>No assigned subjects found for this teacher.</div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {visibleSubjectsToMark.map((sub) => {
                    const cls = classes.find((c) => c.id === sub.classId);
                    const isSelected = selectedSubjectId === sub.id;

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(sub.id);
                          const todaySlot = teacherTodayScheduledSlots.find((s) => s.subjectId === sub.id);
                          if (todaySlot) {
                            setSelectedPeriod(todaySlot.periodNumber);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs line-clamp-1 leading-tight">
                          {sub.name}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                          {cls?.name || 'Class'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE SUBJECT WORKSPACE: SHORT SUMMARY STATISTICS & STUDENT LIST */}
          {currentSubject && currentClass ? (
            <div className="space-y-3">
              {/* Short & Sleek Attendance Session Bar & Compact Stats */}
              <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                {/* Top Row: Period, Subject, Session Info & Action Buttons */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <select
                      id="select-active-period"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-pointer focus:outline-none"
                    >
                      {periods.filter((p) => !p.isBreak).length > 0 ? (
                        periods
                          .filter((p) => !p.isBreak)
                          .map((p) => (
                            <option key={p.id || p.periodNumber} value={p.periodNumber}>
                              {p.name || `Period ${p.periodNumber}`} ({p.startTime} - {p.endTime})
                            </option>
                          ))
                      ) : (
                        [1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => (
                          <option key={p} value={p}>
                            Period {p}
                          </option>
                        ))
                      )}
                    </select>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">
                      {currentSubject.name}{' '}
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ({currentClass.name})
                      </span>
                    </h2>
                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedDate} ({currentDayOfWeek})
                      {currentSubject.isSplitSubject && ` • [Split: ${currentSubject.splitGroupName || 'Elective'}]`}
                    </span>
                  </div>

                  {/* Submission Status & Submit Button in one compact row */}
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    {submitFeedback && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-fade-in">
                        ✓ {submitFeedback}
                      </span>
                    )}

                    {isSessionAlreadySaved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Saved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        New / Unsaved
                      </span>
                    )}

                    <button
                      id="btn-submit-attendance-top"
                      type="button"
                      onClick={handleSubmitAttendance}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Submit</span>
                    </button>
                  </div>
                </div>

                {/* Ultra-slim inline Attendance Statistics to save screen space */}
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Classes Held: <strong className="text-slate-800 dark:text-slate-200">{subjectSummaryStats.totalClassesHeld}</strong></span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>Enrolled: <strong className="text-slate-800 dark:text-slate-200">{subjectSummaryStats.totalEnrolled}</strong></span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-emerald-700 dark:text-emerald-400">Present (Now): <strong className="font-bold">{subjectSummaryStats.presentThisSession}</strong></span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-amber-700 dark:text-amber-400">Casual Leave: <strong className="font-bold">{subjectSummaryStats.casualLeaveThisSession}</strong></span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>Session Rate: <strong className="text-emerald-600 dark:text-emerald-400">{subjectSummaryStats.sessionRate}%</strong></span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Overall: <strong className="text-slate-800 dark:text-slate-200">{subjectSummaryStats.historicalRate}%</strong></span>
                </div>
                {/* Visual Session State Banner for selectedDate & selectedPeriod */}
                {isSessionAlreadySaved ? (
                  <div className="px-3.5 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold text-emerald-950 dark:text-emerald-100">
                          Saved in Database for {selectedDate} ({currentDayOfWeek}) • Period {selectedPeriod}
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-300 ml-2 font-medium">
                          ({currentSessionRecords.filter((r) => r.status === 'present' || r.status === 'academic_leave').length} Present,{' '}
                          {currentSessionRecords.filter((r) => r.status !== 'present' && r.status !== 'academic_leave').length} Casual Leave)
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                      {currentSessionRecords[0]?.markedBy ? `Recorded by ${currentSessionRecords[0].markedBy}` : 'Synced with Cloud'}
                    </div>
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          Unsaved Session for {selectedDate} ({currentDayOfWeek}) • Period {selectedPeriod}
                        </span>
                        <span className="text-amber-700 dark:text-amber-400 ml-2 font-medium">
                          No database records found for this date & period yet.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const map: Record<string, boolean> = {};
                          currentSubjectStudents.forEach((s) => (map[s.id] = true));
                          setPresentMap(map);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 cursor-pointer shadow-2xs"
                      >
                        All Present
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const map: Record<string, boolean> = {};
                          currentSubjectStudents.forEach((s) => (map[s.id] = false));
                          setPresentMap(map);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STUDENT LIST & CHECKBOX TO TICK PRESENT (ONLY) */}
              {/* Default unchecked option is Casual Leave */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                {/* List Action Toolbar */}
                <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student or admission #..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-100 w-56 font-medium"
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline">
                      Showing {displayedStudents.length} students
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      id="btn-select-deselect-all"
                      type="button"
                      onClick={handleToggleSelectDeselectAll}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{allPresentChecked ? 'Deselect All' : 'Select All (Present)'}</span>
                    </button>
                  </div>
                </div>

                {/* Mobile View: High-contrast touch-friendly Cards (No horizontal scrolling) */}
                <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedStudents.map((student, idx) => {
                    const isPresent = presentMap[student.id] ?? false;

                    return (
                      <div
                        key={`mobile-${student.id}`}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                          isPresent
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                          onClick={() => setSelectedStudentForStats(student)}
                          title="Click to view student attendance statistics and leave days"
                        >
                          <span className="font-mono text-[11px] text-slate-400 w-5 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {student.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate flex items-center gap-1.5">
                              <span>{student.name}</span>
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                                Stats & Leaves
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              Adm #{student.admissionNumber}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Toggle Button */}
                        <div
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleStudentPresent(student.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
                              isPresent
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isPresent ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Present</span>
                              </>
                            ) : (
                              <span>Mark Present</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tablet & Desktop View: Clean 3-Column Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Student Details (Click to view statistics & leave days)</th>
                        <th className="py-3 px-4 text-right">Attendance Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {displayedStudents.map((student, idx) => {
                        const isPresent = presentMap[student.id] ?? false;

                        return (
                          <tr
                            key={student.id}
                            className={`transition-colors ${
                              isPresent
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-3 px-4 font-mono text-slate-400 dark:text-slate-500 text-center">
                              {idx + 1}
                            </td>
                            <td
                              className="py-3 px-4 cursor-pointer group"
                              onClick={() => setSelectedStudentForStats(student)}
                              title="Click to view student attendance statistics and leave days"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105 ${
                                      isPresent
                                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {student.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      <span>{student.name}</span>
                                      {isPresent ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                                          Present
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                          Casual Leave
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                      Adm #{student.admissionNumber}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudentForStats(student);
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer shadow-2xs shrink-0"
                                >
                                  <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Stats & Leaves</span>
                                </button>
                              </div>
                            </td>
                            <td
                              className="py-3 px-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleStudentPresent(student.id)}
                                className={`inline-flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-xl border transition-all text-xs font-bold shadow-2xs ${
                                  isPresent
                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                }`}
                              >
                                {isPresent ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                    <span>Present</span>
                                  </>
                                ) : (
                                  <>
                                    <Square className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Tick Present</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Submit Footer */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Marking for <strong className="text-slate-800 dark:text-slate-200">{currentSubject.name}</strong> • Period {selectedPeriod} •{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">{subjectSummaryStats.presentThisSession} Present</strong>,{' '}
                    <strong className="text-slate-700 dark:text-slate-300">{subjectSummaryStats.casualLeaveThisSession} Casual Leave</strong>
                  </div>

                  <button
                    id="btn-submit-attendance-bottom"
                    type="button"
                    onClick={handleSubmitAttendance}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      Submit Attendance ({subjectSummaryStats.presentThisSession} Present •{' '}
                      {subjectSummaryStats.casualLeaveThisSession} Casual Leave)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No Subject Selected</div>
              <div className="text-xs text-slate-500">
                Please select an assigned subject above to mark attendance.
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ATTENDANCE SUMMARY & REPORTS (EXCEL & PRINT)
      ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Academic Year</label>
                <select
                  value={summaryAcademicYear}
                  onChange={(e) => setSummaryAcademicYear(e.target.value)}
                  className="text-sm font-semibold py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                >
                  {(dbState.academicYears || []).map((ay) => (
                    <option key={ay.id} value={ay.year}>
                      {ay.year} {ay.year === dbState.currentAcademicYear ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Class</label>
                <select
                  value={summaryClassId}
                  onChange={(e) => setSummaryClassId(e.target.value)}
                  className="text-sm font-semibold py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                >
                  {availableSummaryClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.academicYear ? `(${c.academicYear})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Subject</label>
                <select
                  value={summarySubjectId}
                  onChange={(e) => setSummarySubjectId(e.target.value)}
                  className="text-sm font-semibold py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                >
                  <option value="ALL">All Subjects (Combined)</option>
                  {subjects
                    .filter((s) => s.classId === summaryClassId && s.status !== 'inactive')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                </select>
              </div>

              {/* Date Filter for Summary Report */}
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={summaryFilterByDate}
                    onChange={(e) => setSummaryFilterByDate(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Filter by Date</span>
                </label>

                {summaryFilterByDate && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-xs font-medium py-1 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 dark:text-slate-200"
                    />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      {currentDayOfWeek}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Student attendance summary breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3">Total Sessions</th>
                    <th className="py-3 px-3">Present</th>
                    <th className="py-3 px-3">Academic Leave</th>
                    <th className="py-3 px-3">Official Leave</th>
                    <th className="py-3 px-3">Casual Leave</th>
                    <th className="py-3 px-3">Medical Leave</th>
                    <th className="py-3 px-3">Attendance %</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => s.classId === summaryClassId && s.status === 'active')
                    .map((student, idx) => {
                      const stats = calculateStudentSubjectAttendance(
                        student.id,
                        summarySubjectId,
                        recordsForSummaryYear,
                        clearances,
                        rules
                      );

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{student.name}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Adm #{student.admissionNumber}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">{stats.totalPeriods}</td>
                          <td className="py-3 px-3 text-emerald-700 font-bold">{stats.presentCount}</td>
                          <td className="py-3 px-3 text-purple-700 font-medium">{stats.academicLeaveCount}</td>
                          <td className="py-3 px-3 text-blue-700 font-medium">{stats.officialLeaveCount}</td>
                          <td className="py-3 px-3 text-slate-700 font-medium">{stats.casualLeaveCount}</td>
                          <td className="py-3 px-3 text-amber-700 font-medium">{stats.medicalLeaveCount}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-bold text-sm ${
                                stats.isShortage ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {stats.overallPercentWithoutMedical}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {stats.isCleared ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5" /> Cleared
                              </span>
                            ) : stats.isShortage ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5" /> Shortage
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ATTENDANCE CLEARANCE & CONDONATION (RESTRICTED TO SPECIFIC USERS: ACADEMIC ASSISTANT, HOD, PRINCIPAL, SUPER ADMIN)
          - In attendance clearance option: shows Academic leave, Official leave, Medical leave
          - Allows converting casual leaves or granting condonation
      ========================================================================= */}
      {activeTab === 'clearance' && (
        <div className="space-y-5">
          {!canGrantClearance ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <Lock className="w-10 h-10 text-amber-500 mx-auto" />
              <h2 className="text-base font-bold text-slate-800">
                Restricted Clearance Access
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Attendance clearance, condonation, and leave conversions (Academic, Official, Medical) are restricted to authorized institutional authorities: <strong>Academic Assistant, HoD, HoS, Principal, and Super Admin</strong>.
              </p>
              <div className="text-[11px] text-slate-500">
                Current role: <strong>{currentTeacherObj?.specialRoleTitle || user?.role || 'Teacher'}</strong>
              </div>
            </div>
          ) : (
            <AttendanceClearanceView
              currentUser={user}
              currentTeacherObj={currentTeacherObj}
              students={students}
              classes={classes}
              subjects={subjects}
              attendanceRecords={attendanceRecords}
              clearances={clearances}
              rules={rules}
              studentApplications={studentApplications}
              onRefresh={() => setDbState(dataService.getState())}
            />
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: SPLIT ELECTIVES MANAGEMENT
      ========================================================================= */}
      {activeTab === 'split-subjects' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-800 mb-1">
              Split Elective Subject Management
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Manage periods where classes split into electives (e.g. Computer Application vs Humanities).
              Enrolled students are tracked exclusively, preventing false absences.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects
                .filter((s) => s.status !== 'inactive')
                .map((sub) => {
                  const enrolledIds = sub.enrolledStudentIds || [];
                  const cls = classes.find((c) => c.id === sub.classId);

                  return (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        sub.isSplitSubject
                          ? 'bg-purple-50/50 border-purple-200'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{sub.name}</span>
                          <span className="text-xs font-mono text-slate-600">({sub.code})</span>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            sub.isSplitSubject
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {sub.isSplitSubject ? 'Split Elective' : 'Standard Subject'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 mb-3">
                        <div>
                          Class: <strong>{cls?.name}</strong>
                        </div>
                        <div>
                          Assigned Teacher:{' '}
                          <strong>
                            {teachers.find((t) => t.id === sub.assignedTeacherId)?.name || 'Unassigned'}
                          </strong>
                        </div>
                        <div>
                          Enrolled Students:{' '}
                          <strong className="text-slate-800">
                            {sub.isSplitSubject ? enrolledIds.length : 'All Class Students'}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const classAllStudents = students.filter(
                              (s) => s.classId === sub.classId && s.status === 'active'
                            );
                            dataService.updateSubjectAttendanceSettings(sub.id, {
                              isSplitSubject: !sub.isSplitSubject,
                              splitGroupName: !sub.isSplitSubject ? sub.name : undefined,
                              enrolledStudentIds: !sub.isSplitSubject
                                ? classAllStudents.slice(0, Math.ceil(classAllStudents.length / 2)).map((s) => s.id)
                                : undefined,
                            });
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            sub.isSplitSubject
                              ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                              : 'bg-purple-700 text-white hover:bg-purple-800'
                          }`}
                        >
                          {sub.isSplitSubject ? 'Convert to Standard' : 'Enable Split Elective'}
                        </button>

                        {sub.isSplitSubject && (
                          <button
                            type="button"
                            onClick={() => {
                              setEnrollmentSubjectId(sub.id);
                              setTempEnrolledStudentIds(sub.enrolledStudentIds || []);
                              setIsEnrollmentModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg transition-all"
                          >
                            Manage Enrolled Students
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: GRANT CONDONATION CLEARANCE
      ========================================================================= */}
      {isClearanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span>Grant Attendance Clearance</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsClearanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClearance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Student
                </label>
                <select
                  value={clearanceTargetStudentId}
                  onChange={(e) => setClearanceTargetStudentId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  required
                >
                  {students
                    .filter((s) => s.status === 'active')
                    .map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name} (Adm #{std.admissionNumber})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicable Subject
                </label>
                <select
                  value={clearanceTargetSubjectId}
                  onChange={(e) => setClearanceTargetSubjectId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                >
                  <option value="ALL">All Subjects (Institutional Overall Clearance)</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approved Condoned Percentage (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={clearanceApprovedPercentage}
                  onChange={(e) => setClearanceApprovedPercentage(Number(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  required
                />
                <span className="text-[10px] text-slate-500">
                  Default condonation threshold is 85%.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason & Official Authority Remarks
                </label>
                <textarea
                  value={clearanceRemarks}
                  onChange={(e) => setClearanceRemarks(e.target.value)}
                  placeholder="e.g., Condonation approved on recommendation of HoD & Academic Council due to documented sports representation."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 h-20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClearanceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
                >
                  Issue Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: LEAVE CONVERSION (HOD / ACADEMIC ASSISTANT TO ACADEMIC, OFFICIAL, MEDICAL LEAVE)
      ========================================================================= */}
      {isConversionModalOpen && conversionTargetRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <span>Authority Leave Conversion</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsConversionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
              <div>
                Student:{' '}
                <strong>
                  {students.find((s) => s.id === conversionTargetRecord.studentId)?.name}
                </strong>
              </div>
              <div>
                Date & Period:{' '}
                <strong>
                  {conversionTargetRecord.date} • Period {conversionTargetRecord.period}
                </strong>
              </div>
              <div>
                Current Status:{' '}
                <span className="capitalize font-bold text-slate-700">
                  {conversionTargetRecord.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveConversion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Convert to Leave Category
                </label>
                <select
                  value={conversionTargetStatus}
                  onChange={(e) =>
                    setConversionTargetStatus(
                      e.target.value as 'academic_leave' | 'official_leave' | 'medical_leave'
                    )
                  }
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                >
                  <option value="academic_leave">
                    Academic Leave (Counted as 100% Present)
                  </option>
                  <option value="official_leave">
                    Official Leave (Institutional Representation - max 10%)
                  </option>
                  <option value="medical_leave">
                    Medical Leave (Excluded from attendance denominator)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason & Reference Documentation
                </label>
                <textarea
                  value={conversionReason}
                  onChange={(e) => setConversionReason(e.target.value)}
                  placeholder="e.g., Participated in State Inter-University Debate Championship / Medical certificate #8843 submitted."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 h-20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConversionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs"
                >
                  Confirm Conversion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SPLIT ELECTIVES STUDENT ENROLLMENT
      ========================================================================= */}
      {isEnrollmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Split className="w-5 h-5 text-purple-700" />
                <span>Manage Split Elective Enrollment</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEnrollmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Select students enrolled in this elective subject. Students not selected will not be marked absent during this period.
            </div>

            <form onSubmit={handleSaveEnrollment} className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                {students
                  .filter(
                    (s) =>
                      s.classId ===
                        subjects.find((sub) => sub.id === enrollmentSubjectId)?.classId &&
                      s.status === 'active'
                  )
                  .map((student) => {
                    const isEnrolled = tempEnrolledStudentIds.includes(student.id);

                    return (
                      <label
                        key={student.id}
                        className="flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer rounded-lg select-none"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isEnrolled}
                            onChange={() => {
                              if (isEnrolled) {
                                setTempEnrolledStudentIds(
                                  tempEnrolledStudentIds.filter((id) => id !== student.id)
                                );
                              } else {
                                setTempEnrolledStudentIds([...tempEnrolledStudentIds, student.id]);
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-xs text-slate-800">{student.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Adm #{student.admissionNumber}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isEnrolled
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isEnrolled ? 'Enrolled' : 'Not Enrolled'}
                        </span>
                      </label>
                    );
                  })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {tempEnrolledStudentIds.length} students selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEnrollmentModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs"
                  >
                    Save Enrollment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ATTENDANCE SUBMISSION CONFIRMATION ALERT MODAL
          Informs the user which students are marked as Casual Leave and requires confirmation
      ========================================================================= */}
      {showConfirmModal && currentSubject && currentClass && (
        <div
          id="modal-attendance-confirm"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in my-8">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    casualLeaveStudents.length > 0
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {casualLeaveStudents.length > 0 ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Confirm Attendance Submission
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {currentSubject.name} • {currentClass.name} • Period {selectedPeriod}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-attendance-modal"
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Session Summary Chips */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-white">
                    {currentSubjectStudents.length}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Present
                  </div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {currentSubjectStudents.length - casualLeaveStudents.length}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Casual Leave
                  </div>
                  <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {casualLeaveStudents.length}
                  </div>
                </div>
              </div>

              {/* Casual Leave Students Alert Box */}
              {casualLeaveStudents.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        The following {casualLeaveStudents.length} student{casualLeaveStudents.length > 1 ? 's are' : ' is'} marked as Casual Leave:
                      </span>
                      <span className="block text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                        These students will be recorded as absent (Casual Leave) for this period. Please review and click confirm.
                      </span>
                    </div>
                  </div>

                  {/* Scrollable List of Casual Leave Students */}
                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {casualLeaveStudents.map((std, idx) => (
                      <div
                        key={std.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 text-center text-[11px] font-mono text-slate-400">
                            {idx + 1}
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
                            {std.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-white">
                              {std.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              Adm #{std.admissionNumber}
                            </div>
                          </div>
                        </div>

                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          Casual Leave
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-center space-y-1">
                  <div className="inline-flex p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    All {currentSubjectStudents.length} Students Are Marked Present
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    There are no casual leave (absent) students for this session.
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Date: <strong>{selectedDate}</strong> ({currentDayOfWeek}) • Period: <strong>{selectedPeriod}</strong>
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-attendance-modal"
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel / Edit
              </button>
              <button
                id="btn-confirm-attendance-submit"
                type="button"
                onClick={handleConfirmSubmitAttendance}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {casualLeaveStudents.length > 0
                    ? `Confirm (${casualLeaveStudents.length} Casual Leave)`
                    : 'Confirm & Save Attendance'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Student Attendance Statistics & Leave Days Modal */}
      {selectedStudentForStats && (
        <StudentAttendanceStatsModal
          student={selectedStudentForStats}
          isOpen={!!selectedStudentForStats}
          onClose={() => setSelectedStudentForStats(null)}
          academicYear={currentClass?.academicYear || dbState.currentAcademicYear || '2026-2027'}
          attendanceRecords={attendanceRecords}
          leaveApplications={dbState.leaveApplications || []}
          subjects={subjects}
          classes={classes}
          clearances={clearances}
          rules={rules}
          currentSubjectId={selectedSubjectId}
        />
      )}
    </div>
  );
};
