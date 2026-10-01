import { AttendanceRecord, AttendanceClearance, AttendanceRulesConfig } from '../types';

export interface StudentSubjectAttendanceStats {
  studentId: string;
  subjectId: string;
  totalPeriods: number;
  presentCount: number;
  academicLeaveCount: number;
  effectivePresentCount: number; // Present + Academic Leave
  officialLeaveCount: number;
  casualLeaveCount: number;
  medicalLeaveCount: number;
  absentCount: number; // Unexcused absence
  lateCount: number;

  // Percentages calculated against totalPeriods (or total without medical)
  presentPercent: number;
  academicLeavePercent: number;
  effectivePresentPercent: number;
  officialLeavePercent: number;
  casualLeavePercent: number;
  officialCasualCombinedPercent: number;
  totalLeavesPercent: number; // official + casual + medical
  overallPercentWithoutMedical: number;

  // Rule violation flags
  isOfficialLeaveExceeded: boolean; // > 10%
  isCasualLeaveExceeded: boolean; // > 15%
  isOfficialCasualCombinedExceeded: boolean; // > 15%
  isTotalLeavesExceeded: boolean; // > 25%
  isShortage: boolean; // < 85% without medical

  // Clearance status
  isCleared: boolean;
  clearanceRecord?: AttendanceClearance;
  needsClearance: boolean;
  effectivePercentageAfterClearance: number;
}

export const DEFAULT_ATTENDANCE_RULES: AttendanceRulesConfig = {
  maxOfficialLeavePercent: 10,
  maxCasualLeavePercent: 15,
  maxTotalLeavesPercent: 25,
  maxOfficialCasualCombinedPercent: 15,
  minRequiredAttendancePercent: 85,
  academicLeaveCountedAsPresent: true,
};

export function calculateStudentSubjectAttendance(
  studentId: string,
  subjectId: string,
  records: AttendanceRecord[],
  clearances: AttendanceClearance[] = [],
  rules: AttendanceRulesConfig = DEFAULT_ATTENDANCE_RULES
): StudentSubjectAttendanceStats {
  const subjectRecords = records.filter(
    (r) => r.studentId === studentId && (subjectId === 'ALL' || r.subjectId === subjectId)
  );

  const totalPeriods = subjectRecords.length;

  let presentCount = 0;
  let academicLeaveCount = 0;
  let officialLeaveCount = 0;
  let casualLeaveCount = 0;
  let medicalLeaveCount = 0;
  let absentCount = 0;
  let lateCount = 0;

  subjectRecords.forEach((rec) => {
    switch (rec.status) {
      case 'present':
        presentCount++;
        break;
      case 'academic_leave':
        academicLeaveCount++;
        break;
      case 'official_leave':
        officialLeaveCount++;
        break;
      case 'casual_leave':
        casualLeaveCount++;
        break;
      case 'medical_leave':
        medicalLeaveCount++;
        break;
      case 'late':
        lateCount++;
        presentCount++; // Late counts as present with recorded timestamp
        break;
      case 'absent':
      default:
        absentCount++;
        break;
    }
  });

  // Academic leaves are considered as Present!
  const effectivePresentCount = presentCount + academicLeaveCount;

  // Total excluding medical leaves (for computing percentage without medical leaves)
  const totalExcludingMedical = Math.max(0, totalPeriods - medicalLeaveCount);

  const presentPercent = totalPeriods > 0 ? (presentCount / totalPeriods) * 100 : 100;
  const academicLeavePercent = totalPeriods > 0 ? (academicLeaveCount / totalPeriods) * 100 : 0;
  const effectivePresentPercent = totalPeriods > 0 ? (effectivePresentCount / totalPeriods) * 100 : 100;

  const officialLeavePercent = totalPeriods > 0 ? (officialLeaveCount / totalPeriods) * 100 : 0;
  const casualLeavePercent = totalPeriods > 0 ? (casualLeaveCount / totalPeriods) * 100 : 0;
  const officialCasualCombinedPercent =
    totalPeriods > 0 ? ((officialLeaveCount + casualLeaveCount) / totalPeriods) * 100 : 0;

  const totalLeavesCount = officialLeaveCount + casualLeaveCount + medicalLeaveCount;
  const totalLeavesPercent = totalPeriods > 0 ? (totalLeavesCount / totalPeriods) * 100 : 0;

  // Percentage without medical leaves: effectivePresent / (total - medical)
  const overallPercentWithoutMedical =
    totalExcludingMedical > 0
      ? Math.min(100, (effectivePresentCount / totalExcludingMedical) * 100)
      : totalPeriods > 0
      ? 100
      : 100;

  // Institutional Rule evaluations
  const maxOfficial = rules.maxOfficialLeavePercent ?? 10;
  const maxCasual = rules.maxCasualLeavePercent ?? 15;
  const maxCombinedOfficialCasual = rules.maxOfficialCasualCombinedPercent ?? 15;
  const maxTotalLeaves = rules.maxTotalLeavesPercent ?? 25;
  const minRequired = rules.minRequiredAttendancePercent ?? 85;

  const isOfficialLeaveExceeded = totalPeriods > 0 && officialLeavePercent > maxOfficial;
  const isCasualLeaveExceeded = totalPeriods > 0 && casualLeavePercent > maxCasual;
  const isOfficialCasualCombinedExceeded = totalPeriods > 0 && officialCasualCombinedPercent > maxCombinedOfficialCasual;
  const isTotalLeavesExceeded = totalPeriods > 0 && totalLeavesPercent > maxTotalLeaves;
  const isShortage = totalPeriods > 0 && overallPercentWithoutMedical < minRequired;

  // Check Clearance
  const clearanceRecord = clearances.find(
    (c) => c.studentId === studentId && (!c.subjectId || c.subjectId === subjectId || subjectId === 'ALL')
  );
  const isCleared = !!clearanceRecord;

  const needsClearance = (isShortage || isOfficialLeaveExceeded || isCasualLeaveExceeded || isTotalLeavesExceeded) && !isCleared;

  const effectivePercentageAfterClearance = isCleared
    ? Math.max(overallPercentWithoutMedical, clearanceRecord.approvedPercentage || 85)
    : overallPercentWithoutMedical;

  return {
    studentId,
    subjectId,
    totalPeriods,
    presentCount,
    academicLeaveCount,
    effectivePresentCount,
    officialLeaveCount,
    casualLeaveCount,
    medicalLeaveCount,
    absentCount,
    lateCount,
    presentPercent: Math.round(presentPercent * 10) / 10,
    academicLeavePercent: Math.round(academicLeavePercent * 10) / 10,
    effectivePresentPercent: Math.round(effectivePresentPercent * 10) / 10,
    officialLeavePercent: Math.round(officialLeavePercent * 10) / 10,
    casualLeavePercent: Math.round(casualLeavePercent * 10) / 10,
    officialCasualCombinedPercent: Math.round(officialCasualCombinedPercent * 10) / 10,
    totalLeavesPercent: Math.round(totalLeavesPercent * 10) / 10,
    overallPercentWithoutMedical: Math.round(overallPercentWithoutMedical * 10) / 10,
    isOfficialLeaveExceeded,
    isCasualLeaveExceeded,
    isOfficialCasualCombinedExceeded,
    isTotalLeavesExceeded,
    isShortage,
    isCleared,
    clearanceRecord,
    needsClearance,
    effectivePercentageAfterClearance: Math.round(effectivePercentageAfterClearance * 10) / 10,
  };
}
