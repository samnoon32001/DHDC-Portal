import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Database Seed / Migration...');

  // 1. Initial System Roles
  const roles = [
    {
      id: 'role-super-admin',
      name: 'Super Administrator',
      description: 'Full institutional governance and unrestricted access',
      isSystem: true,
      permissions: ['*'],
    },
    {
      id: 'role-teacher',
      name: 'Faculty Member / Teacher',
      description: 'Course instruction, attendance logging, and continuous evaluation entry',
      isSystem: true,
      permissions: ['view_classes', 'take_attendance', 'enter_marks'],
    },
    {
      id: 'role-student',
      name: 'Student Portal',
      description: 'Access 360 dossier, review attendance metrics, and submit requests',
      isSystem: true,
      permissions: ['view_own_profile', 'view_own_attendance', 'view_own_marks', 'submit_leave'],
    },
  ];

  for (const role of roles) {
    await prisma.roleDefinition.upsert({
      where: { id: role.id },
      update: role,
      create: role,
    });
  }
  console.log('✅ Seeded System Roles');

  // 2. Initial Academic Year
  const currentYear = await prisma.academicYear.upsert({
    where: { year: '2025-2026' },
    update: { isCurrent: true },
    create: { year: '2025-2026', isCurrent: true },
  });
  console.log(`✅ Seeded Academic Year: ${currentYear.year}`);

  // 3. Initial Timetable Periods
  const periods = [
    { id: 'p-1', periodNumber: 1, name: 'Period 1', startTime: '07:45', endTime: '08:30', isBreak: false },
    { id: 'p-2', periodNumber: 2, name: 'Period 2', startTime: '08:30', endTime: '09:15', isBreak: false },
    { id: 'p-3', periodNumber: 3, name: 'Period 3', startTime: '09:15', endTime: '10:00', isBreak: false },
    { id: 'p-break-1', periodNumber: 4, name: 'Morning Interval', startTime: '10:00', endTime: '10:15', isBreak: true, breakLabel: 'Morning Interval' },
    { id: 'p-4', periodNumber: 4, name: 'Period 4', startTime: '10:15', endTime: '11:00', isBreak: false },
    { id: 'p-5', periodNumber: 5, name: 'Period 5', startTime: '11:00', endTime: '11:45', isBreak: false },
    { id: 'p-6', periodNumber: 6, name: 'Period 6', startTime: '11:45', endTime: '12:30', isBreak: false },
  ];

  for (const p of periods) {
    await prisma.timetablePeriodDefinition.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  console.log('✅ Seeded Timetable Periods');

  // 4. Initial System Rules & Settings
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

  console.log('🎉 Database seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
