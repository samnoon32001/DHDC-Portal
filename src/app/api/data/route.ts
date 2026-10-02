import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ENTITY_MODEL_MAP: Record<string, keyof typeof prisma> = {
  users: 'user',
  user: 'user',
  students: 'student',
  student: 'student',
  teachers: 'teacher',
  teacher: 'teacher',
  classes: 'classRoom',
  classRoom: 'classRoom',
  subjects: 'subject',
  subject: 'subject',
  evaluation_levels: 'evaluationLevel',
  evaluationLevels: 'evaluationLevel',
  evaluationLevel: 'evaluationLevel',
  marks: 'mark',
  mark: 'mark',
  audit_logs: 'auditLog',
  auditLogs: 'auditLog',
  academic_years: 'academicYear',
  academicYears: 'academicYear',
  achievements: 'achievement',
  achievement: 'achievement',
  behavior_records: 'behaviorRecord',
  behaviorRecords: 'behaviorRecord',
  behaviorRecord: 'behaviorRecord',
  active_hour_slots: 'activeHourSlot',
  activeHourSlots: 'activeHourSlot',
  activeHourSlot: 'activeHourSlot',
  leave_applications: 'leaveApplication',
  leaveApplications: 'leaveApplication',
  leaveApplication: 'leaveApplication',
  attendance_records: 'attendanceRecord',
  attendanceRecords: 'attendanceRecord',
  attendanceRecord: 'attendanceRecord',
  attendance_clearances: 'attendanceClearance',
  attendanceClearances: 'attendanceClearance',
  attendanceClearance: 'attendanceClearance',
  student_leave_clearance_applications: 'studentLeaveClearanceApplication',
  studentLeaveClearanceApplications: 'studentLeaveClearanceApplication',
  complaints_feedback: 'complaintFeedback',
  complaintsFeedback: 'complaintFeedback',
  complaintFeedback: 'complaintFeedback',
  timetable_periods: 'timetablePeriodDefinition',
  timetablePeriods: 'timetablePeriodDefinition',
  timetable_slots: 'timetableSlot',
  timetableSlots: 'timetableSlot',
  roles: 'roleDefinition',
  showcase_cards: 'showcaseCard',
  showcaseCards: 'showcaseCard',
  showcaseCard: 'showcaseCard',
  attendanceRules: 'attendanceRulesConfig',
  systemLocks: 'systemLockSettings',
};

