import React, { useState, useMemo } from 'react';
import {
  AchievementRecord,
  AchievementCategory,
  Student,
  ClassRoom,
} from '../../types';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  Trophy,
  Medal,
  Star,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  X,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const AchievementsView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [category, setCategory] = useState<AchievementCategory>('award');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuer, setIssuer] = useState('');
  const [level, setLevel] = useState<'institutional' | 'zonal' | 'state' | 'national' | 'international'>('institutional');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');

  const canManage = role === 'super_admin' || role === 'teacher';

  const filteredAchievements = useMemo(() => {
    return state.achievements.filter((ach) => {
      const stu = state.students.find((s) => s.id === ach.studentId);
      if (!stu) return false;

      // Category filter
      if (selectedCategory !== 'all' && ach.category !== selectedCategory) {
        return false;
      }

      // Class filter
      if (selectedClassId !== 'all' && stu.classId !== selectedClassId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ach.title.toLowerCase().includes(q);
        const matchStudent = stu.name.toLowerCase().includes(q) || stu.admissionNumber.toLowerCase().includes(q);
        const matchIssuer = (ach.issuer || '').toLowerCase().includes(q);
        if (!matchTitle && !matchStudent && !matchIssuer) return false;
      }

      return true;
    });
  }, [state.achievements, state.students, selectedCategory, selectedClassId, searchQuery]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !title.trim()) return;

    dataService.addAchievement(
      {
        studentId: targetStudentId,
        category,
        title: title.trim(),
        date,
        awardedBy: issuer.trim() || 'DHDC College',
        issuer: issuer.trim() || 'DHDC College',
        level,
        positionPrize: position.trim() || undefined,
        position: position.trim() || undefined,
        description: description.trim() || '',
      },
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );

    setShowAddModal(false);
    setTitle('');
    setDescription('');
    setIssuer('');
    setPosition('');
    setRerender((v) => v + 1);
  };

  const getCategoryIcon = (cat: AchievementCategory) => {
    switch (cat) {
      case 'award':
        return <Award className="w-5 h-5 text-amber-500" />;
      case 'competition':
        return <Trophy className="w-5 h-5 text-indigo-500" />;
      case 'sports':
        return <Medal className="w-5 h-5 text-emerald-500" />;
      case 'arts_cultural':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'special_recognition':
        return <Star className="w-5 h-5 text-rose-500" />;
      default:
        return <Award className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-500" />
            Student Achievements & Honors Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Institutional honors, awards, competitions, sports, arts & cultural distinctions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Record Achievement
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Roll of Honor
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Category tabs */}
          {[
            { id: 'all', label: 'All Distinctions' },
            { id: 'award', label: 'Awards' },
            { id: 'competition', label: 'Competitions' },
            { id: 'certificate', label: 'Certificates' },
            { id: 'sports', label: 'Sports' },
            { id: 'arts_cultural', label: 'Arts & Cultural' },
            { id: 'special_recognition', label: 'Special Recognitions' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                selectedCategory === c.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          >
            <option value="all">All Classes</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Achievements Cards Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs">
          No achievements recorded matching the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((ach) => {
            const stu = state.students.find((s) => s.id === ach.studentId);
            const cls = stu ? state.classes.find((c) => c.id === stu.classId) : null;

            return (
              <div
                key={ach.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800">
                      {getCategoryIcon(ach.category)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ach.level && <Badge variant="info">{ach.level.toUpperCase()}</Badge>}
                      {(ach.position || ach.positionPrize) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200">
                          {ach.position || ach.positionPrize}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {ach.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Issued by: <strong className="text-slate-700 dark:text-slate-300">{ach.issuer || ach.awardedBy || 'DHDC College'}</strong>
                    </p>
                  </div>

                  {ach.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                      "{ach.description}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {stu?.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {cls?.name || 'Unassigned'} • Adm: {stu?.admissionNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {ach.date}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete achievement "${ach.title}"?`)) {
                            dataService.deleteAchievement(
                              ach.id,
                              currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
                            );
                            setRerender((v) => v + 1);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: RECORD ACHIEVEMENT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Record Student Achievement</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Student *
                </label>
                <select
                  required
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="">-- Choose Student --</option>
                  {state.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="award">Award</option>
                    <option value="competition">Competition</option>
                    <option value="certificate">Certificate</option>
                    <option value="sports">Sports Achievement</option>
                    <option value="arts_cultural">Arts / Cultural</option>
                    <option value="special_recognition">Special Recognition</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Competition / Award Level *
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="institutional">College / Institutional</option>
                    <option value="zonal">Zonal / District</option>
                    <option value="state">State Level</option>
                    <option value="national">National Level</option>
                    <option value="international">International Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Achievement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1st Prize in State Level Debate"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Position / Rank</label>
                  <input
                    type="text"
                    placeholder="e.g. Winner / 1st Place"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Issuer / Host</label>
                  <input
                    type="text"
                    placeholder="e.g. Kerala University"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief details or citation of the honor..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Achievement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
