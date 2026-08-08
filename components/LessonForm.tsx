import React from 'react';
import { Subject } from '../types';
import { BookOpen, GraduationCap } from 'lucide-react';

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
    <div className="space-y-2.5 w-full">
      {/* Môn học */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span className="flex items-center text-blue-900">
            <BookOpen size={13} className="mr-1 text-blue-600" />
            Môn học:
          </span>
          <span className="text-[10px] text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            {subject}
          </span>
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as Subject)}
          className="w-full bg-slate-50 hover:bg-white rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white shadow-sm transition-all cursor-pointer"
        >
          {Object.values(Subject).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Khối lớp */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span className="flex items-center text-blue-900">
            <GraduationCap size={13} className="mr-1 text-indigo-600" />
            Khối lớp:
          </span>
          <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            Lớp {grade}
          </span>
        </label>
        
        {/* Nút bấm chọn nhanh Khối lớp (Scrollable / Grid) */}
        <div className="grid grid-cols-6 gap-1 mb-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => {
            const isActive = grade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`py-1 text-[11px] font-extrabold rounded-lg border transition-all text-center ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LessonForm;

