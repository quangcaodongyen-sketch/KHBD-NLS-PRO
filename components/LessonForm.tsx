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
    <div className="grid grid-cols-2 gap-2 w-full">
      <div>
        <label className="block text-[11px] font-bold text-slate-600 mb-1">Môn học</label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as Subject)}
          className="w-full bg-white rounded-xl border border-slate-300 py-1.5 px-2.5 text-xs font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          {Object.values(Subject).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-600 mb-1">Khối lớp</label>
        <select
          value={grade}
          onChange={(e) => setGrade(Number(e.target.value))}
          className="w-full bg-white rounded-xl border border-slate-300 py-1.5 px-2.5 text-xs font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
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
