import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, type NavSection } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { dataService } from './services/db';
import { AlertTriangle } from 'lucide-react';

// Admin Views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StudentManagement } from './components/admin/StudentManagement';
import { TeacherManagement } from './components/admin/TeacherManagement';
import { ClassManagement } from './components/admin/ClassManagement';
import { SubjectManagement } from './components/admin/SubjectManagement';
import { EvaluationLevelManagement } from './components/admin/EvaluationLevelManagement';
import { ExcelImportView } from './components/admin/ExcelImportView';
import { ReportsView } from './components/admin/ReportsView';
import { AuditLogView } from './components/admin/AuditLogView';
import { SettingsView } from './components/admin/SettingsView';

// College Operations Views
import { AttendanceLeaveView } from './components/attendance/AttendanceLeaveView';
import { LeaveManagementView } from './components/leaves/LeaveManagementView';
import { TimetableManagementView } from './components/timetable/TimetableManagementView';
import { AchievementsView } from './components/achievements/AchievementsView';
import { BehaviorDisciplineView } from './components/discipline/BehaviorDisciplineView';
import { ComplaintsFeedbackView } from './components/feedback/ComplaintsFeedbackView';
import { AttendanceSettingsView } from './components/attendance/AttendanceSettingsView';
import { ShowcaseManagementView } from './components/showcase/ShowcaseManagementView';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

// Teacher Views
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { TeacherClassesView } from './components/teacher/TeacherClassesView';
import { TeacherSubjectsView } from './components/teacher/TeacherSubjectsView';
import { ClassTeacherView } from './components/teacher/ClassTeacherView';
import { MarkEntryView } from './components/marks/MarkEntryView';

// Student Views
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentProfileView } from './components/student/StudentProfileView';
import { StudentSubjectsView } from './components/student/StudentSubjectsView';
import { StudentMarksView } from './components/student/StudentMarksView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';

const MainLayout: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [currentSection, setCurrentSection] = useState<NavSection>('admin-dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(dataService.getSyncError());

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setSyncError(dataService.getSyncError());
    });
    return unsub;
  }, []);

  // Sync default section when role changes
  useEffect(() => {
    if (role === 'super_admin') {
      setCurrentSection('admin-dashboard');
    } else if (role === 'teacher') {
      setCurrentSection('teacher-dashboard');
    } else if (role === 'student') {
      setCurrentSection('student-dashboard');
    }
  }, [role]);

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      {/* Sidebar with Mobile Drawer support */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header / Navbar */}
        <Navbar
          currentSection={currentSection}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Real-time Cloud Quota / Sync Status Notice Ribbon */}
        {syncError && (
          <div className="bg-amber-500/10 dark:bg-amber-950/70 border-b border-amber-300 dark:border-amber-800/80 px-4 py-2 text-xs flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shrink-0 print:hidden animate-fadeIn">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="p-1 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <span className="font-medium text-[11px] truncate">
                <strong>Google Cloud Firestore Daily Read Quota Exceeded:</strong> Stored data is safe in Cloud & local cache. Reads will resume when quota resets, or you can manage/upgrade in Settings.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentSection('settings')}
              className="text-[11px] font-bold underline text-amber-900 dark:text-amber-100 hover:text-amber-950 shrink-0 cursor-pointer"
            >
              Settings & Backup
            </button>
          </div>
        )}

        {/* Scrollable Dynamic Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <div className="max-w-7xl w-full mx-auto">
            <ErrorBoundary>
              {/* Admin Views */}
              {currentSection === 'admin-dashboard' && (
                <AdminDashboard onNavigate={setCurrentSection} />
              )}
              {currentSection === 'students' && <StudentManagement />}
              {currentSection === 'teachers' && <TeacherManagement />}
              {currentSection === 'classes' && <ClassManagement />}
              {currentSection === 'subjects' && <SubjectManagement />}
              {currentSection === 'spotlight-toppers' && <ShowcaseManagementView />}
              {currentSection === 'evaluation-levels' && (
                <EvaluationLevelManagement onNavigate={setCurrentSection} />
              )}
              {currentSection === 'settings' && <SettingsView />}
              {currentSection === 'excel-import' && <ExcelImportView />}
              {currentSection === 'reports' && <ReportsView />}
              {currentSection === 'audit-logs' && <AuditLogView />}

              {/* Shared College Operations Views */}
              {currentSection === 'attendance' && <AttendanceLeaveView />}
              {currentSection === 'leaves' && <LeaveManagementView />}
              {currentSection === 'timetable' && <TimetableManagementView />}
              {currentSection === 'achievements' && <AchievementsView />}
              {currentSection === 'discipline' && <BehaviorDisciplineView />}
              {currentSection === 'feedback' && <ComplaintsFeedbackView />}
              {currentSection === 'attendance-settings' && <AttendanceSettingsView />}

              {/* Teacher Views */}
              {currentSection === 'teacher-dashboard' && (
                <TeacherDashboard onNavigate={setCurrentSection} />
              )}
              {currentSection === 'teacher-classes' && <TeacherClassesView />}
              {currentSection === 'teacher-subjects' && (
                <TeacherSubjectsView onNavigate={setCurrentSection} />
              )}
              {currentSection === 'mark-entry' && <MarkEntryView />}
              {currentSection === 'class-teacher-view' && <ClassTeacherView />}

              {/* Student Views */}
              {currentSection === 'student-dashboard' && (
                <StudentDashboard onNavigate={setCurrentSection} />
              )}
              {currentSection === 'student-profile' && <StudentProfileView />}
              {currentSection === 'student-subjects' && (
                <StudentSubjectsView onNavigate={setCurrentSection} />
              )}
              {currentSection === 'student-marks' && <StudentMarksView />}
            </ErrorBoundary>
          </div>
        </main>

        {/* Mobile App-style Bottom Navigation Bar */}
        <MobileBottomNav
          currentSection={currentSection}
          onSelectSection={setCurrentSection}
          onToggleMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
        <PWAInstallPrompt />
      </AuthProvider>
    </ThemeProvider>
  );
}
