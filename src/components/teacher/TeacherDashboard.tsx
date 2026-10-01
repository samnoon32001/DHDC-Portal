import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { DashboardShowcaseBanner } from '../showcase/DashboardShowcaseBanner';
import {
  School,
  BookOpen,
  Users,
  CheckSquare,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Sliders,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Bell,
  BellRing,
  Sparkles,
  Coffee,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';
import type { NavSection } from '../layout/Sidebar';
import type { DayOfWeek, TimetablePeriodDefinition, TimetableSlot } from '../../types';

export const TeacherDashboard: React.FC<{ onNavigate: (section: NavSection) => void }> = ({
  onNavigate,
}) => {
  const { currentUser, isClassTeacher } = useAuth();
  const [dbState, setDbState] = useState(() => dataService.getState());

  useEffect(() => {
    return dataService.subscribe(() => {
      setDbState(dataService.getState());
    });
  }, []);

  const state = dbState;

  // Effective teacher resolution
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    const matched = state.teachers.find(
      (t) =>
        t.id === currentUser?.id ||
        t.username === currentUser?.username ||
        t.email === currentUser?.email ||
        t.name.toLowerCase() === currentUser?.name?.toLowerCase()
    );
    return matched?.id || state.teachers[0]?.id || '';
  });

  // Schedule view mode: 'teacher' or 'class'
  const [scheduleViewMode, setScheduleViewMode] = useState<'teacher' | 'class'>('teacher');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => state.classes[0]?.id || '');

  // Keep selectedClassId and selectedTeacherId in sync if data loads from database
  useEffect(() => {
    if (state.classes.length > 0 && (!selectedClassId || !state.classes.some((c) => c.id === selectedClassId))) {
      setSelectedClassId(state.classes[0].id);
    }
    if (state.teachers.length > 0 && (!selectedTeacherId || !state.teachers.some((t) => t.id === selectedTeacherId))) {
      const matched = state.teachers.find(
        (t) =>
          t.id === currentUser?.id ||
          t.username === currentUser?.username ||
          t.email === currentUser?.email ||
          t.name.toLowerCase() === currentUser?.name?.toLowerCase()
      );
      setSelectedTeacherId(matched?.id || state.teachers[0].id);
    }
  }, [state.classes, state.teachers, selectedClassId, selectedTeacherId, currentUser]);

  // Find active teacher record
  const effectiveTeacher = useMemo(() => {
    return (
      state.teachers.find((t) => t.id === selectedTeacherId) ||
      state.teachers.find(
        (t) =>
          t.id === currentUser?.id ||
          t.username === currentUser?.username ||
          t.email === currentUser?.email
      ) ||
      state.teachers[0]
    );
  }, [state.teachers, selectedTeacherId, currentUser]);

  const teacherId = effectiveTeacher?.id || '';

  // Assigned subjects for the effective teacher
  const assignedSubjects = useMemo(() => {
    return state.subjects.filter(
      (s) => s.assignedTeacherId === teacherId || effectiveTeacher?.assignedSubjectIds?.includes(s.id)
    );
  }, [state.subjects, teacherId, effectiveTeacher]);

  // Assigned classes (from subjects + direct assignedClassIds)
  const assignedClassIds = useMemo(() => {
    return Array.from(
      new Set([
        ...(effectiveTeacher?.assignedClassIds || []),
        ...assignedSubjects.map((s) => s.classId),
      ])
    );
  }, [effectiveTeacher, assignedSubjects]);

  const assignedClasses = useMemo(() => {
    return state.classes.filter((c) => assignedClassIds.includes(c.id));
  }, [state.classes, assignedClassIds]);

  // Enrolled students in teacher's classes
  const teacherStudents = useMemo(() => {
    return state.students.filter((s) => assignedClassIds.includes(s.classId));
  }, [state.students, assignedClassIds]);

  // Marks entered for teacher's subjects
  const teacherSubjectIds = useMemo(() => assignedSubjects.map((s) => s.id), [assignedSubjects]);
  const teacherMarks = useMemo(() => {
    return state.marks.filter((m) => teacherSubjectIds.includes(m.subjectId));
  }, [state.marks, teacherSubjectIds]);

  // Class teacher classes
  const classTeacherClasses = useMemo(() => {
    return state.classes.filter(
      (c) => c.classTeacherId === teacherId || effectiveTeacher?.classTeacherOfClassIds?.includes(c.id)
    );
  }, [state.classes, teacherId, effectiveTeacher]);

  // ⏰ Live Time & Timetable Calculations
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);
  const [simulateAlert, setSimulateAlert] = useState(false);

  // Update clock every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const daysOfWeekList: DayOfWeek[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const todayDayOfWeek = daysOfWeekList[currentTime.getDay()];

  const timetablePeriods = useMemo(() => {
    return (state.timetablePeriods || []).slice().sort((a, b) => a.periodNumber - b.periodNumber);
  }, [state.timetablePeriods]);

  const timetableSlots = useMemo(() => {
    return state.timetableSlots || [];
  }, [state.timetableSlots]);

  // Current time in minutes from 00:00
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const parseTimeToMin = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Real scheduled periods for today taken directly from Timetable & Schedule
  const todayScheduledPeriods = useMemo(() => {
    return timetablePeriods
      .filter((p) => !p.isBreak && !p.breakLabel)
      .map((p) => {
        // Look for slots matching today and current schedule view
        const matchingSlots = timetableSlots.filter((s) => {
          if (s.dayOfWeek.toLowerCase() !== todayDayOfWeek.toLowerCase()) return false;
          if (s.periodNumber !== p.periodNumber) return false;

          if (scheduleViewMode === 'class') {
            return s.classId === selectedClassId;
          } else {
            const slotSub = state.subjects.find((sub) => sub.id === s.subjectId);
            return (
              s.teacherId === teacherId ||
              slotSub?.assignedTeacherId === teacherId ||
              slotSub?.additionalTeacherIds?.includes(teacherId) ||
              effectiveTeacher?.assignedSubjectIds?.includes(s.subjectId)
            );
          }
        });

        const primarySlot = matchingSlots[0] || null;
        const secondarySlot = matchingSlots[1] || null;

        const subject = primarySlot ? state.subjects.find((s) => s.id === primarySlot.subjectId) : null;
        const cls = primarySlot ? state.classes.find((c) => c.id === primarySlot.classId) : null;
        const teacherObj = primarySlot ? state.teachers.find((t) => t.id === primarySlot.teacherId) : null;

        const startMinutes = parseTimeToMin(p.startTime);
        const endMinutes = parseTimeToMin(p.endTime);
        const isOngoing = primarySlot != null && currentMinutes >= startMinutes && currentMinutes < endMinutes;
        const isUpcoming = primarySlot != null && startMinutes > currentMinutes;
        const diffMinutes = startMinutes - currentMinutes;

        return {
          period: p,
          slot: primarySlot,
          secondarySlot,
          subject,
          cls,
          teacherObj,
          startMinutes,
          endMinutes,
          isOngoing,
          isUpcoming,
          diffMinutes,
        };
      });
  }, [
    timetablePeriods,
    timetableSlots,
    todayDayOfWeek,
    scheduleViewMode,
    selectedClassId,
    teacherId,
    effectiveTeacher,
    state.subjects,
    state.classes,
    state.teachers,
    currentMinutes,
  ]);

  // Scheduled periods today with assigned subjects
  const actualTeachingPeriodsToday = useMemo(() => {
    return todayScheduledPeriods.filter((item) => item.slot != null && item.subject != null);
  }, [todayScheduledPeriods]);

  const ongoingPeriod = useMemo(() => {
    return actualTeachingPeriodsToday.find((p) => p.isOngoing) || null;
  }, [actualTeachingPeriodsToday]);

  const nextPeriod = useMemo(() => {
    return actualTeachingPeriodsToday.find((p) => p.isUpcoming) || null;
  }, [actualTeachingPeriodsToday]);

  // 10-minute alert condition
  const isAlertActive =
    simulateAlert ||
    (nextPeriod != null && nextPeriod.diffMinutes > 0 && nextPeriod.diffMinutes <= 10);

  const alertDiff = simulateAlert ? 8 : (nextPeriod?.diffMinutes ?? 0);

  // Next period formatted string taken directly from real Timetable data
  const nextPeriodFormatted = useMemo(() => {
    if (nextPeriod && nextPeriod.subject && nextPeriod.cls) {
      return `${nextPeriod.subject.name} ${nextPeriod.cls.name}, ${nextPeriod.period.startTime}`;
    }
    if (ongoingPeriod && ongoingPeriod.subject && ongoingPeriod.cls) {
      return `${ongoingPeriod.subject.name} ${ongoingPeriod.cls.name}, ${ongoingPeriod.period.startTime} (Active Now)`;
    }
    if (actualTeachingPeriodsToday.length > 0) {
      return 'Completed for today';
    }
    return 'No scheduled periods today';
  }, [nextPeriod, ongoingPeriod, actualTeachingPeriodsToday]);

  // Periods for Today's Time Table (for timetable display)
  // Omits all interval breaks like Morning Interval, Prayer & Lunch Break
  const displayDayPeriods = useMemo(() => {
    return timetablePeriods
      .filter((p) => !p.isBreak && !p.breakLabel)
      .map((p) => {
        // Look for slot on today's day of week
        const matchingSlots = timetableSlots.filter((s) => {
          if (s.dayOfWeek.toLowerCase() !== todayDayOfWeek.toLowerCase()) return false;
          if (s.periodNumber !== p.periodNumber) return false;

          if (scheduleViewMode === 'class') {
            return s.classId === selectedClassId;
          } else {
            const slotSub = state.subjects.find((sub) => sub.id === s.subjectId);
            return (
              s.teacherId === teacherId ||
              slotSub?.assignedTeacherId === teacherId ||
              slotSub?.additionalTeacherIds?.includes(teacherId) ||
              effectiveTeacher?.assignedSubjectIds?.includes(s.subjectId)
            );
          }
        });

        const primarySlot = matchingSlots[0] || null;
        const secondarySlot = matchingSlots[1] || null;

        const subject = primarySlot ? state.subjects.find((s) => s.id === primarySlot.subjectId) : null;
        const cls = primarySlot ? state.classes.find((c) => c.id === primarySlot.classId) : null;
        const teacherObj = primarySlot ? state.teachers.find((t) => t.id === primarySlot.teacherId) : null;

        const secondarySubject = secondarySlot
          ? state.subjects.find((s) => s.id === secondarySlot.subjectId)
          : null;

        const startMinutes = parseTimeToMin(p.startTime);
        const endMinutes = parseTimeToMin(p.endTime);
        const isOngoing = primarySlot != null && currentMinutes >= startMinutes && currentMinutes < endMinutes;
        const isNext = nextPeriod?.period.id === p.id;

        return {
          period: p,
          slot: primarySlot,
          secondarySlot,
          subject,
          cls,
          teacherObj,
          secondarySubject,
          startMinutes,
          endMinutes,
          isOngoing,
          isNext,
        };
      });
  }, [
    timetablePeriods,
    timetableSlots,
    todayDayOfWeek,
    scheduleViewMode,
    selectedClassId,
    teacherId,
    effectiveTeacher,
    state.subjects,
    state.classes,
    state.teachers,
    currentMinutes,
    nextPeriod,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Spotlight Toppers Banner (Ad style priority carousel) */}
      <DashboardShowcaseBanner />

      {/* Compact Streamlined Welcome & Timetable Card */}
      <div className="bg-slate-900 dark:bg-slate-900/95 rounded-2xl p-4 sm:p-5 text-white shadow-xs border border-slate-800 space-y-3.5 transition-all">
        {/* Streamlined Welcome Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Welcome back, {effectiveTeacher?.name || currentUser?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-slate-400">
                {assignedSubjects.length} Total Subjects • Class Teacher of {classTeacherClasses.length > 0 ? classTeacherClasses.map((c) => c.name).join(', ') : (assignedClasses.length > 0 ? assignedClasses.map((c) => c.name).slice(0, 3).join(', ') : 'None')}
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="text-slate-400">Your Next Period:</span>
                <span className="font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  {nextPeriodFormatted}
                </span>
              </span>
            </div>
          </div>

          {/* End of section: Arrow button to view Today's Time Table */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <button
              id="btn-toggle-today-timetable"
              type="button"
              onClick={() => setIsTimetableOpen(!isTimetableOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border shadow-xs ${
                isTimetableOpen
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Today&apos;s Time Table</span>
              {isTimetableOpen ? (
                <ChevronUp className="w-4 h-4 text-white transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
              )}
            </button>
          </div>
        </div>

        {/* 🔔 10-Minute Before Next Period Notification Banner */}
        {isAlertActive && (
          <div
            id="next-period-10min-alert"
            className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-indigo-500/20 border border-amber-400/50 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fadeIn"
          >
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center shrink-0 shadow-inner animate-bounce">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Next Period starts in {alertDiff} minutes!</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-400/30 text-amber-200 uppercase tracking-wide">
                    {nextPeriod?.period.startTime || 'Upcoming'}
                  </span>
                </div>
                <div className="text-amber-200/90 text-[11px] mt-0.5">
                  {nextPeriod?.subject ? (
                    <>
                      <strong>{nextPeriod.period.name}</strong>: {nextPeriod.subject.name} ({nextPeriod.cls?.name || 'Class'}) {nextPeriod.slot?.room ? `• Room: ${nextPeriod.slot.room}` : ''}
                    </>
                  ) : (
                    <>
                      <strong>{nextPeriod?.period.name || 'Period'}</strong> starting soon ({nextPeriod?.period.startTime} - {nextPeriod?.period.endTime})
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Open Roll Call</span>
              </button>
              {simulateAlert && (
                <button
                  type="button"
                  onClick={() => setSimulateAlert(false)}
                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Today's Timetable Tray */}
        {isTimetableOpen && (
          <div
            id="dashboard-timetable-accordion"
            className="pt-3 border-t border-slate-800 space-y-3 animate-fadeIn"
          >
            {/* Header: Today's Time Table title & View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Today&apos;s Time Table ({todayDayOfWeek})</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live today"></span>
              </div>

              {/* View Switcher: By Teacher or By Class */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('teacher')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      scheduleViewMode === 'teacher'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('class')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      scheduleViewMode === 'class'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Class
                  </button>
                </div>

                {scheduleViewMode === 'teacher' ? (
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-hidden focus:border-indigo-500 cursor-pointer max-w-[150px] truncate"
                  >
                    {state.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-hidden focus:border-indigo-500 cursor-pointer max-w-[150px] truncate"
                  >
                    {state.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setSimulateAlert(!simulateAlert)}
                  className="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer hidden md:inline-block"
                  title="Preview the 10-minute upcoming notification banner"
                >
                  {simulateAlert ? 'Stop Alert' : 'Test 10m Alert'}
                </button>
              </div>
            </div>

            {/* Timetable Period Cards Grid - 100% Real Today's Timetable Data */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {displayDayPeriods.map((item) => {
                const { period, slot, subject, cls, teacherObj, secondarySubject, isOngoing, isNext } = item;
                const hasSlot = slot != null && subject != null;

                return (
                  <div
                    key={period.id}
                    className={`relative p-3 rounded-xl border transition-all duration-200 min-h-[110px] flex flex-col justify-between ${
                      isNext
                        ? 'bg-gradient-to-br from-amber-950/90 via-slate-900 to-orange-950/70 border-2 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                        : isOngoing
                        ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/70 border-2 border-emerald-400 shadow-md ring-2 ring-emerald-400/50'
                        : hasSlot
                        ? 'bg-slate-800/90 border-slate-700 hover:border-slate-600'
                        : 'bg-slate-800/30 border-dashed border-slate-800 text-slate-500'
                    }`}
                  >
                    {/* Distinct Badges for Next Period vs Now Active */}
                    {isNext && (
                      <div className="absolute -top-2 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Next Period
                      </div>
                    )}
                    {isOngoing && (
                      <div className="absolute -top-2 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
                        Now Active
                      </div>
                    )}

                    <div>
                      {/* Period No and Time */}
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className={`font-bold ${isNext ? 'text-amber-300' : isOngoing ? 'text-emerald-300' : hasSlot ? 'text-slate-200' : 'text-slate-400'}`}>
                          {period.name}
                        </span>
                        <span className={`font-mono text-[10px] ${isNext ? 'text-amber-200/90' : isOngoing ? 'text-emerald-200/90' : 'text-slate-400'}`}>
                          {period.startTime} - {period.endTime}
                        </span>
                      </div>

                      {/* Subject and Class or Free Period */}
                      {hasSlot ? (
                        <div>
                          <div className="font-bold text-sm text-white leading-tight flex items-center gap-1">
                            <span>{subject.name}</span>
                            {secondarySubject && (
                              <span className="text-[10px] font-normal text-indigo-300 bg-indigo-500/20 px-1 py-0.2 rounded border border-indigo-400/30">
                                +{secondarySubject.name}
                              </span>
                            )}
                          </div>
                          <div className={`text-xs mt-0.5 font-medium ${isNext ? 'text-amber-300' : isOngoing ? 'text-emerald-300' : 'text-slate-300'}`}>
                            {cls ? cls.name : 'Class'} {slot.room ? `• ${slot.room}` : ''}
                          </div>
                          {scheduleViewMode === 'class' && teacherObj && (
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {teacherObj.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-1">
                          <div className="font-medium text-xs text-slate-400 italic">
                            Free Period
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            No scheduled class
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Action: Attendance */}
                    <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-between text-[10px]">
                      {hasSlot ? (
                        <button
                          type="button"
                          onClick={() => onNavigate('attendance')}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <CalendarCheck className="w-3 h-3" />
                          <span>Attendance</span>
                        </button>
                      ) : (
                        <div className="text-slate-500 text-[10px] italic">
                          Available slot
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('teacher-classes')}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer border-l-4 border-l-indigo-500 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">My Classes</span>
            <span className="text-slate-400 dark:text-slate-500"><School className="w-4 h-4" /></span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {assignedClasses.length < 10 ? `0${assignedClasses.length}` : assignedClasses.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Teaching Sections</div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('teacher-subjects')}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer border-l-4 border-l-purple-500 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">My Subjects</span>
            <span className="text-slate-400 dark:text-slate-500"><BookOpen className="w-4 h-4" /></span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {assignedSubjects.length < 10 ? `0${assignedSubjects.length}` : assignedSubjects.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Allocated Courses</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Students</span>
            <span className="text-slate-400 dark:text-slate-500"><Users className="w-4 h-4" /></span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {teacherStudents.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Across your cohorts</div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('mark-entry')}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer border-l-4 border-l-amber-500 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Marks Logged</span>
            <span className="text-slate-400 dark:text-slate-500"><CheckSquare className="w-4 h-4" /></span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {teacherMarks.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">CCE Level Records</div>
          </div>
        </div>
      </div>

      {/* Class Teacher Responsibility Highlight (if assigned) */}
      {classTeacherClasses.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-5 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Class Teacher Supervision Role Active
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                You are assigned as Class Teacher for:{' '}
                <span className="font-semibold">
                  {classTeacherClasses.map((c) => c.name).join(', ')}
                </span>
                . You have exclusive access to view consolidated student performance across all subjects.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('class-teacher-view')}
            className="px-4 py-2 text-xs font-semibold text-amber-950 dark:text-amber-100 bg-amber-300 hover:bg-amber-400 dark:bg-amber-800 dark:hover:bg-amber-700 rounded-md transition shrink-0 shadow-xs cursor-pointer"
          >
            Open Class Teacher View →
          </button>
        </div>
      )}

      {/* Assigned Subjects Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              My Assigned Subjects & Mark Entry Status
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any subject below to enter or edit student marks
            </p>
          </div>
          <button
            onClick={() => onNavigate('teacher-subjects')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
          >
            All Subjects <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedSubjects.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              No subjects currently assigned to your instructor profile.
            </div>
          ) : (
            assignedSubjects.map((sub) => {
              const cls = state.classes.find((c) => c.id === sub.classId);
              const studentsCount = state.students.filter((s) => s.classId === sub.classId).length;
              const levels = state.evaluationLevels.filter((l) => l.subjectId === sub.id);
              const marksCount = state.marks.filter((m) => m.subjectId === sub.id).length;

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {sub.code}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold">
                        {cls?.name || 'Class'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {sub.name}
                    </h3>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{studentsCount} Enrolled Students</span>
                      <span>{levels.length} CCE Levels</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onNavigate('evaluation-levels')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md transition cursor-pointer"
                      title="Manage Evaluation Levels"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Levels ({levels.length})
                    </button>
                    <button
                      onClick={() => onNavigate('mark-entry')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition cursor-pointer"
                    >
                      Enter Marks
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
