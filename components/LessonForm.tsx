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
        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center">
          <BookOpen size={13} className="mr-1 text-blue-600" />
          Môn học:
        </label>
        
        <div className="grid grid-cols-4 gap-1 mb-2">
          {Object.values(Subject).map((s) => {
            const isActive = subject === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s as Subject)}
                className={`py-1.5 px-1 text-[10px] font-extrabold rounded-lg border transition-all text-center ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
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
        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center">
          <GraduationCap size={13} className="mr-1 text-indigo-600" />
          Khối lớp:
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

