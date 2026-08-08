import React from 'react';
import { GraduationCap, Settings, User, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenSettings: () => void;
  apiKeySet?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, apiKeySet = true }) => {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-md sticky top-0 z-40 w-full">
      <div className="w-full px-4 md:px-6 py-2 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="p-1.5 bg-white/10 rounded-lg">
            <GraduationCap size={20} className="text-blue-200" />
          </div>
          <div className="flex items-baseline space-x-2">
            <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white">
              SOẠN GIÁO ÁN NĂNG LỰC SỐ
            </h1>
            <span className="hidden md:inline text-[11px] text-blue-200/80 font-medium">
              • Chuẩn NLS Bộ GD&ĐT • Thầy giáo Đinh Văn Thành (0915.213717)
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-lg transition-all text-white text-xs font-bold shadow-md"
            title="Cài đặt API Key & AI Model"
          >
            <Settings size={14} className="text-amber-300 animate-spin-slow" />
            <span>🔑 Lấy API Key</span>
          </button>
          <div className="hidden sm:flex items-center space-x-1 text-blue-100 bg-white/10 px-2.5 py-1 rounded-lg text-xs">
            <Sparkles size={13} className="text-amber-300" />
            <span>Gemini AI 3.0</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
