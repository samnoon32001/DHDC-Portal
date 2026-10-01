import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Medal,
  Star,
  Search,
  X,
  GraduationCap,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { ShowcaseCard } from '../../types';

interface ClassToppersModalProps {
  isOpen: boolean;
  onClose: () => void;
  classToppers: ShowcaseCard[];
  examName?: string;
  onSelectStudent?: (studentAdmissionNumber?: string) => void;
}

export const ClassToppersModal: React.FC<ClassToppersModalProps> = ({
  isOpen,
  onClose,
  classToppers,
  examName = "Rabee' Semester Examination 2026-27",
  onSelectStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');

  // Extract unique sections / categories from class toppers
  const sections = useMemo(() => {
    const set = new Set<string>();
    classToppers.forEach((c) => {
      if (c.sectionOrClass) set.add(c.sectionOrClass);
    });
    return Array.from(set);
  }, [classToppers]);

  const filteredToppers = useMemo(() => {
    return classToppers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.studentName.toLowerCase().includes(q) ||
        (c.studentAdmissionNumber && c.studentAdmissionNumber.toLowerCase().includes(q)) ||
        c.sectionOrClass.toLowerCase().includes(q) ||
        (c.badgeText && c.badgeText.toLowerCase().includes(q));

      const matchesSection =
        selectedSectionFilter === 'all' || c.sectionOrClass === selectedSectionFilter;

      return matchesSearch && matchesSection;
    });
  }, [classToppers, searchQuery, selectedSectionFilter]);

  if (!isOpen) return null;

  return (
    <div
      id="class-toppers-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="class-toppers-modal-dialog"
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="relative overflow-hidden px-4 py-4 sm:px-8 sm:py-6 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white shrink-0">
          <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
            <Trophy className="w-32 h-32 sm:w-48 sm:h-48 text-white" />
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold text-amber-50 tracking-wide uppercase mb-1.5">
                <Sparkles className="w-3 h-3 text-yellow-200" />
                Honor Roll & Class Distinction
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Class Academic Toppers
              </h2>
              <p className="text-[11px] sm:text-sm text-amber-100 mt-0.5 sm:mt-1 max-w-xl font-medium">
                Top ranked students across each class for {examName}.
              </p>
            </div>

            <button
              id="close-class-toppers-modal-btn"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Stats Pill Bar */}
          <div className="flex items-center gap-1.5 sm:gap-3 mt-2.5 sm:mt-4 text-[10px] sm:text-xs font-semibold text-amber-100 flex-wrap">
            <span className="bg-black/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg">
              Toppers: <strong className="text-white font-bold">{classToppers.length}</strong>
            </span>
            <span className="bg-black/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg">
              Highest: <strong className="text-white font-bold">99.0%</strong>
            </span>
            <span className="bg-black/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg hidden xs:inline">
              Session: <strong className="text-white font-bold">2026-27</strong>
            </span>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-class-toppers-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, admission #, or class..."
              className="w-full pl-8 sm:pl-10 pr-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {sections.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedSectionFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedSectionFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                All Classes ({classToppers.length})
              </button>
              {sections.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSectionFilter(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedSectionFilter === sec
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toppers Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-slate-950/40">
          {filteredToppers.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No class toppers found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try adjusting your search criteria or filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredToppers.map((card, idx) => {
                const isVeryTop = idx === 0 && selectedSectionFilter === 'all';
                return (
                  <div
                    key={card.id}
                    id={`class-topper-card-${card.id}`}
                    className="relative bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group overflow-hidden"
                  >
                    {/* Top Ribbon Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        {card.sectionOrClass || 'Class Topper'}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                        {card.percentage}
                      </span>
                    </div>

                    {/* Student Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative shrink-0">
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.studentName}
                            referrerPolicy="no-referrer"
                            className="w-13 h-13 rounded-full object-cover border-2 border-amber-400 shadow-sm"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                            {card.studentName.charAt(0)}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow">
                          #1
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {card.studentName}
                        </h4>
                        {card.studentAdmissionNumber && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            Adm No: {card.studentAdmissionNumber}
                          </p>
                        )}
                        {card.scoreDetails && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {card.scoreDetails}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description quote if present */}
                    {card.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2 mb-3 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        "{card.description}"
                      </p>
                    )}

                    {/* Card Footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate">{card.examName || examName}</span>
                      <div className="flex items-center gap-1 text-amber-500 font-semibold">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>Class Rank 1</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official Academic Results • Verified by Examination Board
          </p>
          <button
            id="dismiss-class-toppers-modal-btn"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
