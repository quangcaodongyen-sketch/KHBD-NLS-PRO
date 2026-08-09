import React, { useState } from 'react';
import { Subject } from '../types';
import { ChevronDown, ChevronUp, BookOpen, GraduationCap, Layers } from 'lucide-react';

interface LessonFormProps {
  subject: Subject;
  setSubject: (val: Subject) => void;
  grade: number;
  setGrade: (val: number) => void;
}

const LessonForm: React.FC<LessonFormProps> = ({
  subject,
  setSubject,
  grade,
  setGrade,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Derive level from grade
  const getLevel = (g: number) => {
    if (g <= 5) return 'TH';
    if (g <= 9) return 'THCS';
    return 'THPT';
  };

  const currentLevel = getLevel(grade);

  const handleLevelChange = (level: string) => {
    if (level === 'TH') setGrade(5);
    else if (level === 'THCS') setGrade(6);
    else if (level === 'THPT') setGrade(10);
  };

  const getGradesForLevel = (level: string) => {
    if (level === 'TH') return [1, 2, 3, 4, 5];
    if (level === 'THCS') return [6, 7, 8, 9];
    if (level === 'THPT') return [10, 11, 12];
    return [];
  };

  return (
    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-3 transition-all duration-300">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider">
          Bước 1: Chọn môn & lớp
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-blue-200 text-blue-700 font-bold text-[11px] md:text-xs rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
        >
          <span className="truncate max-w-[120px]">{subject} - Lớp {grade}</span>
          {isOpen ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 pb-1">
          
          {/* Cấp học */}
          <div>
            <div className="flex items-center space-x-1.5 mb-2">
              <GraduationCap size={14} className="text-blue-600" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Cấp học</span>
            </div>
            <div className="flex p-1 bg-slate-200/70 rounded-lg">
              {['TH', 'THCS', 'THPT'].map((level) => {
                const labels: any = { TH: 'Tiểu học', THCS: 'THCS', THPT: 'THPT' };
                const isActive = currentLevel === level;
                return (
                  <button
                    key={level}
                    onClick={() => handleLevelChange(level)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      isActive 
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    {labels[level]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khối lớp */}
          <div>
            <div className="flex items-center space-x-1.5 mb-2">
              <Layers size={14} className="text-blue-600" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Khối lớp</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {getGradesForLevel(currentLevel).map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`w-[38px] h-[38px] flex items-center justify-center rounded-xl text-xs font-bold transition-all border ${
                    grade === g
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Môn học */}
          <div>
            <div className="flex items-center space-x-1.5 mb-2">
              <BookOpen size={14} className="text-blue-600" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Môn học</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(Subject).map((s) => {
                const isActive = subject === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={`p-1.5 text-center rounded-xl transition-all border flex flex-col items-center justify-center min-h-[48px] ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <span className="text-[10px] font-bold leading-[1.2]">{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default LessonForm;

