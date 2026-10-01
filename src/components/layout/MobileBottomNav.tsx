import React from 'react';
import { Home, CalendarCheck, Award, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileBottomNavProps {
  currentSection: string;
  onSelectSection: (section: any) => void;
  onToggleMenu?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentSection,
  onSelectSection,
}) => {
  const { currentUser } = useAuth();
  const user = currentUser;

  // Determine target section for Home tab based on role
  const getHomeSection = () => {
    if (user?.role === 'student') return 'student-dashboard';
    if (user?.role === 'teacher') return 'teacher-dashboard';
    return 'admin-dashboard';
  };

  // Determine target section for CCE tab based on role
  const getCceSection = () => {
    if (user?.role === 'student') return 'student-marks';
    if (user?.role === 'teacher') return 'mark-entry';
    return 'evaluation-levels';
  };

  const isHomeActive =
    currentSection === 'admin-dashboard' ||
    currentSection === 'teacher-dashboard' ||
    currentSection === 'student-dashboard';
  const isAttendanceActive = currentSection === 'attendance';
  const isCceActive =
    currentSection === 'student-marks' ||
    currentSection === 'mark-entry' ||
    currentSection === 'evaluation-levels' ||
    currentSection === 'cce-grade-report';
  const isLeaveActive = currentSection === 'leaves';

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 safe-area-pb"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Home */}
        <button
          id="btn-mobile-nav-home"
          type="button"
          onClick={() => onSelectSection(getHomeSection())}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all active:scale-95 focus:outline-none ${
            isHomeActive
              ? 'text-emerald-700 font-semibold bg-emerald-50/80 shadow-xs'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
        >
          <Home className={`w-5 h-5 mb-0.5 ${isHomeActive ? 'text-emerald-700 stroke-[2.4]' : ''}`} />
          <span className="text-[11px] font-medium tracking-tight">Home</span>
        </button>

        {/* 2. Hajar (Attendance) */}
        <button
          id="btn-mobile-nav-hajar"
          type="button"
          onClick={() => onSelectSection('attendance')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all active:scale-95 focus:outline-none ${
            isAttendanceActive
              ? 'text-emerald-700 font-semibold bg-emerald-50/80 shadow-xs'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
        >
          <CalendarCheck className={`w-5 h-5 mb-0.5 ${isAttendanceActive ? 'text-emerald-700 stroke-[2.4]' : ''}`} />
          <span className="text-[11px] font-medium tracking-tight">Hajar</span>
        </button>

        {/* 3. CCE */}
        <button
          id="btn-mobile-nav-cce"
          type="button"
          onClick={() => onSelectSection(getCceSection())}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all active:scale-95 focus:outline-none ${
            isCceActive
              ? 'text-emerald-700 font-semibold bg-emerald-50/80 shadow-xs'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
        >
          <Award className={`w-5 h-5 mb-0.5 ${isCceActive ? 'text-emerald-700 stroke-[2.4]' : ''}`} />
          <span className="text-[11px] font-medium tracking-tight">CCE</span>
        </button>

        {/* 4. Leave */}
        <button
          id="btn-mobile-nav-leave"
          type="button"
          onClick={() => onSelectSection('leaves')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all active:scale-95 focus:outline-none ${
            isLeaveActive
              ? 'text-emerald-700 font-semibold bg-emerald-50/80 shadow-xs'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
        >
          <Clock className={`w-5 h-5 mb-0.5 ${isLeaveActive ? 'text-emerald-700 stroke-[2.4]' : ''}`} />
          <span className="text-[11px] font-medium tracking-tight">Leave</span>
        </button>
      </div>
    </nav>
  );
};
