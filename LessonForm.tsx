import React from 'react';
import { Subject } from '../types';
import { ChevronDown } from 'lucide-react';

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
  return (
    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2">
      <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider block border-b border-slate-200 pb-1">
        Bước 1: Chọn môn & lớp
      </span>
      
      <div className="flex gap-3 pt-1">
        {/* Môn học */}
        <div className="flex-1">
          <label className="block text-sm text-slate-700 mb-1.5 font-medium">
            Môn học
          </label>
          <div className="relative">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-slate-700 bg-white appearance-none pr-8 text-sm transition-all shadow-sm"
            >
              {Object.values(Subject).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-600 pointer-events-none" strokeWidth={2.5} />
          </div>
        </div>

        {/* Khối lớp */}
        <div className="flex-1">
          <label className="block text-sm text-slate-700 mb-1.5 font-medium">
            Khối lớp
          </label>
          <div className="relative">
            <select
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-slate-700 bg-white appearance-none pr-8 text-sm transition-all shadow-sm"
            >
              {[...Array(12)].map((_, i) => {
                const g = i + 1;
                return (
                  <option key={g} value={g}>
                    Lớp {g}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={16} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-600 pointer-events-none" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonForm;

