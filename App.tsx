import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AppMain from './pages/AppMain';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import ApiGuide from './pages/ApiGuide';
import { useAuthStore } from './store/authStore';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Mở trực tiếp ứng dụng Soạn giáo án NLS - Không cần đăng ký, không cần đăng nhập */}
        <Route path="/" element={<AppMain />} />
        <Route path="/app" element={<AppMain />} />
        <Route path="/api-guide" element={<ApiGuide />} />

        {/* Catch all redirect về trang ứng dụng chính */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
