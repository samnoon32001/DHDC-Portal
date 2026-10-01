import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  Check,
  CheckCircle2,
  X,
  AlertCircle,
  BookOpen,
  User,
  Coffee,
  Split,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/db';
import { hasPermission } from '../../utils/permissions';
import { TimetablePeriodDefinition, TimetableSlot, DayOfWeek, Subject, Teacher } from '../../types';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const TimetableManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const user = currentUser;

  const [dbState, setDbState] = useState(() => dataService.getState());
  const [activeTab, setActiveTab] = useState<'weekly-grid' | 'period-timings'>('weekly-grid');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    () => dbState.classes?.[0]?.id || ''
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');

  const canEditTimetable =
    user?.role === 'super_admin' ||
    user?.username === 'admin' ||
    (user as any)?.role === 'admin' ||
    hasPermission(user, 'timetable_manage', dbState) ||
    hasPermission(user, 'classes_manage', dbState);

  const [periodSaveSuccess, setPeriodSaveSuccess] = useState<string | null>(null);
  const [periodFormError, setPeriodFormError] = useState<string | null>(null);

  useEffect(() => {
    if (dbState.classes?.length > 0 && (!selectedClassId || !dbState.classes.some((c) => c.id === selectedClassId))) {
      setSelectedClassId(dbState.classes[0].id);
    }
  }, [dbState.classes, selectedClassId]);

  // Edit slot modal/drawer
  const [editingSlot, setEditingSlot] = useState<{
    periodNumber: number;
    dayOfWeek: DayOfWeek;
    classId: string;
    existingSlot?: TimetableSlot;
    subjectId: string;
    teacherId: string;
    room: string;
    isSplitSlot: boolean;
    secondarySubjectId?: string;
    secondaryTeacherId?: string;
  } | null>(null);

  // Edit period definition modal
  const [editingPeriod, setEditingPeriod] = useState<Partial<TimetablePeriodDefinition> | null>(null);

  React.useEffect(() => {
    return dataService.subscribe(() => {
      setDbState(dataService.getState());
    });
  }, []);

  const classes = dbState.classes || [];
  const subjects = dbState.subjects || [];
  const teachers = dbState.teachers || [];
  const periods = useMemo(() => {
    return (dbState.timetablePeriods || []).slice().sort((a, b) => {
      if (a.startTime && b.startTime) {
        const cmp = a.startTime.localeCompare(b.startTime);
        if (cmp !== 0) return cmp;
      }
      return (a.periodNumber || 0) - (b.periodNumber || 0);
    });
  }, [dbState.timetablePeriods]);

  const slots = dbState.timetableSlots || [];

  const classSubjects = useMemo(() => {
    return subjects.filter((s) => s.classId === selectedClassId && s.status !== 'inactive');
  }, [subjects, selectedClassId]);

  // Slots for current class and current day
  const currentDaySlots = useMemo(() => {
    return slots.filter(
      (s) => s.classId === selectedClassId && s.dayOfWeek.toLowerCase() === selectedDay.toLowerCase()
    );
  }, [slots, selectedClassId, selectedDay]);

  const handleOpenEditSlot = (period: TimetablePeriodDefinition) => {
    if (!canEditTimetable) return;

    // Find any existing slots for this period
    const existing = currentDaySlots.filter((s) => s.periodNumber === period.periodNumber);
    const primary = existing[0];
    const secondary = existing[1];

    setEditingSlot({
      periodNumber: period.periodNumber,
      dayOfWeek: selectedDay,
      classId: selectedClassId,
      existingSlot: primary,
      subjectId: primary?.subjectId || classSubjects[0]?.id || '',
      teacherId: primary?.teacherId || classSubjects[0]?.assignedTeacherId || '',
      room: primary?.room || '',
      isSplitSlot: !!secondary || primary?.isSplitSlot || false,
      secondarySubjectId: secondary?.subjectId || '',
      secondaryTeacherId: secondary?.teacherId || '',
    });
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    // Delete existing slots for this period
    const existing = currentDaySlots.filter((s) => s.periodNumber === editingSlot.periodNumber);
    existing.forEach((s) => dataService.deleteTimetableSlot(s.id));

    // Save primary slot
    if (editingSlot.subjectId) {
      dataService.saveTimetableSlot({
        id: `tt-${editingSlot.classId}-${editingSlot.dayOfWeek.toLowerCase()}-p${editingSlot.periodNumber}`,
        dayOfWeek: editingSlot.dayOfWeek,
        periodNumber: editingSlot.periodNumber,
        classId: editingSlot.classId,
        subjectId: editingSlot.subjectId,
        teacherId: editingSlot.teacherId,
        room: editingSlot.room,
        isSplitSlot: editingSlot.isSplitSlot,
      });
    }

    // If split slot, save secondary elective subject slot
    if (editingSlot.isSplitSlot && editingSlot.secondarySubjectId) {
      dataService.saveTimetableSlot({
        id: `tt-${editingSlot.classId}-${editingSlot.dayOfWeek.toLowerCase()}-p${editingSlot.periodNumber}-split2`,
        dayOfWeek: editingSlot.dayOfWeek,
        periodNumber: editingSlot.periodNumber,
        classId: editingSlot.classId,
        subjectId: editingSlot.secondarySubjectId,
        teacherId: editingSlot.secondaryTeacherId || '',
        room: `${editingSlot.room || ''} (B)`.trim(),
        isSplitSlot: true,
      });
    }

    setDbState(dataService.getState());
    setEditingSlot(null);
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod) return;
    setPeriodFormError(null);

    const startTime = (editingPeriod.startTime || '').trim();
    const endTime = (editingPeriod.endTime || '').trim();

    if (!startTime || !endTime) {
      setPeriodFormError('Both Start Time and End Time are required.');
      return;
    }

    const isBreak = editingPeriod.isBreak || false;
    const periodNum = editingPeriod.periodNumber || (isBreak ? 0 : periods.filter((p) => !p.isBreak).length + 1);
    const periodName = (editingPeriod.name || '').trim() || (isBreak ? (editingPeriod.breakLabel || 'Interval Break') : `Period ${periodNum}`);

    if (editingPeriod.id) {
      dataService.updateTimetablePeriod(editingPeriod.id, {
        name: periodName,
        periodNumber: periodNum,
        startTime,
        endTime,
        isBreak,
        breakLabel: isBreak ? (editingPeriod.breakLabel || periodName) : undefined,
      });
      setPeriodSaveSuccess(`Period timing "${periodName}" (${startTime} - ${endTime}) updated successfully!`);
    } else {
      dataService.addTimetablePeriod({
        id: `period-${Date.now()}`,
        periodNumber: periodNum,
        name: periodName,
        startTime,
        endTime,
        isBreak,
        breakLabel: isBreak ? (editingPeriod.breakLabel || periodName) : undefined,
      });
      setPeriodSaveSuccess(`New ${isBreak ? 'break' : 'period'} "${periodName}" (${startTime} - ${endTime}) added successfully!`);
    }

    setDbState(dataService.getState());
    setEditingPeriod(null);
    setTimeout(() => setPeriodSaveSuccess(null), 4000);
  };

  const handleDeletePeriod = (id: string) => {
    const p = periods.find((item) => item.id === id);
    if (confirm(`Are you sure you want to delete "${p?.name || 'this period'}" (${p?.startTime} - ${p?.endTime})?`)) {
      dataService.deleteTimetablePeriod(id);
      setDbState(dataService.getState());
      setPeriodSaveSuccess(`Period "${p?.name || id}" deleted successfully.`);
      setTimeout(() => setPeriodSaveSuccess(null), 4000);
    }
  };

  // Helper to add minutes to HH:MM string
  const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
    if (!timeStr || !timeStr.includes(':')) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return '';
    const totalMinutes = (h * 60 + m + minutesToAdd) % (24 * 60);
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  return (
    <div id="timetable-management-view" className="space-y-6 pb-12">
      {/* Toast Notification */}
      {periodSaveSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{periodSaveSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setPeriodSaveSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Timetable & Schedule</h1>
              <p className="text-xs text-slate-600">
                Configure period timings (07:45 - 16:15), weekly timetable for each class, and split elective subjects.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            id="tab-weekly-grid"
            type="button"
            onClick={() => setActiveTab('weekly-grid')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'weekly-grid'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly Schedule
          </button>
          <button
            id="tab-period-timings"
            type="button"
            onClick={() => setActiveTab('period-timings')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'period-timings'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Period Timings & Schedule Hours</span>
          </button>
        </div>
      </div>

      {activeTab === 'weekly-grid' ? (
        <div className="space-y-4">
          {/* Controls: Class Selector, Day Pills & Quick Period Timing Actions */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs font-semibold text-slate-700">Class:</label>
              <select
                id="select-timetable-class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-sm font-semibold py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isAttendanceEnabled === false ? '(Attendance Disabled)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Days pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Quick Period Timings Action Bar */}
            {canEditTimetable && (
              <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setEditingPeriod({
                      periodNumber: periods.filter((p) => !p.isBreak).length + 1,
                      name: `Period ${periods.filter((p) => !p.isBreak).length + 1}`,
                      startTime: '08:00',
                      endTime: '08:45',
                      isBreak: false,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Period / Break</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('period-timings')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manage All Timings</span>
                </button>
              </div>
            )}
          </div>

          {/* Schedule Grid for selected day */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">{selectedDay}&apos;s Timetable</span>
                <span className="text-xs text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full font-medium">
                  {classes.find((c) => c.id === selectedClassId)?.name}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {canEditTimetable ? 'Click period timing to adjust hours, or click row to assign subjects' : 'View only mode'}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {periods.map((period) => {
                if (period.isBreak) {
                  return (
                    <div
                      key={period.id}
                      className="p-3.5 bg-amber-50/70 border-l-4 border-l-amber-400 flex items-center justify-between px-5 text-xs text-amber-950 font-medium"
                    >
                      <div className="flex items-center gap-2.5">
                        <Coffee className="w-4 h-4 text-amber-600" />
                        <span className="font-bold">{period.breakLabel || period.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-200/60 text-amber-800">
                          Break / Interval
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-amber-900 font-semibold bg-white/70 px-2.5 py-1 rounded-md border border-amber-200">
                          {period.startTime} - {period.endTime}
                        </span>
                        {canEditTimetable && (
                          <button
                            type="button"
                            onClick={() => setEditingPeriod(period)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-200/80 rounded-lg transition cursor-pointer"
                            title="Edit break timing"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Timing</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // Find slots for this period
                const matchingSlots = currentDaySlots.filter((s) => s.periodNumber === period.periodNumber);
                const hasSlot = matchingSlots.length > 0;

                return (
                  <div
                    key={period.id}
                    id={`period-slot-row-${period.periodNumber}`}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-slate-50/60"
                  >
                    {/* Period Timing Badge with Clickable Direct Timing Edit */}
                    <div className="flex items-center gap-3 min-w-48">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                        P{period.periodNumber}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{period.name}</span>
                          {canEditTimetable && (
                            <button
                              type="button"
                              onClick={() => setEditingPeriod(period)}
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                              title="Edit period timing"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => canEditTimetable && setEditingPeriod(period)}
                          className={`text-xs font-mono text-slate-600 flex items-center gap-1 hover:text-emerald-700 transition ${
                            canEditTimetable ? 'cursor-pointer hover:underline' : ''
                          }`}
                          title={canEditTimetable ? 'Click to edit period timing' : undefined}
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-700">{period.startTime} - {period.endTime}</span>
                        </button>
                      </div>
                    </div>

                    {/* Subject / Teacher Slot Content */}
                    <div className="flex-1 cursor-pointer" onClick={() => canEditTimetable && handleOpenEditSlot(period)}>
                      {hasSlot ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {matchingSlots.map((slot) => {
                            const sub = subjects.find((s) => s.id === slot.subjectId);
                            const teacher = teachers.find((t) => t.id === slot.teacherId);

                            return (
                              <div
                                key={slot.id}
                                className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-2 shadow-2xs ${
                                  slot.isSplitSlot
                                    ? 'bg-purple-50 border-purple-200 text-purple-900'
                                    : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              >
                                {slot.isSplitSlot && (
                                  <Split className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                )}
                                <div>
                                  <div className="font-bold text-slate-900">{sub?.name || 'Assigned Subject'}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {teacher?.name || 'Teacher unassigned'}
                                    {slot.room ? ` • Room: ${slot.room}` : ''}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400 hover:text-slate-600">
                          No subject scheduled • Click to assign
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      {canEditTimetable && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingPeriod(period)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                            title="Edit Period Timing"
                          >
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Timing</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSlot(period)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-emerald-200"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{hasSlot ? 'Edit Slot' : 'Assign'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Period Timings Configuration Tab */
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Master Period Timings & Schedule Hours</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super Admins configure college period timings (e.g. Period 1: 07:45 - 08:30) and interval break durations.
                </p>
              </div>

              {canEditTimetable && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingPeriod({
                        periodNumber: periods.filter((p) => !p.isBreak).length + 1,
                        name: `Period ${periods.filter((p) => !p.isBreak).length + 1}`,
                        startTime: '08:00',
                        endTime: '08:45',
                        isBreak: false,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Period / Break</span>
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/80">
                    <th className="py-3 px-3.5 font-semibold">Type / Order</th>
                    <th className="py-3 px-3.5 font-semibold">Period Name</th>
                    <th className="py-3 px-3.5 font-semibold">Start Time</th>
                    <th className="py-3 px-3.5 font-semibold">End Time</th>
                    <th className="py-3 px-3.5 font-semibold">Duration</th>
                    <th className="py-3 px-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periods.map((p) => {
                    // Calculate duration in minutes
                    let durationText = '';
                    if (p.startTime && p.endTime && p.startTime.includes(':') && p.endTime.includes(':')) {
                      const [sh, sm] = p.startTime.split(':').map(Number);
                      const [eh, em] = p.endTime.split(':').map(Number);
                      const startMin = (sh || 0) * 60 + (sm || 0);
                      const endMin = (eh || 0) * 60 + (em || 0);
                      const diff = endMin >= startMin ? endMin - startMin : 24 * 60 - startMin + endMin;
                      durationText = `${diff} mins`;
                    }

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5">
                          {p.isBreak ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                              <Coffee className="w-3 h-3 text-amber-600" />
                              Break
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800 font-mono">
                              Period #{p.periodNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 font-medium text-slate-900">
                          {p.name} {p.breakLabel && p.breakLabel !== p.name ? `(${p.breakLabel})` : ''}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-800 font-semibold">{p.startTime}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-800 font-semibold">{p.endTime}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-500">{durationText}</td>
                        <td className="py-3 px-3.5 text-right">
                          {canEditTimetable && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingPeriod(p)}
                                className="px-2.5 py-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition font-medium flex items-center gap-1 border border-slate-200 cursor-pointer"
                                title="Edit period timing"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePeriod(p.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete period"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      {/* Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-800 mb-1">
              Assign Period {editingSlot.periodNumber} ({editingSlot.dayOfWeek})
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Select the subject and teacher scheduled for this period.
            </p>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Subject
                </label>
                <select
                  value={editingSlot.subjectId}
                  onChange={(e) => {
                    const subId = e.target.value;
                    const sub = subjects.find((s) => s.id === subId);
                    setEditingSlot({
                      ...editingSlot,
                      subjectId: subId,
                      teacherId: sub?.assignedTeacherId || editingSlot.teacherId,
                    });
                  }}
                  required
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="">-- Select Subject --</option>
                  {classSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) {s.isSplitSubject ? `[Split: ${s.splitGroupName}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher</label>
                <select
                  value={editingSlot.teacherId}
                  onChange={(e) => setEditingSlot({ ...editingSlot, teacherId: e.target.value })}
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Hall</label>
                <input
                  type="text"
                  placeholder="e.g. Hall 8A, Lab 2"
                  value={editingSlot.room}
                  onChange={(e) => setEditingSlot({ ...editingSlot, room: e.target.value })}
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Split Subject Checkbox */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSlot.isSplitSlot}
                    onChange={(e) => setEditingSlot({ ...editingSlot, isSplitSlot: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Split Subject Period (e.g. Computer App vs Humanities)
                  </span>
                </label>
                <p className="text-[11px] text-slate-600 ml-5 mt-0.5">
                  Allows two separate electives in the same period for split groups.
                </p>
              </div>

              {editingSlot.isSplitSlot && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-purple-900">Secondary Split Elective</div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Secondary Subject
                    </label>
                    <select
                      value={editingSlot.secondarySubjectId || ''}
                      onChange={(e) => {
                        const sub = subjects.find((s) => s.id === e.target.value);
                        setEditingSlot({
                          ...editingSlot,
                          secondarySubjectId: e.target.value,
                          secondaryTeacherId: sub?.assignedTeacherId || editingSlot.secondaryTeacherId,
                        });
                      }}
                      className="w-full text-xs p-2 bg-white border border-purple-300 rounded-lg focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="">-- Select Secondary Subject --</option>
                      {classSubjects
                        .filter((s) => s.id !== editingSlot.subjectId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Secondary Teacher
                    </label>
                    <select
                      value={editingSlot.secondaryTeacherId || ''}
                      onChange={(e) =>
                        setEditingSlot({ ...editingSlot, secondaryTeacherId: e.target.value })
                      }
                      className="w-full text-xs p-2 bg-white border border-purple-300 rounded-lg focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="">-- Select Secondary Teacher --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  Save Schedule Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Period Definition Modal */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {editingPeriod.id ? 'Edit Period Timing' : 'Add Period / Break'}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure period number, name, start time and end time for college schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {periodFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{periodFormError}</span>
              </div>
            )}

            <form onSubmit={handleSavePeriod} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={editingPeriod.isBreak || false}
                    onChange={(e) => {
                      const isBrk = e.target.checked;
                      setEditingPeriod({
                        ...editingPeriod,
                        isBreak: isBrk,
                        name: isBrk ? 'Morning Interval' : `Period ${editingPeriod.periodNumber || 1}`,
                        breakLabel: isBrk ? 'Morning Interval' : undefined,
                      });
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Is this an Interval / Lunch & Prayer Break?</span>
                </label>
              </div>

              {!editingPeriod.isBreak ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Period Number *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={editingPeriod.periodNumber ?? 1}
                      onChange={(e) => {
                        const num = parseInt(e.target.value, 10);
                        setEditingPeriod({
                          ...editingPeriod,
                          periodNumber: isNaN(num) ? 1 : num,
                          name: `Period ${isNaN(num) ? 1 : num}`,
                        });
                      }}
                      className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Period Label / Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Period 1"
                      value={editingPeriod.name || ''}
                      onChange={(e) =>
                        setEditingPeriod({
                          ...editingPeriod,
                          name: e.target.value,
                        })
                      }
                      className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Break Description / Label *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Morning Interval, Lunch & Prayer Break"
                    value={editingPeriod.breakLabel || editingPeriod.name || ''}
                    onChange={(e) =>
                      setEditingPeriod({
                        ...editingPeriod,
                        breakLabel: e.target.value,
                        name: e.target.value,
                      })
                    }
                    className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time (24h) *</label>
                  <input
                    type="time"
                    value={editingPeriod.startTime || ''}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, startTime: e.target.value })}
                    required
                    className="w-full text-sm font-mono p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time (24h) *</label>
                  <input
                    type="time"
                    value={editingPeriod.endTime || ''}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, endTime: e.target.value })}
                    required
                    className="w-full text-sm font-mono p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Duration Preset Chips */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Quick Duration Auto-Calculate (Sets End Time from Start Time):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '+45m Class', mins: 45 },
                    { label: '+50m Class', mins: 50 },
                    { label: '+60m Class', mins: 60 },
                    { label: '+15m Interval', mins: 15 },
                    { label: '+1h 30m Lunch', mins: 90 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        const start = editingPeriod.startTime || '07:45';
                        const newEnd = addMinutesToTime(start, chip.mins);
                        setEditingPeriod({
                          ...editingPeriod,
                          startTime: start,
                          endTime: newEnd,
                        });
                      }}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded-md text-[11px] font-semibold transition cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
                {editingPeriod.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingPeriod.id) {
                        handleDeletePeriod(editingPeriod.id);
                        setEditingPeriod(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    Delete Period
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPeriod(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Period Timing</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
