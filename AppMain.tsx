import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import LessonForm from '../components/LessonForm';
import ContentInput from '../components/ContentInput';
import ResultDisplay from '../components/ResultDisplay';
import { Subject, OriginalDocxFile } from '../types';
import { generateNLSLessonPlan } from '../services/geminiService';
import { Sparkles, Settings2, Key, ChevronDown, ChevronUp } from 'lucide-react';
import ApiKeyModal from '../components/ApiKeyModal';
import { useAuthStore } from '../store/authStore';
import { MockDB } from '../services/mockDb';

// Phát âm thanh tiếng chuông "Dinh!" vui tai khi tích hợp NLS hoàn tất
const playSuccessDing = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, ctx.currentTime); // Âm Nốt Đố (C6)

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, ctx.currentTime); // Âm Nốt Mi (E6)

    const now = ctx.currentTime;

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 1.2);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn("Lỗi phát âm thanh thông báo:", e);
  }
};

const AppMain: React.FC = () => {
  // State for Form - Mặc định Lớp 6, môn Tiếng Anh và tự động ghi nhớ theo người dùng
  const [subject, setSubjectState] = useState<Subject>(Subject.ANH);

  const [grade, setGradeState] = useState<number>(6);

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
  const [standardizeNd30, setStandardizeNd30] = useState(true);
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
          standardizeNd30,
          apiKey,
          selectedModel,
          images: extractedImages
        },
        (text) => setResult(text)
      );

      if (!generatedText || generatedText.trim().length === 0) {
        throw new Error("AI trả về kết quả rỗng. Vui lòng thử lại với file giáo án rõ ràng hơn.");
      }

      setResult(generatedText);
      playSuccessDing();
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

  const [showGuide, setShowGuide] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 font-sans pb-12">
      <Header onOpenSettings={() => setShowApiKeyModal(true)} apiKeySet={!!apiKey} />

      <main className="w-full px-3 md:px-6 mt-4 max-w-[1700px] mx-auto">
        {/* Top Bar: Quick Guide Toggle & Status */}
        <div className="mb-4 flex items-center justify-between bg-white px-5 py-3 rounded-2xl shadow-md border border-slate-200 text-sm">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold text-blue-900 flex items-center text-base">
              <Sparkles size={20} className="text-amber-500 mr-2 drop-shadow" />
              Quy trình 4 Bước Tích hợp Năng lực số
            </span>
            <span className="hidden sm:inline-block text-xs md:text-sm text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 shadow-inner">
              Khoá định dạng A4 • Bảo toàn XML Docx 100%
            </span>
          </div>
        </div>

        {/* Layout 2 cột chính Khoa học & Rộng rãi */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          
          {/* CỘT BÊN TRÁI: BẢNG ĐIỀU KHIỂN NẮM RÕ 4 BƯỚC (Width ~360px) */}
          <div className="w-full lg:w-[360px] shrink-0 bg-white p-5 rounded-3xl shadow-xl border border-slate-200 border-t-white space-y-5">
            
            {/* Header Control */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-extrabold text-sm uppercase tracking-wider text-blue-950 flex items-center">
                <Settings2 size={20} className="mr-2 text-blue-600 drop-shadow-sm" />
                Bảng điều khiển
              </span>
              <span className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 font-extrabold px-3 py-1 rounded-full shadow-inner border border-blue-200">
                Tích hợp NLS
              </span>
            </div>

            {/* BƯỚC 1: Môn học & Khối lớp */}
            <LessonForm
              subject={subject} setSubject={setSubject}
              grade={grade} setGrade={setGrade}
            />


            {/* BƯỚC 2: Upload Tài liệu bài dạy */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider block border-b border-slate-200 pb-1">
                Bước 2: Nạp file Giáo án
              </span>
              <ContentInput
                lessonContent={lessonContent}
                setLessonContent={setLessonContent}
                distributionContent={distributionContent}
                setDistributionContent={setDistributionContent}
                onOriginalDocxLoaded={setOriginalDocx}
                onImagesExtracted={setExtractedImages}
              />
            </div>

            {/* BƯỚC 3: Tùy chọn bổ sung dạng NÚT BẤM (Clickable Toggle Cards) */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider block border-b border-slate-200 pb-1">
                Bước 3: Tùy chọn tích hợp
              </span>
              
              <div className="space-y-2">
                {/* Option Card 1: NĐ30 */}
                <button
                  type="button"
                  onClick={() => setStandardizeNd30(!standardizeNd30)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 cursor-pointer shadow-sm ${
                    standardizeNd30
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                    standardizeNd30 ? 'bg-white text-blue-600 border-white' : 'border-slate-300 bg-slate-100'
                  }`}>
                    {standardizeNd30 && <span className="font-black text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">📜 Chuẩn thể thức NĐ30/2020/NĐ-CP</p>
                    <p className={`text-[10px] mt-0.5 ${standardizeNd30 ? 'text-blue-100' : 'text-slate-500'}`}>
                      Chuẩn hóa Times New Roman, tiêu đề in hoa đậm, căn đều 2 bên
                    </p>
                  </div>
                </button>

                {/* Option Card 2: Chỉ phân tích */}
                <button
                  type="button"
                  onClick={() => setAnalyzeOnly(!analyzeOnly)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 cursor-pointer shadow-sm ${
                    analyzeOnly
                      ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                    analyzeOnly ? 'bg-white text-indigo-600 border-white' : 'border-slate-300 bg-slate-100'
                  }`}>
                    {analyzeOnly && <span className="font-black text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">🔍 Chỉ phân tích NLS</p>
                    <p className={`text-[10px] mt-0.5 ${analyzeOnly ? 'text-indigo-100' : 'text-slate-500'}`}>
                      Đánh giá mức độ NLS mà không sửa chi tiết các hoạt động
                    </p>
                  </div>
                </button>

                {/* Option Card 3: Bảng giải thích */}
                <button
                  type="button"
                  onClick={() => setDetailedReport(!detailedReport)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 cursor-pointer shadow-sm ${
                    detailedReport
                      ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                    detailedReport ? 'bg-white text-emerald-600 border-white' : 'border-slate-300 bg-slate-100'
                  }`}>
                    {detailedReport && <span className="font-black text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">📊 Kèm Bảng giải thích mã NLS</p>
                    <p className={`text-[10px] mt-0.5 ${detailedReport ? 'text-emerald-100' : 'text-slate-500'}`}>
                      Tự động tạo bảng tra cứu ý nghĩa mã NLS ở cuối bài
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* BƯỚC 4: Model AI & Thực thi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-blue-50/80 p-2.5 rounded-xl border border-blue-200 text-xs">
                <span className="text-[11px] font-bold text-blue-900 truncate max-w-[130px]">
                  🤖 {selectedModel}
                </span>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="text-[11px] text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 underline"
                >
                  <Key size={12} className="text-amber-500" />
                  <span>Đổi Key</span>
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                  <span className="text-red-500 font-bold">⚠️ Lỗi: </span>
                  <span>{error}</span>
                </div>
              )}

              {/* NÚT THỰC THI CHÍNH */}
              <button
                onClick={handleProcess}
                disabled={loading}
                className={`w-full py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-white font-extrabold text-xs md:text-sm transition-all transform active:scale-95 ${
                  loading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 hover:shadow-blue-500/25 ring-2 ring-blue-400/30'
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    <span>ĐANG TÍCH HỢP NLS...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles size={18} className="text-amber-300 animate-pulse" />
                    <span>TÍCH HỢP NĂNG LỰC SỐ</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* CỘT PHẢI MAIN WORKSPACE: 2 CỬA SỔ SO SÁNH GIÁO ÁN CHUẨN A4 (Flex-1) */}
          <div className="flex-1 w-full min-w-0">
            <ResultDisplay
              result={result}
              loading={loading}
              originalDocx={originalDocx}
              originalContent={lessonContent}
            />
          </div>

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

