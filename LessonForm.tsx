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
    <div className="w-full mb-6 mt-2">
      <div className="flex items-center mb-4 border-l-4 border-blue-600 pl-3">
        <h3 className="text-lg font-semibold text-slate-800">Thông tin Kế hoạch bài dạy</h3>
      </div>
      
      <div className="flex gap-4">
        {/* Môn học */}
        <div className="flex-1">
          <label className="block text-sm text-slate-700 mb-1.5">
            Môn học
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 bg-slate-50"
          >
            {Object.values(Subject).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Khối lớp */}
        <div className="flex-1">
          <label className="block text-sm text-slate-700 mb-1.5">
            Khối lớp
          </label>
          <select
            value={grade}
            onChange={(e) => setGrade(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 bg-slate-50"
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
        </div>
      </div>
    </div>
  );
};

export default LessonForm;

