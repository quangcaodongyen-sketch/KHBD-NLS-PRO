import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, CheckCircle, FileText, FileUp, AlertCircle, Sparkles, Sigma } from 'lucide-react';
import { OriginalDocxFile } from '../types';
import { parseDocxWithMath, DocxParseResult } from '../services/docxMathParser';

interface ContentInputProps {
  lessonContent: string;
  setLessonContent: (val: string) => void;
  distributionContent: string;
  setDistributionContent: (val: string) => void;
  // Callback để lưu file DOCX gốc cho XML Injection
  onOriginalDocxLoaded?: (file: OriginalDocxFile | null) => void;
  // Callback lưu hình ảnh (MathType WMF đã convert)
  onImagesExtracted?: (images: { base64: string; mimeType: string }[]) => void;
}

// Khai báo thư viện ngoại
declare const pdfjsLib: any;

const ContentInput: React.FC<ContentInputProps> = ({
  lessonContent,
  setLessonContent,
  distributionContent,
  setDistributionContent,
  onOriginalDocxLoaded,
  onImagesExtracted
}) => {
  const lessonInputRef = useRef<HTMLInputElement>(null);
  const distInputRef = useRef<HTMLInputElement>(null);

  const [processingLesson, setProcessingLesson] = useState(false);
  const [processingDist, setProcessingDist] = useState(false);

  const [lessonFileName, setLessonFileName] = useState<string | null>(null);
  const [distFileName, setDistFileName] = useState<string | null>(null);

  const [mathStatus, setMathStatus] = useState<string | null>(null);

  const processFile = async (file: File, isLesson: boolean) => {
    const setProcessing = isLesson ? setProcessingLesson : setProcessingDist;
    const setContent = isLesson ? setLessonContent : setDistributionContent;
    const setFileName = isLesson ? setLessonFileName : setDistFileName;

    setProcessing(true);
    setFileName(file.name);
    if (isLesson) setMathStatus(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = "";

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        text = await extractTextFromPDF(arrayBuffer);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        // Dùng parser chuyên dụng trích xuất công thức toán OMML XML & MathType WMF
        const parseResult: DocxParseResult = await parseDocxWithMath(arrayBuffer);
        text = parseResult.text;

        if (isLesson) {
          onOriginalDocxLoaded?.({ arrayBuffer, fileName: file.name });
          if (parseResult.images && parseResult.images.length > 0) {
            onImagesExtracted?.(parseResult.images);
          }

          // Cập nhật thông báo trạng thái nhận diện toán học
          if (parseResult.ommlCount > 0 || parseResult.wmfCount > 0) {
            setMathStatus(
              `✓ Đã trích xuất ${parseResult.ommlCount} công thức OMML (LaTeX) và ${parseResult.wmfCount} công thức MathType.`
            );
          } else {
            setMathStatus(`✓ Đã trích xuất nội dung văn bản chuẩn từ file Word.`);
          }
        }
      } else {
        alert("Định dạng file không được hỗ trợ. Vui lòng chọn PDF hoặc DOCX.");
        setFileName(null);
        setProcessing(false);
        return;
      }

      if (!text.trim()) {
        alert("Không thể đọc được nội dung văn bản từ file này. Có thể file chứa ảnh scan?");
        setFileName(null);
      } else {
        setContent(text);
      }

    } catch (error) {
      console.error("Error processing file:", error);
      alert("Có lỗi xảy ra khi đọc file.");
      setFileName(null);
    } finally {
      setProcessing(false);
    }
  };

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    if (typeof pdfjsLib === 'undefined') return "";
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    return fullText;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isLesson: boolean) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, isLesson);
    e.target.value = '';
  };

  // Component hiển thị ô upload
  const UploadBox = ({
    title,
    subTitle,
    inputRef,
    fileName,
    isProcessing,
    isLesson,
    hasContent
  }: {
    title: string,
    subTitle: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
    fileName: string | null,
    isProcessing: boolean,
    isLesson: boolean,
    hasContent: boolean
  }) => (
    <div
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all relative group
        ${hasContent ? 'border-green-300 bg-green-50/70 hover:bg-green-100/50' : 'border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-100/40'}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={(e) => handleFileChange(e, isLesson)}
        accept=".pdf,.docx"
        className="hidden"
      />

      {isProcessing ? (
        <div className="flex flex-col items-center animate-pulse py-2">
          <Loader2 className="text-blue-600 animate-spin mb-2" size={32} />
          <p className="text-sm font-medium text-blue-900">Đang phân tích & trích xuất công thức...</p>
        </div>
      ) : hasContent ? (
        <div className="flex flex-col items-center py-2">
          <div className="p-3 bg-white rounded-full shadow-sm mb-2">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <p className="text-sm font-bold text-green-800 break-all px-4">{fileName}</p>
          <p className="text-xs text-green-600 mt-1">Đã tải lên thành công. Nhấn để thay đổi file.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-2">
          <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
            {isLesson ? <FileText className="text-blue-500" size={28} /> : <FileUp className="text-indigo-500" size={28} />}
          </div>
          <p className="text-base font-semibold text-slate-800">{title}</p>
          <p className="text-sm text-slate-500 mt-1">{subTitle}</p>
          <p className="text-xs text-blue-600 font-medium mt-3 bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm flex items-center space-x-1">
            <Sigma size={12} className="text-blue-500 mr-1" />
            <span>Hỗ trợ .docx (Công thức Toán/OMML/MathType), .pdf</span>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2 w-full">
      <input
        type="file"
        ref={lessonInputRef}
        onChange={(e) => handleFileChange(e, true)}
        accept=".pdf,.docx"
        className="hidden"
      />
      <input
        type="file"
        ref={distInputRef}
        onChange={(e) => handleFileChange(e, false)}
        accept=".pdf,.docx"
        className="hidden"
      />

      {/* Nút Upload Giáo án */}
      <button
        type="button"
        onClick={() => lessonInputRef.current?.click()}
        disabled={processingLesson}
        className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all shadow-sm ${
          lessonContent
            ? 'bg-green-50 border-green-300 text-green-800'
            : 'bg-blue-50/70 border-blue-200 text-blue-900 hover:bg-blue-100/70'
        }`}
        title="Tải lên Kế hoạch bài dạy (.docx hoặc .pdf)"
      >
        <div className="flex items-center space-x-2 truncate">
          {processingLesson ? (
            <Loader2 className="animate-spin text-blue-600 shrink-0" size={15} />
          ) : lessonContent ? (
            <CheckCircle className="text-green-600 shrink-0" size={15} />
          ) : (
            <FileText className="text-blue-600 shrink-0" size={15} />
          )}
          <span className="truncate font-bold">
            {lessonFileName ? lessonFileName : '📁 Chọn File Giáo án'}
          </span>
        </div>
        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-blue-200 shrink-0">.docx</span>
      </button>

      {/* Nút Upload PPCT */}
      <button
        type="button"
        onClick={() => distInputRef.current?.click()}
        disabled={processingDist}
        className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all shadow-sm ${
          distributionContent
            ? 'bg-green-50 border-green-300 text-green-800'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
        }`}
        title="Tải lên Phân phối chương trình (Không bắt buộc)"
      >
        <div className="flex items-center space-x-2 truncate">
          {processingDist ? (
            <Loader2 className="animate-spin text-blue-600 shrink-0" size={15} />
          ) : distributionContent ? (
            <CheckCircle className="text-green-600 shrink-0" size={15} />
          ) : (
            <FileUp className="text-slate-500 shrink-0" size={15} />
          )}
          <span className="truncate font-semibold">
            {distFileName ? distFileName : '📄 Chọn PPCT (Tùy chọn)'}
          </span>
        </div>
        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">Tùy chọn</span>
      </button>

      {mathStatus && (
        <p className="text-[10px] text-green-700 bg-green-50 p-1.5 rounded-lg border border-green-200 flex items-center">
          <Sparkles size={11} className="mr-1 text-green-600 shrink-0" />
          <span>{mathStatus}</span>
        </p>
      )}
    </div>
  );
};

export default ContentInput;