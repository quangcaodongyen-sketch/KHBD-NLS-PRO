import React from 'react';
import { GraduationCap, Settings, User, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenSettings: () => void;
  apiKeySet?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, apiKeySet = true }) => {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-xl border-b border-indigo-400/30 sticky top-0 z-40 w-full">
      <div className="w-full px-4 md:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="p-2 bg-gradient-to-br from-white/20 to-white/5 rounded-xl shadow-inner group-hover:scale-105 transition-transform border border-white/10">
            <GraduationCap size={28} className="text-blue-100 drop-shadow-md" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 drop-shadow-md">
              SOẠN GIÁO ÁN NĂNG LỰC SỐ
            </h1>
            <span className="hidden md:inline text-xs md:text-sm text-blue-200/90 font-medium tracking-wide">
              Chuẩn NLS Bộ GD&ĐT • Đinh Văn Thành (0915.213717)
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-b from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 rounded-xl transition-all text-white text-sm font-bold shadow-[0_5px_0_0_#9f1239] active:translate-y-1 active:shadow-none hover:-translate-y-0.5 border border-red-400/50"
            title="Cài đặt API Key & AI Model"
          >
            <Settings size={18} className="text-amber-200 animate-spin-slow drop-shadow" />
            <span className="drop-shadow-md">🔑 Lấy API Key</span>
          </button>
          <div className="hidden sm:flex items-center space-x-2 text-blue-50 bg-gradient-to-br from-white/10 to-white/5 px-3 py-1.5 rounded-xl text-sm font-bold shadow-inner border border-white/10">
            <Sparkles size={16} className="text-amber-300 drop-shadow" />
            <span className="drop-shadow-sm">Gemini AI 3.0</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
