import React from 'react';
import { Subject } from '../types';

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
    <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
      <div className="flex items-center space-x-1 pl-2 text-xs font-bold text-slate-700">
        <span>Môn:</span>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as Subject)}
          className="bg-white rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          {Object.values(Subject).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
        <span>Khối:</span>
        <select
          value={grade}
          onChange={(e) => setGrade(Number(e.target.value))}
          className="bg-white rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>Lớp {g}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LessonForm;
