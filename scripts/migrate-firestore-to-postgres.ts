import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface FirestoreExportData {
  users?: any[];
  students?: any[];
  teachers?: any[];
  classes?: any[];
  subjects?: any[];
  evaluationLevels?: any[];
  marks?: any[];
  auditLogs?: any[];
  academicYears?: any[];
  achievements?: any[];
  behaviorRecords?: any[];
  activeHourSlots?: any[];
  leaveApplications?: any[];
  attendanceRecords?: any[];
  attendanceClearances?: any[];
  studentLeaveClearanceApplications?: any[];
  complaintsFeedback?: any[];
  attendanceRules?: any;
  timetablePeriods?: any[];
  timetableSlots?: any[];
  roles?: any[];
  showcaseCards?: any[];
}

export async function migrateDataFromJson(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: FirestoreExportData = JSON.parse(raw);

  console.log('🔄 Starting migration from JSON dump into PostgreSQL...');

  // 1. Roles
  if (data.roles && data.roles.length > 0) {
    console.log(`Migrating ${data.roles.length} roles...`);
    for (const r of data.roles) {
      if (!r.id) continue;
      await prisma.roleDefinition.upsert({
        where: { id: r.id },
        update: {
          name: r.name || 'Role',
          description: r.description || null,
          isSystem: Boolean(r.isSystem),
          permissions: r.permissions || [],
        },
        create: {
          id: r.id,
          name: r.name || 'Role',
          description: r.description || null,
          isSystem: Boolean(r.isSystem),
          permissions: r.permissions || [],
        },
      });
    }
  }

  // 2. Academic Years
  if (data.academicYears && data.academicYears.length > 0) {
    console.log(`Migrating ${data.academicYears.length} academic years...`);
    for (const y of data.academicYears) {
      if (!y.year) continue;
      await prisma.academicYear.upsert({
        where: { year: y.year },
        update: { isCurrent: Boolean(y.isCurrent) },
        create: { id: y.id, year: y.year, isCurrent: Boolean(y.isCurrent) },
      });
    }
  }

  // 3. Classes
  if (data.classes && data.classes.length > 0) {
    console.log(`Migrating ${data.classes.length} classes...`);
    for (const c of data.classes) {
      if (!c.id) continue;
      await prisma.classRoom.upsert({
        where: { id: c.id },
        update: {
          name: c.name || '',
          academicYear: c.academicYear || '2025-2026',
          classTeacherId: c.classTeacherId || null,
          status: c.status || 'active',
          isAttendanceEnabled: c.isAttendanceEnabled ?? true,
        },
        create: {
          id: c.id,
          name: c.name || '',
          academicYear: c.academicYear || '2025-2026',
          classTeacherId: c.classTeacherId || null,
          status: c.status || 'active',
          isAttendanceEnabled: c.isAttendanceEnabled ?? true,
        },
      });
    }
  }

  // 4. Users
  if (data.users && data.users.length > 0) {
    console.log(`Migrating ${data.users.length} users...`);
    for (const u of data.users) {
      if (!u.username) continue;
      await prisma.user.upsert({
        where: { username: u.username },
        update: {
          name: u.name || '',
          role: u.role || 'student',
          email: u.email || null,
          phone: u.phone || null,
          admissionNumber: u.admissionNumber || null,
          studentId: u.studentId || null,
          status: u.status || 'active',
          password: u.password || null,
        },
        create: {
          id: u.id,
          username: u.username,
          name: u.name || '',
          role: u.role || 'student',
          email: u.email || null,
          phone: u.phone || null,
          admissionNumber: u.admissionNumber || null,
          studentId: u.studentId || null,
          status: u.status || 'active',
          password: u.password || null,
        },
      });
    }
  }

  // 5. Teachers
  if (data.teachers && data.teachers.length > 0) {
    console.log(`Migrating ${data.teachers.length} teachers...`);
    for (const t of data.teachers) {
      if (!t.username) continue;
      await prisma.teacher.upsert({
        where: { username: t.username },
        update: {
          name: t.name || '',
          phone: t.phone || null,
          email: t.email || null,
          status: t.status || 'active',
          assignedSubjectIds: t.assignedSubjectIds || [],
          assignedClassIds: t.assignedClassIds || [],
          classTeacherOfClassIds: t.classTeacherOfClassIds || [],
          specialRoleTitle: t.specialRoleTitle || null,
          canManageAllAttendance: Boolean(t.canManageAllAttendance),
          roleIds: t.roleIds || [],
          customPermissions: t.customPermissions || [],
          deniedPermissions: t.deniedPermissions || [],
        },
        create: {
          id: t.id,
          username: t.username,
          name: t.name || '',
          phone: t.phone || null,
          email: t.email || null,
          status: t.status || 'active',
          assignedSubjectIds: t.assignedSubjectIds || [],
          assignedClassIds: t.assignedClassIds || [],
          classTeacherOfClassIds: t.classTeacherOfClassIds || [],
          specialRoleTitle: t.specialRoleTitle || null,
          canManageAllAttendance: Boolean(t.canManageAllAttendance),
          roleIds: t.roleIds || [],
          customPermissions: t.customPermissions || [],
          deniedPermissions: t.deniedPermissions || [],
        },
      });
    }
  }

  // 6. Students
  if (data.students && data.students.length > 0) {
    console.log(`Migrating ${data.students.length} students...`);
    for (const s of data.students) {
      if (!s.admissionNumber || !s.classId) continue;
      await prisma.student.upsert({
        where: { admissionNumber: s.admissionNumber },
        update: {
          name: s.name || '',
          classId: s.classId,
          phone: s.phone || null,
          email: s.email || null,
          username: s.username || s.admissionNumber,
          status: s.status || 'active',
          photoUrl: s.photoUrl || null,
          dob: s.dob || null,
          gender: s.gender || null,
          bloodGroup: s.bloodGroup || null,
          address: s.address || null,
          rollNumber: s.rollNumber || null,
          guardian: s.guardian || null,
          classTeacherNotes: s.classTeacherNotes || null,
          electiveSubjectIds: s.electiveSubjectIds || [],
        },
        create: {
          id: s.id,
          admissionNumber: s.admissionNumber,
          name: s.name || '',
          classId: s.classId,
          phone: s.phone || null,
          email: s.email || null,
          username: s.username || s.admissionNumber,
          status: s.status || 'active',
          photoUrl: s.photoUrl || null,
          dob: s.dob || null,
          gender: s.gender || null,
          bloodGroup: s.bloodGroup || null,
          address: s.address || null,
          rollNumber: s.rollNumber || null,
          guardian: s.guardian || null,
          classTeacherNotes: s.classTeacherNotes || null,
          electiveSubjectIds: s.electiveSubjectIds || [],
        },
      });
    }
  }

  // 7. Subjects & Evaluation Levels
  if (data.subjects && data.subjects.length > 0) {
    console.log(`Migrating ${data.subjects.length} subjects...`);
    for (const sub of data.subjects) {
      if (!sub.id || !sub.classId) continue;
      await prisma.subject.upsert({
        where: { id: sub.id },
        update: {
          name: sub.name || '',
          code: sub.code || '',
          classId: sub.classId,
          assignedTeacherId: sub.assignedTeacherId || sub.teacherId || null,
          teacherId: sub.teacherId || sub.assignedTeacherId || null,
          status: sub.status || 'active',
          trackAttendance: sub.trackAttendance ?? true,
          isSplitSubject: Boolean(sub.isSplitSubject),
          splitGroupName: sub.splitGroupName || null,
          enrolledStudentIds: sub.enrolledStudentIds || [],
          additionalTeacherIds: sub.additionalTeacherIds || [],
        },
        create: {
          id: sub.id,
          name: sub.name || '',
          code: sub.code || '',
          classId: sub.classId,
          assignedTeacherId: sub.assignedTeacherId || sub.teacherId || null,
          teacherId: sub.teacherId || sub.assignedTeacherId || null,
          status: sub.status || 'active',
          trackAttendance: sub.trackAttendance ?? true,
          isSplitSubject: Boolean(sub.isSplitSubject),
          splitGroupName: sub.splitGroupName || null,
          enrolledStudentIds: sub.enrolledStudentIds || [],
          additionalTeacherIds: sub.additionalTeacherIds || [],
        },
      });
    }
  }

  if (data.evaluationLevels && data.evaluationLevels.length > 0) {
    console.log(`Migrating ${data.evaluationLevels.length} evaluation levels...`);
    for (const ev of data.evaluationLevels) {
      if (!ev.id || !ev.subjectId) continue;
      await prisma.evaluationLevel.upsert({
        where: { id: ev.id },
        update: {
          subjectId: ev.subjectId,
          name: ev.name || '',
          maximumMark: Number(ev.maximumMark || ev.maxMark || 100),
          displayOrder: Number(ev.displayOrder || 0),
          status: ev.status || 'active',
        },
        create: {
          id: ev.id,
          subjectId: ev.subjectId,
          name: ev.name || '',
          maximumMark: Number(ev.maximumMark || ev.maxMark || 100),
          displayOrder: Number(ev.displayOrder || 0),
          status: ev.status || 'active',
        },
      });
    }
  }

  // 8. Marks
  if (data.marks && data.marks.length > 0) {
    console.log(`Migrating ${data.marks.length} marks...`);
    for (const m of data.marks) {
      if (!m.id || !m.studentId || !m.subjectId || !m.evaluationLevelId) continue;
      await prisma.mark.upsert({
        where: { id: m.id },
        update: {
          studentId: m.studentId,
          classId: m.classId,
          subjectId: m.subjectId,
          evaluationLevelId: m.evaluationLevelId,
          maximumMark: Number(m.maximumMark || 100),
          obtainedMark: m.obtainedMark !== undefined && m.obtainedMark !== null ? Number(m.obtainedMark) : null,
          date: m.date || new Date().toISOString().split('T')[0],
          enteredBy: m.enteredBy || 'System',
          academicYear: m.academicYear || null,
        },
        create: {
          id: m.id,
          studentId: m.studentId,
          classId: m.classId,
          subjectId: m.subjectId,
          evaluationLevelId: m.evaluationLevelId,
          maximumMark: Number(m.maximumMark || 100),
          obtainedMark: m.obtainedMark !== undefined && m.obtainedMark !== null ? Number(m.obtainedMark) : null,
          date: m.date || new Date().toISOString().split('T')[0],
          enteredBy: m.enteredBy || 'System',
          academicYear: m.academicYear || null,
        },
      });
    }
  }

  // 9. Attendance Records
  if (data.attendanceRecords && data.attendanceRecords.length > 0) {
    console.log(`Migrating ${data.attendanceRecords.length} attendance records...`);
    for (const a of data.attendanceRecords) {
      if (!a.id || !a.studentId || !a.subjectId) continue;
      await prisma.attendanceRecord.upsert({
        where: { id: a.id },
        update: {
          date: a.date,
          academicYear: a.academicYear || null,
          classId: a.classId,
          subjectId: a.subjectId,
          period: Number(a.period || 1),
          studentId: a.studentId,
          status: a.status || 'present',
          lateArrivalTime: a.lateArrivalTime || null,
          lateReason: a.lateReason || null,
          markedBy: a.markedBy || 'Teacher',
          remarks: a.remarks || null,
        },
        create: {
          id: a.id,
          date: a.date,
          academicYear: a.academicYear || null,
          classId: a.classId,
          subjectId: a.subjectId,
          period: Number(a.period || 1),
          studentId: a.studentId,
          status: a.status || 'present',
          lateArrivalTime: a.lateArrivalTime || null,
          lateReason: a.lateReason || null,
          markedBy: a.markedBy || 'Teacher',
          remarks: a.remarks || null,
        },
      });
    }
  }

  console.log('🎉 Migration finished successfully!');
}

// If run directly from CLI: npx tsx scripts/migrate-firestore-to-postgres.ts <path-to-json>
if (process.argv[2]) {
  migrateDataFromJson(path.resolve(process.argv[2]))
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      prisma.$disconnect();
    });
}
