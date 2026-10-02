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
  const isAttendanceActive =
    currentSection === 'attendance' || currentSection === 'attendance-settings';
  const isCceActive =
    currentSection === 'student-marks' ||
    currentSection === 'mark-entry' ||
    currentSection === 'evaluation-levels' ||
    currentSection === 'cce-grade-report';
  const isLeaveActive = currentSection === 'leaves';

  const navItems = [
    {
      id: 'btn-mobile-nav-home',
      label: 'Home',
      icon: Home,
      isActive: isHomeActive,
      onClick: () => onSelectSection(getHomeSection()),
    },
    {
      id: 'btn-mobile-nav-hajar',
      label: 'Hajar',
      icon: CalendarCheck,
      isActive: isAttendanceActive,
      onClick: () => onSelectSection('attendance'),
    },
    {
      id: 'btn-mobile-nav-cce',
      label: 'CCE',
      icon: Award,
      isActive: isCceActive,
      onClick: () => onSelectSection(getCceSection()),
    },
    {
      id: 'btn-mobile-nav-leave',
      label: 'Leave',
      icon: Clock,
      isActive: isLeaveActive,
      onClick: () => onSelectSection('leaves'),
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm sm:max-w-md bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl border border-slate-200/80 dark:border-neutral-800 rounded-full shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] px-2 py-2 safe-area-pb transition-all duration-300"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={item.id}
              type="button"
              onClick={item.onClick}
              className="group relative flex flex-col items-center justify-center flex-1 py-1 focus:outline-none select-none transition-transform active:scale-95 cursor-pointer"
            >
              {/* Capsule icon container */}
              <div
                className={`w-14 sm:w-16 h-8 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                  item.isActive
                    ? 'bg-slate-100 dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-transparent text-slate-400 dark:text-neutral-400 group-hover:text-slate-700 dark:group-hover:text-neutral-200 group-hover:bg-slate-50 dark:group-hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    item.isActive
                      ? 'stroke-[2.2] scale-105'
                      : 'stroke-[1.8]'
                  }`}
                />
              </div>

              {/* Text label */}
              <span
                className={`text-[11px] font-medium tracking-tight mt-1 transition-colors duration-200 ${
                  item.isActive
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-400 dark:text-neutral-400 group-hover:text-slate-600 dark:group-hover:text-neutral-300'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
