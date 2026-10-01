import React, { useState } from 'react';
import { Subject, Teacher, AttendanceRulesConfig } from '../../types';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  BookOpen,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Save,
  Shield,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { RolesPermissionsManagement } from '../admin/RolesPermissionsManagement';

export const AttendanceSettingsView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  const [activeTab, setActiveTab] = useState<'roles' | 'subjects'>('roles');

  const [selectedClassId, setSelectedClassId] = useState<string>(
    state.classes[0]?.id || ''
  );

  const [rules, setRules] = useState<AttendanceRulesConfig>({
    maxOfficialLeavePercent: 10,
    maxCasualLeavePercent: 15,
    maxTotalLeavesPercent: 25,
    maxOfficialCasualCombinedPercent: 15,
    minRequiredAttendancePercent: 85,
    academicLeaveCountedAsPresent: true,
  });

  const subjectsInClass = state.subjects.filter(
    (s) => s.classId === selectedClassId
  );

  const handleToggleSubjectAttendance = (subjectId: string, enabled: boolean) => {
    dataService.setSubjectAttendanceTracking(
      subjectId,
      enabled,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
    setRerender((v) => v + 1);
  };

  const handleToggleSplitSubject = (subjectId: string, isSplit: boolean) => {
    dataService.updateSubject(
      subjectId,
      { isSplitSubject: isSplit },
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Roles, Permissions & Attendance Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure institutional roles, faculty permissions (Principal, Academic Assistant, HoD, HoS), and subject attendance toggles
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          <button
            id="tab-roles-permissions"
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Roles & Permissions</span>
          </button>

          <button
            id="tab-subject-tracking"
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Subject Attendance Toggles</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ROLES & PERMISSIONS MANAGEMENT */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <RolesPermissionsManagement />
        </div>
      )}

      {/* TAB 2: SUBJECT ATTENDANCE TOGGLES */}
      {activeTab === 'subjects' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Subject Attendance Toggles
                </h3>
                <p className="text-xs text-slate-500">
                  Enable or disable attendance tracking for specific subjects and flag split period electives
                </p>
              </div>
            </div>

            {/* Class Picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Class:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {state.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {subjectsInClass.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No subjects registered for this class.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjectsInClass.map((sub) => {
                const isTracked = sub.trackAttendance !== false;
                const isSplit = !!sub.isSplitSubject;
                const assignedTeacher = state.teachers.find(
                  (t) => t.id === sub.assignedTeacherId
                );

                return (
                  <div
                    key={sub.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {sub.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{sub.code}</span>
                        <span>•</span>
                        <span>{assignedTeacher ? assignedTeacher.name : 'No Teacher'}</span>
                        {isSplit && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                            Split Elective
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Split Period Checkbox */}
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSplit}
                          onChange={(e) => handleToggleSplitSubject(sub.id, e.target.checked)}
                          className="rounded text-emerald-600 cursor-pointer"
                        />
                        <span>Split Period</span>
                      </label>

                      {/* Track Attendance Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleSubjectAttendance(sub.id, !isTracked)}
                        className={`px-3 py-1 rounded-xl font-semibold cursor-pointer transition-colors text-xs ${
                          isTracked
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isTracked ? '✓ Tracking Active' : 'Off'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
