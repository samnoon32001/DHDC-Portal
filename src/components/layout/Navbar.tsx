import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/db';
import { ThemeToggle } from '../common/ThemeToggle';
import {
  Calendar,
  KeyRound,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  LogOut,
  User,
  GraduationCap,
  Menu,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import type { NavSection } from './Sidebar';

interface NavbarProps {
  currentSection?: NavSection;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection = 'admin-dashboard',
  onToggleSidebar,
}) => {
  const {
    currentUser,
    role,
    logout,
    changePassword,
    activeAcademicYear,
    setActiveAcademicYear,
  } = useAuth();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const academicYears = dataService.getState().academicYears;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'Password cannot be empty' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    const ok = changePassword(newPassword);
    if (ok) {
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordMsg(null);
        setNewPassword('');
        setConfirmPassword('');
      }, 1200);
    } else {
      setPasswordMsg({ type: 'error', text: 'Failed to update password' });
    }
  };

  const handleResetSeed = () => {
    if (window.confirm('Reset all marks, classes, and students back to default seed demonstration data?')) {
      dataService.resetToSeedDemo();
      window.location.reload();
    }
  };

  const getSectionTitle = (section: NavSection | string): string => {
    switch (section) {
      case 'admin-dashboard':
        return 'Overview Dashboard';
      case 'students':
        return 'Student Directory';
      case 'teachers':
        return 'Faculty Management';
      case 'classes':
        return 'Class & Section Setup';
      case 'subjects':
        return 'Curriculum Subjects';
      case 'spotlight-toppers':
        return 'Spotlight Toppers & Dashboard Ad Cards';
      case 'evaluation-levels':
        return 'Evaluation Levels & Max Marks';
      case 'excel-import':
        return 'Excel Data Ingestion';
      case 'reports':
        return 'Institutional Analytics & Reports';
      case 'audit-logs':
        return 'System Audit Trail';
      case 'timetable':
        return 'Timetable & Schedule Management';
      case 'attendance':
        return 'Attendance Management (Hajar)';
      case 'leaves':
        return 'Leave Applications';
      case 'achievements':
        return 'Achievements & Recognition';
      case 'discipline':
        return 'Behavior & Discipline Registry';
      case 'feedback':
        return 'Complaints & Feedback';
      case 'attendance-settings':
        return 'Attendance Rules & Settings';
      case 'settings':
        return 'Settings';
      case 'teacher-dashboard':
        return 'Faculty Workspace';
      case 'teacher-classes':
        return 'Assigned Classes';
      case 'teacher-subjects':
        return 'Curriculum Subjects';
      case 'mark-entry':
        return 'Class Mark Entry & 30-Point CCE Matrix';
      case 'class-teacher-view':
        return 'Class Teacher Supervisory View';
      case 'student-dashboard':
        return 'Student Portal';
      case 'student-profile':
        return 'Personal Profile';
      case 'student-subjects':
        return 'Enrolled Subjects';
      case 'student-marks':
        return 'Evaluation Results & Grade Card';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header id="portal-navbar" className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-20 transition-colors duration-200 no-print">
      {/* Mobile Hamburger & Breadcrumb Hierarchy */}
      <div className="flex items-center gap-2 sm:gap-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md md:hidden cursor-pointer"
            aria-label="Toggle navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer hidden sm:inline text-slate-500 dark:text-slate-400 font-semibold tracking-tight">
          {dataService.getInstitutionSettings().shortName || 'DHDC Portal'}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 hidden sm:inline shrink-0" />
        <span className="text-slate-900 dark:text-white font-semibold truncate text-sm sm:text-base">
          {getSectionTitle(currentSection)}
        </span>
      </div>

      {/* Action Controls & Fast Demo Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Academic Year Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-slate-400 dark:text-slate-500 text-[11px] uppercase font-bold tracking-wider hidden md:inline">Year:</span>
          <select
            value={activeAcademicYear}
            onChange={(e) => setActiveAcademicYear(e.target.value)}
            className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer text-slate-800 dark:text-slate-100 outline-none"
          >
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.year} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {ay.year}
              </option>
            ))}
          </select>
        </div>

        {/* Current Authenticated User Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          {role === 'super_admin' ? (
            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Super Admin</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200">
                All Access
              </span>
            </div>
          ) : role === 'teacher' ? (
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold">
              <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Faculty: {currentUser?.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Student: {currentUser?.name}</span>
              {currentUser?.admissionNumber && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-200">
                  Ad.No: {currentUser.admissionNumber}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Light / Dark Mode Toggle Button */}
        <ThemeToggle showLabel={false} />

        {/* User Badges & Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
            title="Change Security Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          {role === 'super_admin' && (
            <button
              onClick={handleResetSeed}
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
              title="Reset Data to Seed Demo (Admin Only)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/80 rounded-md transition cursor-pointer"
            title="Sign Out to Login Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordMsg(null);
        }}
        title="Change Security Password"
        maxWidth="md"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              {passwordMsg.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
};
