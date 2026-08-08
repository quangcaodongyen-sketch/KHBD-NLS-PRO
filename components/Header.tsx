import React from 'react';
import { GraduationCap, Settings, User, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenSettings: () => void;
  apiKeySet?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, apiKeySet = true }) => {
  return (
    <header className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white shadow-lg sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="p-2.5 bg-white/10 group-hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/10 shadow-inner">
            <GraduationCap size={30} className="text-blue-200 group-hover:scale-105 transition-transform" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
              SOẠN GIÁO ÁN NĂNG LỰC SỐ
            </h1>
            <p className="text-blue-200 text-xs md:text-sm font-medium opacity-90">
              Chuẩn NLS Bộ GD&ĐT • Thầy giáo Đinh Văn Thành
            </p>
          </div>
        </Link>

        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Nút Cài đặt API Key kèm cảnh báo màu đỏ */}
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 hover:border-white/40 shadow-sm"
            title="Cài đặt API Key & AI Model"
          >
            <Settings size={18} className="text-amber-300 animate-spin-slow" />
            <span className="text-xs font-bold text-red-300 hover:text-red-200 underline decoration-red-400">
              Lấy API key để sử dụng app
            </span>
          </button>

          <Link
            to="/dashboard"
            className="p-2.5 hover:bg-white/15 rounded-xl transition-colors text-blue-100 hover:text-white flex items-center space-x-1 border border-transparent hover:border-white/10"
            title="Trang cá nhân"
          >
            <User size={19} />
            <span className="hidden md:inline text-xs font-semibold">Dashboard</span>
          </Link>

          <div className="hidden lg:flex items-center space-x-1.5 text-blue-100 bg-white/10 px-3 py-1.5 rounded-xl text-xs border border-white/10">
            <Sparkles size={14} className="text-amber-300" />
            <span>Gemini AI 3.0</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
