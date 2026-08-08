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
    <div className="space-y-4 w-full pt-1 pb-2">
      {/* Môn học */}
      <div>
        <label className="block text-sm font-extrabold text-slate-800 mb-2 flex items-center">
          <BookOpen size={18} className="mr-1.5 text-blue-600" />
          Môn học:
        </label>
        
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {Object.values(Subject).map((s) => {
            const isActive = subject === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s as Subject)}
                className={`py-2 px-1 text-xs md:text-sm font-bold rounded-xl border transition-all text-center ${
                  isActive
                    ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white border-blue-700 shadow-[0_4px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none'
                    : 'bg-gradient-to-b from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 text-slate-700 border-slate-300 shadow-[0_4px_0_0_#cbd5e1] active:translate-y-1 active:shadow-none'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Khối lớp */}
      <div>
        <label className="block text-sm font-extrabold text-slate-800 mb-2 flex items-center">
          <GraduationCap size={18} className="mr-1.5 text-indigo-600" />
          Khối lớp:
        </label>
        
        {/* Nút bấm chọn nhanh Khối lớp */}
        <div className="grid grid-cols-6 gap-1.5 mb-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => {
            const isActive = grade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`py-2 text-sm font-extrabold rounded-xl border transition-all text-center ${
                  isActive
                    ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white border-blue-700 shadow-[0_4px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none'
                    : 'bg-gradient-to-b from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 text-slate-700 border-slate-300 shadow-[0_4px_0_0_#cbd5e1] active:translate-y-1 active:shadow-none'
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

