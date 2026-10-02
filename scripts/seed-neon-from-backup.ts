import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function parseDate(val: any): Date {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseNullableDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function seedNeonFromBackup(backupFilePath: string) {
  console.log(`\n=============================================================`);
  console.log(`🚀 Starting Neon PostgreSQL Data Migration`);
  console.log(`📂 Source File: ${backupFilePath}`);
  console.log(`=============================================================\n`);

  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found at: ${backupFilePath}`);
  }

  const raw = fs.readFileSync(backupFilePath, 'utf8');
  const backup = JSON.parse(raw);
  const collections = backup.collections || backup;

  // Helper arrays
  const academicYears = collections.academic_years || [];
  const roles = collections.roles || [];
  const timetablePeriods = collections.timetable_periods || [];
  const classes = collections.classes || [];
  const teachers = collections.teachers || [];
  const users = collections.users || [];
  const students = collections.students || [];
  const subjects = collections.subjects || [];
  const evaluationLevels = collections.evaluation_levels || [];
  const marks = collections.marks || [];
  const attendanceRecords = collections.attendance_records || [];
  const attendanceClearances = collections.attendance_clearances || [];
  const leaveApplications = collections.leave_applications || [];
  const studentLeaveClearances = collections.student_leave_clearance_applications || [];
  const complaints = collections.complaints_feedback || collections.complaints || [];
  const achievements = collections.achievements || [];
  const behaviorRecords = collections.behavior_records || [];
  const activeHourSlots = collections.active_hour_slots || [];
  const timetableSlots = collections.timetable_slots || [];
  const showcaseCards = collections.showcase_cards || [];
  const auditLogs = collections.audit_logs || [];

  console.log(`📊 Summary of records to migrate:`);
  console.log(`  • Academic Years:     ${academicYears.length}`);
  console.log(`  • Classes:            ${classes.length}`);
  console.log(`  • Teachers:           ${teachers.length}`);
  console.log(`  • Users:              ${users.length}`);
  console.log(`  • Students:           ${students.length}`);
  console.log(`  • Subjects:           ${subjects.length}`);
  console.log(`  • Evaluation Levels:  ${evaluationLevels.length}`);
  console.log(`  • Marks:              ${marks.length}`);
  console.log(`  • Attendance Records: ${attendanceRecords.length}`);
  console.log(`  • Leave Applications: ${leaveApplications.length}`);
  console.log(`  • Clearances:         ${attendanceClearances.length + studentLeaveClearances.length}`);
  console.log(`  • Complaints:         ${complaints.length}`);
  console.log(`  • Timetable Periods:  ${timetablePeriods.length}`);
  console.log(`  • Timetable Slots:    ${timetableSlots.length}`);
  console.log(`  • Showcase Cards:     ${showcaseCards.length}`);
  console.log(`  • Audit Logs:         ${auditLogs.length}\n`);

  // 1. Academic Years
  console.log(`⏳ [1/17] Migrating Academic Years...`);
  for (const ay of academicYears) {
    if (!ay.year) continue;
    await prisma.academicYear.upsert({
      where: { year: String(ay.year).trim() },
      update: { isCurrent: Boolean(ay.isCurrent) },
      create: {
        id: ay.id || `ay-${ay.year}`,
        year: String(ay.year).trim(),
        isCurrent: Boolean(ay.isCurrent),
      },
    });
  }
  // Ensure default current year exists
  await prisma.academicYear.upsert({
    where: { year: '2026-2027' },
    update: {},
    create: { id: 'ay-2026-2027', year: '2026-2027', isCurrent: true },
  });
  console.log(`✅ [1/17] Academic Years migrated.`);

  // 2. Roles
  console.log(`⏳ [2/17] Migrating Roles...`);
  const defaultRoles = [
    { id: 'role-super-admin', name: 'Super Administrator', description: 'Full system governance', isSystem: true, permissions: ['*'] },
    { id: 'role-teacher', name: 'Faculty Member / Teacher', description: 'Class and subject management', isSystem: true, permissions: ['view_classes', 'take_attendance', 'enter_marks'] },
    { id: 'role-student', name: 'Student', description: 'Student portal profile and attendance', isSystem: true, permissions: ['view_own_profile', 'view_own_attendance'] },
  ];
  for (const r of [...defaultRoles, ...roles]) {
    if (!r.id) continue;
    await prisma.roleDefinition.upsert({
      where: { id: r.id },
      update: {
        name: r.name || 'Role',
        description: r.description || null,
        isSystem: Boolean(r.isSystem),
        permissions: Array.isArray(r.permissions) ? r.permissions : [],
      },
      create: {
        id: r.id,
        name: r.name || 'Role',
        description: r.description || null,
        isSystem: Boolean(r.isSystem),
        permissions: Array.isArray(r.permissions) ? r.permissions : [],
      },
    });
  }
  console.log(`✅ [2/17] Roles migrated.`);

  // 3. Timetable Periods
  console.log(`⏳ [3/17] Migrating Timetable Periods...`);
  for (const p of timetablePeriods) {
    if (!p.id) continue;
    await prisma.timetablePeriodDefinition.upsert({
      where: { id: p.id },
      update: {
        periodNumber: Number(p.periodNumber || 1),
        name: p.name || `Period ${p.periodNumber || 1}`,
        startTime: p.startTime || '08:00',
        endTime: p.endTime || '08:45',
        isBreak: Boolean(p.isBreak),
        breakLabel: p.breakLabel || null,
      },
      create: {
        id: p.id,
        periodNumber: Number(p.periodNumber || 1),
        name: p.name || `Period ${p.periodNumber || 1}`,
        startTime: p.startTime || '08:00',
        endTime: p.endTime || '08:45',
        isBreak: Boolean(p.isBreak),
        breakLabel: p.breakLabel || null,
      },
    });
  }
  console.log(`✅ [3/17] Timetable Periods migrated.`);

  // 4. Classes
  console.log(`⏳ [4/17] Migrating Classes...`);
  const validClassIds = new Set<string>();
  for (const c of classes) {
    if (!c.id) continue;
    validClassIds.add(c.id);
    await prisma.classRoom.upsert({
      where: { id: c.id },
      update: {
        name: c.name || 'Untitled Class',
        academicYear: c.academicYear || '2026-2027',
        classTeacherId: c.classTeacherId || null,
        status: c.status || 'active',
        isAttendanceEnabled: c.isAttendanceEnabled ?? true,
        createdDate: parseDate(c.createdDate),
      },
      create: {
        id: c.id,
        name: c.name || 'Untitled Class',
        academicYear: c.academicYear || '2026-2027',
        classTeacherId: c.classTeacherId || null,
        status: c.status || 'active',
        isAttendanceEnabled: c.isAttendanceEnabled ?? true,
        createdDate: parseDate(c.createdDate),
      },
    });
  }
  console.log(`✅ [4/17] Classes migrated (${validClassIds.size} classes).`);

  // 5. Teachers
  console.log(`⏳ [5/17] Migrating Teachers...`);
  for (const t of teachers) {
    if (!t.username && !t.id) continue;
    const username = String(t.username || t.id).trim();
    await prisma.teacher.upsert({
      where: { username },
      update: {
        name: t.name || username,
        phone: t.phone || null,
        email: t.email || null,
        status: t.status || 'active',
        assignedSubjectIds: Array.isArray(t.assignedSubjectIds) ? t.assignedSubjectIds : [],
        assignedClassIds: Array.isArray(t.assignedClassIds) ? t.assignedClassIds : [],
        classTeacherOfClassIds: Array.isArray(t.classTeacherOfClassIds) ? t.classTeacherOfClassIds : [],
        specialRoleTitle: t.specialRoleTitle || null,
        canManageAllAttendance: Boolean(t.canManageAllAttendance),
        roleIds: Array.isArray(t.roleIds) ? t.roleIds : [],
        customPermissions: Array.isArray(t.customPermissions) ? t.customPermissions : [],
        deniedPermissions: Array.isArray(t.deniedPermissions) ? t.deniedPermissions : [],
        createdDate: parseDate(t.createdDate),
      },
      create: {
        id: t.id || `teacher-${username}`,
        username,
        name: t.name || username,
        phone: t.phone || null,
        email: t.email || null,
        status: t.status || 'active',
        assignedSubjectIds: Array.isArray(t.assignedSubjectIds) ? t.assignedSubjectIds : [],
        assignedClassIds: Array.isArray(t.assignedClassIds) ? t.assignedClassIds : [],
        classTeacherOfClassIds: Array.isArray(t.classTeacherOfClassIds) ? t.classTeacherOfClassIds : [],
        specialRoleTitle: t.specialRoleTitle || null,
        canManageAllAttendance: Boolean(t.canManageAllAttendance),
        roleIds: Array.isArray(t.roleIds) ? t.roleIds : [],
        customPermissions: Array.isArray(t.customPermissions) ? t.customPermissions : [],
        deniedPermissions: Array.isArray(t.deniedPermissions) ? t.deniedPermissions : [],
        createdDate: parseDate(t.createdDate),
      },
    });
  }
  console.log(`✅ [5/17] Teachers migrated.`);

  // 6. Users
  console.log(`⏳ [6/17] Migrating Users...`);
  for (const u of users) {
    if (!u.username) continue;
    const username = String(u.username).trim();
    await prisma.user.upsert({
      where: { username },
      update: {
        name: u.name || username,
        role: u.role || 'student',
        email: u.email || null,
        phone: u.phone || null,
        admissionNumber: u.admissionNumber || null,
        studentId: u.studentId || null,
        status: u.status || 'active',
        password: u.password || null,
      },
      create: {
        id: u.id || `user-${username}`,
        username,
        name: u.name || username,
        role: u.role || 'student',
        email: u.email || null,
        phone: u.phone || null,
        admissionNumber: u.admissionNumber || null,
        studentId: u.studentId || null,
        status: u.status || 'active',
        password: u.password || null,
        createdAt: parseDate(u.createdAt),
      },
    });
  }
  console.log(`✅ [6/17] Users migrated.`);

  // 7. Students
  console.log(`⏳ [7/17] Migrating Students...`);
  const validStudentIds = new Set<string>();
  for (const s of students) {
    if (!s.admissionNumber || !s.classId) continue;
    const admissionNumber = String(s.admissionNumber).trim();
    const username = String(s.username || admissionNumber).trim();

    // Ensure referenced class exists
    if (!validClassIds.has(s.classId)) {
      await prisma.classRoom.upsert({
        where: { id: s.classId },
        update: {},
        create: {
          id: s.classId,
          name: `Class ${s.classId}`,
          academicYear: '2026-2027',
          status: 'active',
        },
      });
      validClassIds.add(s.classId);
    }

    const studentRecord = await prisma.student.upsert({
      where: { admissionNumber },
      update: {
        name: s.name || admissionNumber,
        classId: s.classId,
        phone: s.phone || null,
        email: s.email || null,
        username,
        status: s.status || 'active',
        photoUrl: s.photoUrl || null,
        dob: s.dob || null,
        gender: s.gender || null,
        bloodGroup: s.bloodGroup || null,
        address: s.address || null,
        rollNumber: s.rollNumber || null,
        guardian: s.guardian || null,
        classTeacherNotes: s.classTeacherNotes || null,
        electiveSubjectIds: Array.isArray(s.electiveSubjectIds) ? s.electiveSubjectIds : [],
        enrollmentDate: parseNullableDate(s.enrollmentDate),
      },
      create: {
        id: s.id || `student-${admissionNumber}`,
        admissionNumber,
        name: s.name || admissionNumber,
        classId: s.classId,
        phone: s.phone || null,
        email: s.email || null,
        username,
        status: s.status || 'active',
        photoUrl: s.photoUrl || null,
        dob: s.dob || null,
        gender: s.gender || null,
        bloodGroup: s.bloodGroup || null,
        address: s.address || null,
        rollNumber: s.rollNumber || null,
        guardian: s.guardian || null,
        classTeacherNotes: s.classTeacherNotes || null,
        electiveSubjectIds: Array.isArray(s.electiveSubjectIds) ? s.electiveSubjectIds : [],
        createdDate: parseDate(s.createdDate),
        enrollmentDate: parseNullableDate(s.enrollmentDate),
      },
    });

    validStudentIds.add(studentRecord.id);
    if (s.id) validStudentIds.add(s.id);
  }
  console.log(`✅ [7/17] Students migrated (${validStudentIds.size} mapped IDs).`);

  // 8. Subjects
  console.log(`⏳ [8/17] Migrating Subjects...`);
  const validSubjectIds = new Set<string>();
  for (const sub of subjects) {
    if (!sub.id || !sub.classId) continue;

    // Ensure class exists
    if (!validClassIds.has(sub.classId)) {
      await prisma.classRoom.upsert({
        where: { id: sub.classId },
        update: {},
        create: {
          id: sub.classId,
          name: `Class ${sub.classId}`,
          academicYear: '2026-2027',
          status: 'active',
        },
      });
      validClassIds.add(sub.classId);
    }

    const subRecord = await prisma.subject.upsert({
      where: { id: sub.id },
      update: {
        name: sub.name || 'Untitled Subject',
        code: sub.code || 'SUB',
        classId: sub.classId,
        assignedTeacherId: sub.assignedTeacherId || sub.teacherId || null,
        teacherId: sub.teacherId || sub.assignedTeacherId || null,
        status: sub.status || 'active',
        trackAttendance: sub.trackAttendance ?? true,
        isSplitSubject: Boolean(sub.isSplitSubject),
        splitGroupName: sub.splitGroupName || null,
        enrolledStudentIds: Array.isArray(sub.enrolledStudentIds) ? sub.enrolledStudentIds : [],
        additionalTeacherIds: Array.isArray(sub.additionalTeacherIds) ? sub.additionalTeacherIds : [],
      },
      create: {
        id: sub.id,
        name: sub.name || 'Untitled Subject',
        code: sub.code || 'SUB',
        classId: sub.classId,
        assignedTeacherId: sub.assignedTeacherId || sub.teacherId || null,
        teacherId: sub.teacherId || sub.assignedTeacherId || null,
        status: sub.status || 'active',
        trackAttendance: sub.trackAttendance ?? true,
        isSplitSubject: Boolean(sub.isSplitSubject),
        splitGroupName: sub.splitGroupName || null,
        enrolledStudentIds: Array.isArray(sub.enrolledStudentIds) ? sub.enrolledStudentIds : [],
        additionalTeacherIds: Array.isArray(sub.additionalTeacherIds) ? sub.additionalTeacherIds : [],
      },
    });

    validSubjectIds.add(subRecord.id);
  }
  console.log(`✅ [8/17] Subjects migrated (${validSubjectIds.size} subjects).`);

  // 9. Evaluation Levels
  console.log(`⏳ [9/17] Migrating Evaluation Levels...`);
  const validLevelIds = new Set<string>();
  for (const el of evaluationLevels) {
    if (!el.id || !el.subjectId || !validSubjectIds.has(el.subjectId)) continue;
    const levelRecord = await prisma.evaluationLevel.upsert({
      where: { id: el.id },
      update: {
        name: el.name || 'Evaluation',
        maximumMark: Number(el.maximumMark || el.maxMark || 100),
        displayOrder: Number(el.displayOrder || 0),
        status: el.status || 'active',
      },
      create: {
        id: el.id,
        subjectId: el.subjectId,
        name: el.name || 'Evaluation',
        maximumMark: Number(el.maximumMark || el.maxMark || 100),
        displayOrder: Number(el.displayOrder || 0),
        status: el.status || 'active',
      },
    });
    validLevelIds.add(levelRecord.id);
  }
  console.log(`✅ [9/17] Evaluation Levels migrated (${validLevelIds.size} levels).`);

  // 10. Marks
  console.log(`⏳ [10/17] Migrating Marks...`);
  let marksCount = 0;
  for (const m of marks) {
    if (!m.id || !m.studentId || !m.subjectId || !m.evaluationLevelId) continue;
    if (!validStudentIds.has(m.studentId) || !validSubjectIds.has(m.subjectId) || !validLevelIds.has(m.evaluationLevelId)) continue;

    await prisma.mark.upsert({
      where: { id: m.id },
      update: {
        classId: m.classId || 'class-unknown',
        maximumMark: Number(m.maximumMark || 100),
        obtainedMark: m.obtainedMark !== null && m.obtainedMark !== undefined ? Number(m.obtainedMark) : null,
        date: m.date || new Date().toISOString().split('T')[0],
        enteredBy: m.enteredBy || 'Teacher',
        academicYear: m.academicYear || '2026-2027',
        lastUpdated: parseDate(m.lastUpdated),
      },
      create: {
        id: m.id,
        studentId: m.studentId,
        classId: m.classId || 'class-unknown',
        subjectId: m.subjectId,
        evaluationLevelId: m.evaluationLevelId,
        maximumMark: Number(m.maximumMark || 100),
        obtainedMark: m.obtainedMark !== null && m.obtainedMark !== undefined ? Number(m.obtainedMark) : null,
        date: m.date || new Date().toISOString().split('T')[0],
        enteredBy: m.enteredBy || 'Teacher',
        academicYear: m.academicYear || '2026-2027',
        lastUpdated: parseDate(m.lastUpdated),
      },
    });
    marksCount++;
  }
  console.log(`✅ [10/17] Marks migrated (${marksCount} marks).`);

  // 11. Attendance Records (Batch processed)
  console.log(`⏳ [11/17] Migrating Attendance Records (${attendanceRecords.length} records)...`);
  let attCount = 0;
  const validAttendance = attendanceRecords.filter((a: any) => a.id && a.studentId && a.subjectId && validStudentIds.has(a.studentId) && validSubjectIds.has(a.subjectId));

  // Insert attendance in chunks of 250
  for (let i = 0; i < validAttendance.length; i += 250) {
    const chunk = validAttendance.slice(i, i + 250);
    await Promise.all(
      chunk.map((a: any) =>
        prisma.attendanceRecord.upsert({
          where: { id: a.id },
          update: {
            date: a.date || new Date().toISOString().split('T')[0],
            academicYear: a.academicYear || '2026-2027',
            classId: a.classId || '',
            subjectId: a.subjectId,
            period: Number(a.period || 1),
            studentId: a.studentId,
            status: a.status || 'present',
            lateArrivalTime: a.lateArrivalTime || null,
            lateReason: a.lateReason || null,
            markedBy: a.markedBy || 'Teacher',
            remarks: a.remarks || null,
            markedAt: parseDate(a.markedAt),
          },
          create: {
            id: a.id,
            date: a.date || new Date().toISOString().split('T')[0],
            academicYear: a.academicYear || '2026-2027',
            classId: a.classId || '',
            subjectId: a.subjectId,
            period: Number(a.period || 1),
            studentId: a.studentId,
            status: a.status || 'present',
            lateArrivalTime: a.lateArrivalTime || null,
            lateReason: a.lateReason || null,
            markedBy: a.markedBy || 'Teacher',
            remarks: a.remarks || null,
            markedAt: parseDate(a.markedAt),
          },
        })
      )
    );
    attCount += chunk.length;
  }
  console.log(`✅ [11/17] Attendance Records migrated (${attCount} records).`);

  // 12. Attendance Clearances
  console.log(`⏳ [12/17] Migrating Attendance Clearances...`);
  for (const cl of attendanceClearances) {
    if (!cl.id || !cl.studentId || !validStudentIds.has(cl.studentId)) continue;
    await prisma.attendanceClearance.upsert({
      where: { id: cl.id },
      update: {
        subjectId: cl.subjectId || null,
        grantedBy: cl.grantedBy || 'Admin',
        grantedByName: cl.grantedByName || cl.clearedByName || 'Admin',
        grantedByRole: cl.grantedByRole || cl.clearedByRole || 'super_admin',
        approvedPercentage: cl.approvedPercentage !== undefined ? Number(cl.approvedPercentage) : null,
        reason: cl.reason || '',
        academicYear: cl.academicYear || '2026-2027',
        notes: cl.notes || null,
        clearedDate: parseDate(cl.clearedDate),
      },
      create: {
        id: cl.id,
        studentId: cl.studentId,
        subjectId: cl.subjectId || null,
        grantedBy: cl.grantedBy || 'Admin',
        grantedByName: cl.grantedByName || cl.clearedByName || 'Admin',
        grantedByRole: cl.grantedByRole || cl.clearedByRole || 'super_admin',
        approvedPercentage: cl.approvedPercentage !== undefined ? Number(cl.approvedPercentage) : null,
        reason: cl.reason || '',
        academicYear: cl.academicYear || '2026-2027',
        notes: cl.notes || null,
        clearedDate: parseDate(cl.clearedDate),
      },
    });
  }
  console.log(`✅ [12/17] Attendance Clearances migrated.`);

  // 13. Leave Applications
  console.log(`⏳ [13/17] Migrating Leave Applications...`);
  for (const la of leaveApplications) {
    if (!la.id || !la.studentId || !validStudentIds.has(la.studentId)) continue;
    await prisma.leaveApplication.upsert({
      where: { id: la.id },
      update: {
        studentAdmissionNumber: la.studentAdmissionNumber || '',
        studentName: la.studentName || '',
        classId: la.classId || '',
        academicYear: la.academicYear || '2026-2027',
        leaveType: la.leaveType || 'official',
        startDate: la.startDate || '',
        endDate: la.endDate || '',
        startTime: la.startTime || null,
        endTime: la.endTime || null,
        slotsIncluded: Array.isArray(la.slotsIncluded) ? la.slotsIncluded : [],
        totalDurationMinutes: Number(la.totalDurationMinutes || 0),
        totalDurationFormatted: la.totalDurationFormatted || '0m',
        reason: la.reason || '',
        status: la.status || 'pending',
        reviewedBy: la.reviewedBy || null,
        reviewedByName: la.reviewedByName || null,
        reviewedAt: parseNullableDate(la.reviewedAt),
        hasArrived: Boolean(la.hasArrived),
        arrivedAt: parseNullableDate(la.arrivedAt),
        remarks: la.remarks || null,
      },
      create: {
        id: la.id,
        studentId: la.studentId,
        studentAdmissionNumber: la.studentAdmissionNumber || '',
        studentName: la.studentName || '',
        classId: la.classId || '',
        academicYear: la.academicYear || '2026-2027',
        leaveType: la.leaveType || 'official',
        startDate: la.startDate || '',
        endDate: la.endDate || '',
        startTime: la.startTime || null,
        endTime: la.endTime || null,
        slotsIncluded: Array.isArray(la.slotsIncluded) ? la.slotsIncluded : [],
        totalDurationMinutes: Number(la.totalDurationMinutes || 0),
        totalDurationFormatted: la.totalDurationFormatted || '0m',
        reason: la.reason || '',
        status: la.status || 'pending',
        appliedAt: parseDate(la.appliedAt),
        reviewedBy: la.reviewedBy || null,
        reviewedByName: la.reviewedByName || null,
        reviewedAt: parseNullableDate(la.reviewedAt),
        hasArrived: Boolean(la.hasArrived),
        arrivedAt: parseNullableDate(la.arrivedAt),
        remarks: la.remarks || null,
      },
    });
  }
  console.log(`✅ [13/17] Leave Applications migrated.`);

  // 14. Complaints & Feedback
  console.log(`⏳ [14/17] Migrating Complaints & Feedback...`);
  for (const cf of complaints) {
    if (!cf.id || !cf.studentId || !validStudentIds.has(cf.studentId)) continue;
    await prisma.complaintFeedback.upsert({
      where: { id: cf.id },
      update: {
        studentAdmissionNumber: cf.studentAdmissionNumber || '',
        studentName: cf.studentName || '',
        classId: cf.classId || '',
        receiverType: cf.receiverType || 'super_admin',
        title: cf.title || cf.subject || 'Complaint',
        category: cf.category || 'general',
        message: cf.message || '',
        status: cf.status || 'pending',
        response: cf.response || null,
        respondedBy: cf.respondedBy || null,
        respondedByName: cf.respondedByName || null,
        respondedAt: parseNullableDate(cf.respondedAt),
        isAnonymous: Boolean(cf.isAnonymous),
      },
      create: {
        id: cf.id,
        studentId: cf.studentId,
        studentAdmissionNumber: cf.studentAdmissionNumber || '',
        studentName: cf.studentName || '',
        classId: cf.classId || '',
        receiverType: cf.receiverType || 'super_admin',
        title: cf.title || cf.subject || 'Complaint',
        category: cf.category || 'general',
        message: cf.message || '',
        status: cf.status || 'pending',
        response: cf.response || null,
        respondedBy: cf.respondedBy || null,
        respondedByName: cf.respondedByName || null,
        respondedAt: parseNullableDate(cf.respondedAt),
        submittedAt: parseDate(cf.submittedAt || cf.createdAt),
        isAnonymous: Boolean(cf.isAnonymous),
      },
    });
  }
  console.log(`✅ [14/17] Complaints & Feedback migrated.`);

  // 15. Timetable Slots
  console.log(`⏳ [15/17] Migrating Timetable Slots...`);
  for (const ts of timetableSlots) {
    if (!ts.id) continue;
    await prisma.timetableSlot.upsert({
      where: { id: ts.id },
      update: {
        dayOfWeek: ts.dayOfWeek || 'Monday',
        periodNumber: Number(ts.periodNumber || 1),
        classId: ts.classId || '',
        subjectId: ts.subjectId || '',
        teacherId: ts.teacherId || null,
        room: ts.room || null,
        isSplitSlot: Boolean(ts.isSplitSlot),
      },
      create: {
        id: ts.id,
        dayOfWeek: ts.dayOfWeek || 'Monday',
        periodNumber: Number(ts.periodNumber || 1),
        classId: ts.classId || '',
        subjectId: ts.subjectId || '',
        teacherId: ts.teacherId || null,
        room: ts.room || null,
        isSplitSlot: Boolean(ts.isSplitSlot),
      },
    });
  }
  console.log(`✅ [15/17] Timetable Slots migrated.`);

  // 16. Showcase Cards
  console.log(`⏳ [16/17] Migrating Showcase Cards...`);
  for (const sc of showcaseCards) {
    if (!sc.id) continue;
    await prisma.showcaseCard.upsert({
      where: { id: sc.id },
      update: {
        title: sc.title || 'Topper',
        subtitle: sc.subtitle || null,
        studentName: sc.studentName || '',
        studentAdmissionNumber: sc.studentAdmissionNumber || null,
        studentId: sc.studentId || null,
        percentage: String(sc.percentage || '0%'),
        scoreDetails: sc.scoreDetails || null,
        sectionOrClass: sc.sectionOrClass || '',
        classId: sc.classId || null,
        category: sc.category || 'apex_topper',
        priority: Number(sc.priority || 1),
        badgeText: sc.badgeText || null,
        imageUrl: sc.imageUrl || null,
        description: sc.description || null,
        accentGradient: sc.accentGradient || 'gold',
        targetAudience: sc.targetAudience || 'all',
        targetRoles: Array.isArray(sc.targetRoles) ? sc.targetRoles : [],
        targetClassIds: Array.isArray(sc.targetClassIds) ? sc.targetClassIds : [],
        targetStudentIds: Array.isArray(sc.targetStudentIds) ? sc.targetStudentIds : [],
        order: Number(sc.order || 0),
        isActive: sc.isActive ?? true,
        examName: sc.examName || null,
        academicYear: sc.academicYear || '2026-2027',
      },
      create: {
        id: sc.id,
        title: sc.title || 'Topper',
        subtitle: sc.subtitle || null,
        studentName: sc.studentName || '',
        studentAdmissionNumber: sc.studentAdmissionNumber || null,
        studentId: sc.studentId || null,
        percentage: String(sc.percentage || '0%'),
        scoreDetails: sc.scoreDetails || null,
        sectionOrClass: sc.sectionOrClass || '',
        classId: sc.classId || null,
        category: sc.category || 'apex_topper',
        priority: Number(sc.priority || 1),
        badgeText: sc.badgeText || null,
        imageUrl: sc.imageUrl || null,
        description: sc.description || null,
        accentGradient: sc.accentGradient || 'gold',
        targetAudience: sc.targetAudience || 'all',
        targetRoles: Array.isArray(sc.targetRoles) ? sc.targetRoles : [],
        targetClassIds: Array.isArray(sc.targetClassIds) ? sc.targetClassIds : [],
        targetStudentIds: Array.isArray(sc.targetStudentIds) ? sc.targetStudentIds : [],
        order: Number(sc.order || 0),
        isActive: sc.isActive ?? true,
        examName: sc.examName || null,
        academicYear: sc.academicYear || '2026-2027',
        createdAt: parseDate(sc.createdAt),
      },
    });
  }
  console.log(`✅ [16/17] Showcase Cards migrated.`);

  // 17. Active Hour Slots & System Rules
  console.log(`⏳ [17/17] Migrating System Config & Settings...`);
  for (const slot of activeHourSlots) {
    if (!slot.id) continue;
    await prisma.activeHourSlot.upsert({
      where: { id: slot.id },
      update: {
        label: slot.label || '',
        startTime: slot.startTime || '',
        endTime: slot.endTime || '',
        durationMinutes: Number(slot.durationMinutes || 0),
        isActive: slot.isActive ?? true,
      },
      create: {
        id: slot.id,
        label: slot.label || '',
        startTime: slot.startTime || '',
        endTime: slot.endTime || '',
        durationMinutes: Number(slot.durationMinutes || 0),
        isActive: slot.isActive ?? true,
      },
    });
  }

  await prisma.attendanceRulesConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      maxOfficialLeavePercent: 10,
      maxCasualLeavePercent: 15,
      maxTotalLeavesPercent: 25,
      maxOfficialCasualCombinedPercent: 15,
      minRequiredAttendancePercent: 85,
      academicLeaveCountedAsPresent: true,
      clearanceAllowedRoles: ['super_admin', 'Principal', 'HoD', 'HoS', 'Academic Assistant'],
    },
  });

  await prisma.systemLockSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      isLevelAddingLocked: false,
      isMarkEntryLocked: false,
    },
  });

  console.log(`\n=============================================================`);
  console.log(`🎉 ALL DATA SUCCESSFULLY SEEDED INTO NEON POSTGRESQL!`);
  console.log(`=============================================================\n`);
}

// Default CLI runner
const targetFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve('prisma/portal_full_firestore_backup_2026-10-01.json');

seedNeonFromBackup(targetFile)
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('❌ Migration Error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
