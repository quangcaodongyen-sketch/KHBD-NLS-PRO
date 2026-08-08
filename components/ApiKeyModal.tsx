import React, { useState, useEffect } from 'react';
import { Key, Save, X } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onSave: (key: string, selectedModel?: string) => void;
    onClose: () => void;
    initialKey?: string;
    initialModel?: string;
}

const AVAILABLE_MODELS = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Mặc định - Nhanh & Tối ưu)', badge: 'Khuyên dùng' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Reasoning sâu / Cao cấp)', badge: 'Mạnh nhất' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Cân bằng & Ổn định)', badge: 'Tiêu chuẩn' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Nhẹ & Tiết kiệm)', badge: 'Nhanh' },
];

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
    isOpen,
    onSave,
    onClose,
    initialKey = '',
    initialModel = 'gemini-3-flash-preview'
}) => {
    const [key, setKey] = useState(initialKey);
    const [model, setModel] = useState(initialModel);

    useEffect(() => {
        setKey(initialKey);
        const savedModel = localStorage.getItem('GEMINI_MODEL') || initialModel;
        setModel(savedModel);
    }, [initialKey, initialModel]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            localStorage.setItem('GEMINI_MODEL', model);
            onSave(key.trim(), model);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Key className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Cấu hình AI & API Key</h3>
                            <p className="text-blue-100 text-xs mt-0.5">Quản lý Gemini API Key và chọn Model AI xử lý</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Chọn AI Model ưu tiên
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {AVAILABLE_MODELS.map((m) => (
                                    <label
                                        key={m.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                            model === m.id
                                                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="radio"
                                                name="ai-model"
                                                value={m.id}
                                                checked={model === m.id}
                                                onChange={() => setModel(m.id)}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-800">{m.name}</span>
                                        </div>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                            model === m.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {m.badge}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                                <span>Gemini API Key</span>
                                <span className="text-xs text-orange-600 font-bold">* Bắt buộc</span>
                            </label>
                            <input
                                type="password"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-red-600 font-bold hover:underline flex items-center"
                            >
                                🔗 Lấy API Key miễn phí tại đây
                            </a>
                            <button
                                type="submit"
                                disabled={!key.trim()}
                                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} />
                                <span>Lưu cấu hình</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