export async function GET() {
  try {
    const [
      users,
      students,
      teachers,
      classes,
      subjects,
      evaluationLevels,
      marks,
      auditLogs,
      academicYears,
      achievements,
      behaviorRecords,
      activeHourSlots,
      leaveApplications,
      attendanceRecords,
      attendanceClearances,
      studentLeaveClearanceApplications,
      complaintsFeedback,
      attendanceRules,
      timetablePeriods,
      timetableSlots,
      roles,
      showcaseCards,
      systemLocks,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.student.findMany(),
      prisma.teacher.findMany(),
      prisma.classRoom.findMany(),
      prisma.subject.findMany(),
      prisma.evaluationLevel.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.mark.findMany(),
      prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 200 }),
      prisma.academicYear.findMany(),
      prisma.achievement.findMany({ orderBy: { date: 'desc' } }),
      prisma.behaviorRecord.findMany({ orderBy: { date: 'desc' } }),
      prisma.activeHourSlot.findMany(),
      prisma.leaveApplication.findMany({ orderBy: { appliedAt: 'desc' } }),
      prisma.attendanceRecord.findMany(),
      prisma.attendanceClearance.findMany(),
      prisma.studentLeaveClearanceApplication.findMany({ orderBy: { appliedAt: 'desc' } }),
      prisma.complaintFeedback.findMany({ orderBy: { submittedAt: 'desc' } }),
      prisma.attendanceRulesConfig.findUnique({ where: { id: 'default' } }),
      prisma.timetablePeriodDefinition.findMany({ orderBy: { periodNumber: 'asc' } }),
      prisma.timetableSlot.findMany(),
      prisma.roleDefinition.findMany(),
      prisma.showcaseCard.findMany({ orderBy: [{ priority: 'asc' }, { order: 'asc' }] }),
      prisma.systemLockSettings.findUnique({ where: { id: 'default' } }),
    ]);

    let finalUsers = users;
    let finalAcademicYears = academicYears;

    // If Neon DB is empty, auto-seed the initial admin and basic setup
    if (finalUsers.length === 0) {
      try {
        const defaultAdmin = await prisma.user.create({
          data: {
            id: 'user-admin',
            username: 'admin',
            role: 'super_admin',
            name: 'Ashiq CP Hudawi',
            email: 'admin@school.edu',
            phone: '(555) 100-0001',
            status: 'active',
            password: 'admin123',
          },
        });
        finalUsers = [defaultAdmin];

        const defaultAy = await prisma.academicYear.create({
          data: {
            id: 'ay-2026-2027',
            year: '2026-2027',
            isCurrent: true,
          },
        });
        finalAcademicYears = [defaultAy];
      } catch (seedErr) {
        console.warn('Auto-seed admin in Neon warn:', seedErr);
      }
    }

    const currentYearRecord = finalAcademicYears.find((y) => y.isCurrent) || finalAcademicYears[0];

    return NextResponse.json({
      users: finalUsers,
      students,
      teachers,
      classes,
      subjects,
      evaluationLevels,
      marks,
      auditLogs,
      academicYears,
      currentAcademicYear: currentYearRecord ? currentYearRecord.year : '2025-2026',
      isLevelAddingLocked: systemLocks?.isLevelAddingLocked ?? false,
      isMarkEntryLocked: systemLocks?.isMarkEntryLocked ?? false,
      achievements,
      behaviorRecords,
      activeHourSlots,
      leaveApplications,
      attendanceRecords,
      attendanceClearances,
      studentLeaveClearanceApplications,
      complaintsFeedback,
      allowedReceiverTypes: ['principal', 'academic_assistant', 'class_teacher', 'hod', 'hos', 'super_admin'],
      attendanceRules: attendanceRules || {
        maxOfficialLeavePercent: 10,
        maxCasualLeavePercent: 15,
        maxTotalLeavesPercent: 25,
        maxOfficialCasualCombinedPercent: 15,
        minRequiredAttendancePercent: 85,
        academicLeaveCountedAsPresent: true,
        clearanceAllowedRoles: ['super_admin', 'Principal', 'HoD', 'HoS', 'Academic Assistant'],
      },
      timetablePeriods,
      timetableSlots,
      roles,
      showcaseCards,
    });
  } catch (error: any) {
    console.error('Fetch data API error:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

async function processSingleItem(item: { action?: 'upsert' | 'delete'; entity: string; data: any }) {
  const { action = 'upsert', entity, data } = item;
  const modelName = ENTITY_MODEL_MAP[entity] || (entity as keyof typeof prisma);
  const prismaModel = (prisma as any)[modelName];

  if (!prismaModel) {
    console.warn(`Unknown entity model: ${entity} -> ${String(modelName)}`);
    return;
  }

  if (action === 'delete') {
    if (!data.id && !data.username && !data.year && !data.admissionNumber) return;
    const where = data.id
      ? { id: data.id }
      : data.username
      ? { username: data.username }
      : data.admissionNumber
      ? { admissionNumber: data.admissionNumber }
      : { year: data.year };
    await prismaModel.delete({ where }).catch((e: any) => console.warn('Delete warn:', e?.message));
    return;
  }

  if (action === 'upsert') {
    if (data.id) {
      await prismaModel.upsert({
        where: { id: data.id },
        update: data,
        create: data,
      }).catch((e: any) => console.warn('Upsert by ID error:', e?.message));
    } else if (data.username) {
      await prismaModel.upsert({
        where: { username: data.username },
        update: data,
        create: data,
      }).catch((e: any) => console.warn('Upsert by username error:', e?.message));
    } else if (data.admissionNumber) {
      await prismaModel.upsert({
        where: { admissionNumber: data.admissionNumber },
        update: data,
        create: data,
      }).catch((e: any) => console.warn('Upsert by admissionNumber error:', e?.message));
    } else if (data.year) {
      await prismaModel.upsert({
        where: { year: data.year },
        update: data,
        create: data,
      }).catch((e: any) => console.warn('Upsert by year error:', e?.message));
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Batch operations support
    if (body.batch && Array.isArray(body.batch)) {
      for (const item of body.batch) {
        if (item && item.entity && item.data) {
          await processSingleItem(item);
        }
      }
      return NextResponse.json({ success: true, processed: body.batch.length });
    }

    // 2. Single item operation
    const { action, entity, data } = body;
    if (entity && data) {
      await processSingleItem({ action, entity, data });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error('Data POST API error:', error);
    return NextResponse.json({ error: error.message || 'Save failed' }, { status: 500 });
  }
}
