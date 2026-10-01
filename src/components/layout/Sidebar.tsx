import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/db';
import { hasPermission } from '../../utils/permissions';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  Sliders,
  FileSpreadsheet,
  FileText,
  History,
  CheckSquare,
  ShieldCheck,
  User,
  Award,
  LogOut,
  Settings,
  Database,
  X,
  Calendar,
  CalendarCheck,
  Clock,
  Trophy,
  ShieldAlert,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export type NavSection =
  | 'admin-dashboard'
  | 'students'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'spotlight-toppers'
  | 'attendance'
  | 'leaves'
  | 'timetable'
  | 'achievements'
  | 'discipline'
  | 'feedback'
  | 'evaluation-levels'
  | 'attendance-settings'
  | 'settings'
  | 'excel-import'
  | 'reports'
  | 'audit-logs'
  // Teacher
  | 'teacher-dashboard'
  | 'teacher-classes'
  | 'teacher-subjects'
  | 'mark-entry'
  | 'class-teacher-view'
  // Student
  | 'student-dashboard'
  | 'student-profile'
  | 'student-subjects'
  | 'student-marks';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { currentUser, role, isClassTeacher, logout } = useAuth();

  const handleSelect = (section: NavSection) => {
    onSelectSection(section);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = () => {
    if (role === 'super_admin') return 'Super Administrator';
    if (role === 'teacher') return isClassTeacher ? 'Class & Subject Teacher' : 'Subject Teacher';
    if (role === 'student') return 'Enrolled Student';
    return 'Authorized User';
  };

  const renderNavItems = () => {
    if (role === 'super_admin') {
      return (
        <>
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider mb-2 px-3">
            Administration
          </div>
          <NavItem
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            active={currentSection === 'admin-dashboard'}
            onClick={() => handleSelect('admin-dashboard')}
          />
          <NavItem
            icon={<Users className="w-5 h-5" />}
            label="Students"
            active={currentSection === 'students'}
            onClick={() => handleSelect('students')}
          />
          <NavItem
            icon={<GraduationCap className="w-5 h-5" />}
            label="Teachers"
            active={currentSection === 'teachers'}
            onClick={() => handleSelect('teachers')}
          />
          <NavItem
            icon={<School className="w-5 h-5" />}
            label="Classes"
            active={currentSection === 'classes'}
            onClick={() => handleSelect('classes')}
          />
          <NavItem
            icon={<BookOpen className="w-5 h-5" />}
            label="Subjects"
            active={currentSection === 'subjects'}
            onClick={() => handleSelect('subjects')}
          />
          <NavItem
            icon={<Calendar className="w-5 h-5 text-indigo-400" />}
            label="Timetable & Schedule"
            active={currentSection === 'timetable'}
            onClick={() => handleSelect('timetable')}
          />
          <NavItem
            icon={<Sparkles className="w-5 h-5 text-amber-500" />}
            label="Spotlight & Toppers"
            active={currentSection === 'spotlight-toppers'}
            onClick={() => handleSelect('spotlight-toppers')}
          />

          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider mt-5 mb-2 px-3">
            College Operations
          </div>
          <NavItem
            icon={<CalendarCheck className="w-5 h-5" />}
            label="Attendance (Hajar)"
            active={currentSection === 'attendance'}
            onClick={() => handleSelect('attendance')}
          />
          <NavItem
            icon={<Clock className="w-5 h-5" />}
            label="Leave Applications"
            active={currentSection === 'leaves'}
            onClick={() => handleSelect('leaves')}
          />
          <NavItem
            icon={<Calendar className="w-5 h-5" />}
            label="Timetable & Schedule"
            active={currentSection === 'timetable'}
            onClick={() => handleSelect('timetable')}
          />
          <NavItem
            icon={<Trophy className="w-5 h-5" />}
            label="Achievements"
            active={currentSection === 'achievements'}
            onClick={() => handleSelect('achievements')}
          />
          <NavItem
            icon={<ShieldAlert className="w-5 h-5" />}
            label="Behavior & Discipline"
            active={currentSection === 'discipline'}
            onClick={() => handleSelect('discipline')}
          />
          <NavItem
            icon={<MessageSquare className="w-5 h-5" />}
            label="Complaints & Feedback"
            active={currentSection === 'feedback'}
            onClick={() => handleSelect('feedback')}
          />

          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider mt-5 mb-2 px-3">
            Academics & Settings
          </div>
          <NavItem
            icon={<Sliders className="w-5 h-5" />}
            label="Evaluation Levels"
            active={currentSection === 'evaluation-levels'}
            onClick={() => handleSelect('evaluation-levels')}
          />
          <NavItem
            icon={<Settings className="w-5 h-5" />}
            label="Attendance Settings"
            active={currentSection === 'attendance-settings'}
            onClick={() => handleSelect('attendance-settings')}
          />
          <NavItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            active={currentSection === 'settings'}
            onClick={() => handleSelect('settings')}
          />

          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider mt-5 mb-2 px-3">
            Data & Reports
          </div>
          <NavItem
            icon={<FileSpreadsheet className="w-5 h-5" />}
            label="Excel Import"
            active={currentSection === 'excel-import'}
            onClick={() => handleSelect('excel-import')}
          />
          <NavItem
            icon={<FileText className="w-5 h-5" />}
            label="Reports"
            active={currentSection === 'reports'}
            onClick={() => handleSelect('reports')}
          />
          <NavItem
            icon={<History className="w-5 h-5" />}
            label="Audit Logs"
            active={currentSection === 'audit-logs'}
            onClick={() => handleSelect('audit-logs')}
          />
        </>
      );
    }

    if (role === 'teacher') {
      return (
        <>
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider mb-2 px-3">
            Main Menu
          </div>
          <NavItem
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            active={currentSection === 'teacher-dashboard'}
            onClick={() => handleSelect('teacher-dashboard')}
          />
          <NavItem
            icon={<CalendarCheck className="w-5 h-5" />}
            label="Attendance (Hajar)"
            active={currentSection === 'attendance'}
            onClick={() => handleSelect('attendance')}
          />
          <NavItem
            icon={<Clock className="w-5 h-5" />}
            label="Leave Applications"
            active={currentSection === 'leaves'}
            onClick={() => handleSelect('leaves')}
          />
          <NavItem
            icon={<Calendar className="w-5 h-5" />}
            label="Timetable & Schedule"
            active={currentSection === 'timetable'}
            onClick={() => handleSelect('timetable')}
          />
          <NavItem
            icon={<Trophy className="w-5 h-5" />}
            label="Achievements"
            active={currentSection === 'achievements'}
            onClick={() => handleSelect('achievements')}
          />
          <NavItem
            icon={<ShieldAlert className="w-5 h-5" />}
            label="Discipline Registry"
            active={currentSection === 'discipline'}
            onClick={() => handleSelect('discipline')}
          />
          <NavItem
            icon={<MessageSquare className="w-5 h-5" />}
            label="Complaints & Feedback"
            active={currentSection === 'feedback'}
            onClick={() => handleSelect('feedback')}
          />
          <NavItem
            icon={<BookOpen className="w-5 h-5" />}
            label="My Subjects"
            active={currentSection === 'teacher-subjects'}
            onClick={() => handleSelect('teacher-subjects')}
          />
          <NavItem
            icon={<School className="w-5 h-5" />}
            label="My Classes"
            active={currentSection === 'teacher-classes'}
            onClick={() => handleSelect('teacher-classes')}
          />
          <NavItem
            icon={<CheckSquare className="w-5 h-5" />}
            label="Mark Entry"
            active={currentSection === 'mark-entry'}
            onClick={() => handleSelect('mark-entry')}
          />
          <NavItem
            icon={<Sliders className="w-5 h-5" />}
            label="Evaluation Levels"
            active={currentSection === 'evaluation-levels'}
            onClick={() => handleSelect('evaluation-levels')}
          />

          {isClassTeacher && (
            <>
              <div className="text-amber-400/90 text-[10px] uppercase font-semibold tracking-wider mt-5 mb-2 px-3 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Class Teacher Portal
              </div>
              <NavItem
                icon={<ShieldCheck className="w-5 h-5 text-amber-400" />}
                label="Class Teacher View"
                active={currentSection === 'class-teacher-view'}
                onClick={() => handleSelect('class-teacher-view')}
              />
            </>
          )}

          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider mt-5 mb-2 px-3">
            Reporting
          </div>
          <NavItem
            icon={<FileText className="w-5 h-5" />}
            label="Reports"
            active={currentSection === 'reports'}
            onClick={() => handleSelect('reports')}
          />
          {hasPermission(currentUser, 'showcase_manage', dataService.getState()) && (
            <NavItem
              icon={<Sparkles className="w-5 h-5 text-amber-500" />}
              label="Spotlight & Toppers"
              active={currentSection === 'spotlight-toppers'}
              onClick={() => handleSelect('spotlight-toppers')}
            />
          )}
        </>
      );
    }

    if (role === 'student') {
      return (
        <>
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider mb-2 px-3">
            Student Portal
          </div>
          <NavItem
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            active={currentSection === 'student-dashboard'}
            onClick={() => handleSelect('student-dashboard')}
          />
          <NavItem
            icon={<User className="w-5 h-5" />}
            label="My Profile & Dossier"
            active={currentSection === 'student-profile'}
            onClick={() => handleSelect('student-profile')}
          />
          <NavItem
            icon={<CalendarCheck className="w-5 h-5" />}
            label="Attendance (Hajar)"
            active={currentSection === 'attendance'}
            onClick={() => handleSelect('attendance')}
          />
          <NavItem
            icon={<Clock className="w-5 h-5" />}
            label="Leave Applications"
            active={currentSection === 'leaves'}
            onClick={() => handleSelect('leaves')}
          />
          <NavItem
            icon={<Calendar className="w-5 h-5" />}
            label="Class Timetable"
            active={currentSection === 'timetable'}
            onClick={() => handleSelect('timetable')}
          />
          <NavItem
            icon={<Trophy className="w-5 h-5" />}
            label="Achievements & Awards"
            active={currentSection === 'achievements'}
            onClick={() => handleSelect('achievements')}
          />
          <NavItem
            icon={<MessageSquare className="w-5 h-5" />}
            label="Complaints & Feedback"
            active={currentSection === 'feedback'}
            onClick={() => handleSelect('feedback')}
          />
          <NavItem
            icon={<BookOpen className="w-5 h-5" />}
            label="My Subjects"
            active={currentSection === 'student-subjects'}
            onClick={() => handleSelect('student-subjects')}
          />
          <NavItem
            icon={<Award className="w-5 h-5" />}
            label="My Marks"
            active={currentSection === 'student-marks'}
            onClick={() => handleSelect('student-marks')}
          />
        </>
      );
    }

    return null;
  };

  const sidebarBody = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header matching Professional Polish Design */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-sm shadow-indigo-500/30 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white font-bold text-base tracking-tight truncate">DHDC Portal</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide truncate">College Main Portal</span>
          </div>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 md:hidden cursor-pointer shrink-0"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {renderNavItems()}
      </nav>

      {/* System Status Indicator */}
      <div className="px-4 py-2.5 border-t border-slate-800/60 bg-slate-900/90 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          CCE Engine Active
        </span>
        <span className="font-mono text-indigo-400 text-[10px] font-semibold bg-slate-800/80 px-2 py-0.5 rounded">
          Factor: 30
        </span>
      </div>

      {/* User Profile Card matching Professional Polish footer */}
      <div className="p-3.5 border-t border-slate-800 flex items-center justify-between gap-2.5 text-slate-300 bg-slate-950/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-indigo-900 rounded-full border border-indigo-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {getInitials(currentUser?.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-white truncate">{currentUser?.name || 'User'}</span>
            <span className="text-[10px] text-slate-400 truncate">{getRoleLabel()}</span>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside id="portal-sidebar" className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0 min-h-screen text-slate-300 no-print">
        {sidebarBody}
      </aside>

      {/* Mobile Slide-over Drawer with Backdrop */}
      {isOpenMobile && (
        <div id="mobile-sidebar-drawer" className="fixed inset-0 z-50 md:hidden flex no-print" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'text-white bg-slate-800 font-semibold'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}
    >
      <span className={active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
};

