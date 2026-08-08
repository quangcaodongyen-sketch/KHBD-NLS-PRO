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
        }
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <Header onOpenSettings={() => setShowApiKeyModal(true)} apiKeySet={!!apiKey} />

      <main className="w-full px-2 md:px-4 mt-2">
        <div className="flex flex-col lg:flex-row gap-3 items-start">
          
          {/* CỘT BÊN TRÁI: DANH MỤC CẤU HÌNH (Width ~280px) */}
          <div className="w-full lg:w-72 shrink-0 bg-white p-3.5 rounded-2xl shadow-sm border border-blue-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-extrabold text-xs uppercase tracking-wider text-blue-950 flex items-center">
                <Settings2 size={15} className="mr-1.5 text-blue-600" />
                Danh mục cấu hình
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Bước 1 & 2
              </span>
            </div>

            {/* Môn học & Khối lớp */}
            <LessonForm
              subject={subject} setSubject={setSubject}
              grade={grade} setGrade={setGrade}
            />

            {/* Upload Files */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tài liệu bài dạy đầu vào</label>
              <ContentInput
                lessonContent={lessonContent}
                setLessonContent={setLessonContent}
                distributionContent={distributionContent}
                setDistributionContent={setDistributionContent}
                onOriginalDocxLoaded={setOriginalDocx}
                onImagesExtracted={setExtractedImages}
              />
            </div>

            {/* Tùy chọn nâng cao */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tùy chọn bổ sung</label>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-blue-950 font-bold bg-blue-50/80 p-2 rounded-xl border border-blue-200 shadow-sm">
                <input
                  type="checkbox"
                  checked={standardizeNd30}
                  onChange={(e) => setStandardizeNd30(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>📜 Chuẩn hóa thể thức VB (NĐ30/2020/NĐ-CP)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={analyzeOnly}
                  onChange={(e) => setAnalyzeOnly(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Chỉ phân tích, không chỉnh sửa</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={detailedReport}
                  onChange={(e) => setDetailedReport(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Kèm bảng giải thích mã NLS</span>
              </label>
            </div>

            {/* AI Model indicator & Change Key */}
            <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-xl border border-blue-200 text-xs">
              <span className="text-[11px] font-bold text-blue-900 truncate max-w-[120px]">{selectedModel}</span>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="text-[11px] text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 underline"
              >
                <Key size={12} className="text-amber-500" />
                <span>Đổi Key</span>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-xl text-xs font-medium">
                <span className="text-red-500 font-bold">⚠️ Lỗi: </span>
                <span>{error}</span>
              </div>
            )}

            {/* NÚT THỰC THI CHÍNH */}
            <button
              onClick={handleProcess}
              disabled={loading}
              className={`w-full py-3 rounded-xl shadow-lg flex items-center justify-center space-x-1.5 text-white font-extrabold text-xs md:text-sm transition-all transform active:scale-95 ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 hover:shadow-blue-500/25'
              }`}
            >
              {loading ? (
                <div className="flex items-center space-x-1.5">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  <span>ĐANG TÍCH HỢP...</span>
                </div>
              ) : (
                <>
                  <Sparkles size={18} className="text-amber-300 animate-pulse" />
                  <span>TÍCH HỢP NĂNG LỰC SỐ</span>
                </>
              )}
            </button>
          </div>

          {/* CỘT GIỮA: 2 CỬA SỔ SO SÁNH GIÁO ÁN (Flex-1) */}
          <div className="flex-1 w-full min-w-0">
            <ResultDisplay
              result={result}
              loading={loading}
              originalDocx={originalDocx}
              originalContent={lessonContent}
            />
          </div>

          {/* CỘT BÊN PHẢI: HƯỚNG DẪN THỰC HIỆN & 6 MIỀN NLS (Width ~240px) */}
          <div className="w-full lg:w-64 shrink-0 space-y-3 hidden xl:block">
            {/* Thẻ Hướng dẫn */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-4 rounded-2xl shadow-md border border-blue-800 text-xs">
              <h3 className="font-bold text-sm mb-3 flex items-center justify-between border-b border-blue-700/60 pb-2">
                <span className="flex items-center">
                  <span className="bg-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">GUIDE</span>
                  Hướng dẫn
                </span>
              </h3>
              <ol className="space-y-2.5 text-blue-100 font-medium">
                <li className="flex items-start">
                  <span className="bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-2 mt-0.5 font-bold shrink-0">1</span>
                  <span>Chọn <b>Môn học</b> & <b>Khối lớp</b> ở danh mục bên trái.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-2 mt-0.5 font-bold shrink-0">2</span>
                  <span>Bấm <b>Chọn File Giáo án</b> (.docx/.pdf) cần tích hợp NLS.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500/40 rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-2 mt-0.5 font-bold shrink-0">3</span>
                  <span>Nhấn <b>TÍCH HỢP NĂNG LỰC SỐ</b> để AI chèn chữ màu đỏ.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-amber-500/40 text-amber-200 rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-2 mt-0.5 font-bold shrink-0">4</span>
                  <span>Bấm <b>TẢI FILE WORD (.DOCX)</b> ở góc trên cửa sổ kết quả.</span>
                </li>
              </ol>
            </div>

            {/* Thẻ 6 Miền Năng lực số */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-200 text-xs">
              <h3 className="font-bold text-blue-950 mb-2 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5">
                6 Miền Năng lực số
              </h3>
              <div className="space-y-1.5">
                {[
                  "1. Khai thác dữ liệu & thông tin",
                  "2. Giao tiếp & Hợp tác",
                  "3. Sáng tạo nội dung số",
                  "4. An toàn số",
                  "5. Giải quyết vấn đề",
                  "6. Ứng dụng AI"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center text-[11px] font-semibold text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 shrink-0"></div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
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
