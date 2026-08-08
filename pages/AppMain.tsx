import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import LessonForm from '../components/LessonForm';
import ContentInput from '../components/ContentInput';
import ResultDisplay from '../components/ResultDisplay';
import { Subject, OriginalDocxFile } from '../types';
import { generateNLSLessonPlan } from '../services/geminiService';
import { Sparkles, Settings2, Key } from 'lucide-react';
import ApiKeyModal from '../components/ApiKeyModal';
import { useAuthStore } from '../store/authStore';
import { MockDB } from '../services/mockDb';

const AppMain: React.FC = () => {
  // State for Form - Mặc định Lớp 6, môn Tiếng Anh và tự động ghi nhớ theo người dùng
  const [subject, setSubjectState] = useState<Subject>(() => {
    const saved = localStorage.getItem('SAVED_SUBJECT');
    if (saved && Object.values(Subject).includes(saved as Subject)) {
      return saved as Subject;
    }
    return Subject.ANH; // Mặc định: Môn Tiếng Anh
  });

  const [grade, setGradeState] = useState<number>(() => {
    const saved = localStorage.getItem('SAVED_GRADE');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        return parsed;
      }
    }
    return 6; // Mặc định: Lớp 6
  });

  // Hàm setter kèm ghi nhớ vào localStorage
  const setSubject = (s: Subject) => {
    setSubjectState(s);
    localStorage.setItem('SAVED_SUBJECT', s);
  };

  const setGrade = (g: number) => {
    setGradeState(g);
    localStorage.setItem('SAVED_GRADE', g.toString());
  };

  // Content States
  const [lessonContent, setLessonContent] = useState<string>('');
  const [distributionContent, setDistributionContent] = useState<string>('');
  const [extractedImages, setExtractedImages] = useState<{ base64: string; mimeType: string }[]>([]);

  // State for Options
  const [analyzeOnly, setAnalyzeOnly] = useState(false);
  const [detailedReport, setDetailedReport] = useState(false);

  // AppMain State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API Key & Model State
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const { user } = useAuthStore();

  // State lưu trữ file DOCX gốc cho XML Injection
  const [originalDocx, setOriginalDocx] = useState<OriginalDocxFile | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    const storedModel = localStorage.getItem('GEMINI_MODEL');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowApiKeyModal(true);
    }
    if (storedModel) {
      setSelectedModel(storedModel);
    }
  }, []);

  const handleSaveApiKey = (key: string, model?: string) => {
    localStorage.setItem('GEMINI_API_KEY', key);
    setApiKey(key);
    if (model) {
      localStorage.setItem('GEMINI_MODEL', model);
      setSelectedModel(model);
    }
    setShowApiKeyModal(false);
  };

  const handleProcess = async () => {
    if (!lessonContent || lessonContent.trim().length === 0) {
      setError("Vui lòng tải lên file giáo án (Giáo án trống hoặc chưa được tải).");
      return;
    }

    if (!apiKey) {
      setShowApiKeyModal(true);
      setError("Vui lòng nhập API Key để tiếp tục.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Pass both contents, selected model, and images to service
      const generatedText = await generateNLSLessonPlan(
        {
          subject,
          grade,
          content: lessonContent,
          distributionContent: distributionContent
        },
        {
          analyzeOnly,
          detailedReport,
          comparisonExport: false,
          apiKey,
          selectedModel,
          images: extractedImages
        }
      );

      if (!generatedText || generatedText.trim().length === 0) {
        throw new Error("AI trả về kết quả rỗng. Vui lòng thử lại với file giáo án rõ ràng hơn.");
      }

      setResult(generatedText);
      if (user) {
        MockDB.addLog(user.id, 'generate_nls', `Đã xử lý giáo án ${subject} lớp ${grade}`);
      }
    } catch (err: any) {
      console.error("Process Error:", err);
      const msg = err.message || "Đã xảy ra lỗi không xác định khi kết nối với AI.";
      setError(msg);
      if (msg.includes("API Key") || msg.toLowerCase().includes("leaked") || msg.includes("vô hiệu hóa")) {
        setShowApiKeyModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <Header onOpenSettings={() => setShowApiKeyModal(true)} apiKeySet={!!apiKey} />

      <main className="max-w-6xl mx-auto px-4 md:px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <LessonForm
              subject={subject} setSubject={setSubject}
              grade={grade} setGrade={setGrade}
            />

            <ContentInput
              lessonContent={lessonContent}
              setLessonContent={setLessonContent}
              distributionContent={distributionContent}
              setDistributionContent={setDistributionContent}
              onOriginalDocxLoaded={setOriginalDocx}
              onImagesExtracted={setExtractedImages}
            />

            {/* Options Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
              <div className="flex items-center mb-4">
                <Settings2 className="text-blue-600 mr-2" size={20} />
                <h3 className="font-bold text-blue-950">Tùy chọn nâng cao</h3>
              </div>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analyzeOnly}
                    onChange={(e) => setAnalyzeOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Chỉ phân tích, không chỉnh sửa</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailedReport}
                    onChange={(e) => setDetailedReport(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Kèm bảng giải thích mã NLS chi tiết</span>
                </label>
              </div>
            </div>

            {/* API Key Config Banner */}
            <div className="flex justify-between items-center bg-blue-50/60 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-600 font-medium">Model hiện tại:</span>
                <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-md">
                  {selectedModel}
                </span>
              </div>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm"
              >
                <Key size={14} className="text-amber-500" />
                <span>Đổi Model & API Key</span>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-xl flex items-start space-x-2 text-sm font-medium">
                <span className="text-red-500 font-bold">⚠️ Lỗi:</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={loading}
              className={`w-full py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-white font-extrabold text-lg transition-all transform active:scale-95 ${loading
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 hover:shadow-blue-500/25'
                }`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></span>
                  <span>ĐANG PHÂN TÍCH & TÍCH HỢP NĂNG LỰC SỐ...</span>
                </div>
              ) : (
                <>
                  <Sparkles size={22} className="text-amber-300 animate-pulse" />
                  <span>BẮT ĐẦU SOẠN GIÁO ÁN NĂNG LỰC SỐ</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Info */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-blue-800">
              <h3 className="font-bold text-lg mb-4 flex items-center">
                <span className="bg-blue-600 p-1 rounded-lg mr-2 text-xs">GUIDE</span>
                Hướng dẫn thực hiện
              </h3>
              <ul className="space-y-3.5 text-blue-100 text-sm">
                <li className="flex items-start">
                  <span className="bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-bold">1</span>
                  <span>Chọn <b>Môn học</b> và <b>Khối lớp</b> giảng dạy.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-bold">2</span>
                  <span><b>Tải lên File Giáo án (.docx/.pdf):</b> Hệ thống tự động đọc công thức Toán học (OMML, MathType) và bảo toàn nội dung.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500/40 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-bold">3</span>
                  <span><i>Tải file PPCT (tùy chọn):</i> Giúp AI trích xuất nguyên văn YCCĐ NLS của trường.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-amber-500/40 text-amber-200 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-bold">4</span>
                  <span>Nhấn <b>Tải về DOCX</b> để nhận file Word chèn màu đỏ nội dung NLS.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
              <h3 className="font-bold text-blue-950 mb-3 text-sm uppercase tracking-wider">6 Miền Năng lực số</h3>
              <div className="space-y-2.5">
                {[
                  "1. Khai thác dữ liệu và thông tin",
                  "2. Giao tiếp và Hợp tác",
                  "3. Sáng tạo nội dung số",
                  "4. An toàn số",
                  "5. Giải quyết vấn đề",
                  "6. Ứng dụng AI"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2.5"></div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="mt-8">
          <ResultDisplay
            result={result}
            loading={loading}
            originalDocx={originalDocx}
            originalContent={lessonContent}
          />
        </div>
      </main>

      <footer className="mt-12 text-center text-slate-500 text-xs py-6 border-t border-slate-200/60">
        <p>© 2026 Bản quyền thuộc về Thầy giáo Đinh Văn Thành</p>
        <div className="mt-2 space-y-1 text-slate-600 font-medium">
          <p>Phần mềm hỗ trợ tích hợp Năng lực số vào Kế hoạch bài dạy toàn cấp</p>
          <p className="text-blue-700">Zalo/Tel: 0915.213717 (Thầy giáo Đinh Văn Thành)</p>
        </div>
      </footer>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onSave={handleSaveApiKey}
        onClose={() => setShowApiKeyModal(false)}
        initialKey={apiKey}
        initialModel={selectedModel}
      />
    </div>
  );
};

export default AppMain;
