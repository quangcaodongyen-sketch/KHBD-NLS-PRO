import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  UnderlineType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  TableLayoutType
} from 'docx';
import FileSaver from 'file-saver';
import JSZip from 'jszip';
import { OriginalDocxFile } from '../types';

import { parseAllNLSSections } from '../services/geminiService';
import { useAuthStore } from '../store/authStore';
import remarkGfm from 'remark-gfm';
import { MockDB } from '../services/mockDb';

interface ResultDisplayProps {
  result: string | null;
  loading: boolean;
  originalDocx?: OriginalDocxFile | null;
  originalContent?: string;
}

// Interface cho các section NLS đã parse
interface NLSSection {
  marker: string;  // Ví dụ: "HOẠT_ĐỘNG_1", "MỤC_TIÊU"
  content: string;
  searchPatterns: string[]; // Các pattern để tìm trong file gốc
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, loading, originalDocx, originalContent }) => {
  const [showPreview, setShowPreview] = useState(true); // Default to showing preview when generated
  const [viewMode, setViewMode] = useState<'split' | 'single'>('split'); // Default to split side-by-side mode
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const { user } = useAuthStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => {
          if (p < 50) return p + Math.floor(Math.random() * 5) + 2;
          if (p < 80) return p + Math.floor(Math.random() * 3) + 1;
          if (p < 95) return p + 1;
          if (p < 99) return p + 0.1;
          return p;
        });
      }, 500);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Parse tất cả các section NLS từ kết quả AI (supports both Vietnamese NLS_ and English DC_ markers)
  const parseAllNLSSections = (content: string): NLSSection[] => {
    const sections: NLSSection[] = [];

    // Regex để tìm tất cả các section: ===NLS_XXX=== hoặc ===DC_XXX=== ... (cho phép khuyết ===END=== khi đang stream)
    const sectionRegex = /===(NLS|DC)_([^=]+)===([\s\S]*?)(?:===END===|$)/g;
    let match;

    while ((match = sectionRegex.exec(content)) !== null) {
      const prefix = match[1]; // NLS or DC
      const marker = match[2].trim();
      const sectionContent = match[3].trim();

      // Xác định search patterns dựa trên marker
      let searchPatterns: string[] = [];

      // ================== VIETNAMESE NLS MARKERS ==================
      if (prefix === 'NLS') {
        if (marker === 'MỤC_TIÊU') {
          searchPatterns = [
            'Năng lực chung', 'năng lực chung', 'NĂNG LỰC CHUNG',
            'Năng lực:', 'năng lực:', '3. Năng lực',
            '3. Thái độ', 'c) Thái độ', 'c. Thái độ',
            'Thái độ', 'thái độ', 'THÁI ĐỘ',
            'Phẩm chất', 'phẩm chất', 'PHẨM CHẤT',
            'I. MỤC TIÊU', 'I. Mục tiêu', '1. Kiến thức', 'a) Kiến thức'
          ];
        }
        else if (marker.startsWith('HOẠT_ĐỘNG_')) {
          const parts = marker.replace('HOẠT_ĐỘNG_', '').split('_');
          const actNum = parts[0];
          const subPart = parts.slice(1).join('_');

          const actPatterns = [
            `Hoạt động ${actNum}:`, `Hoạt động ${actNum}.`, `Hoạt động ${actNum} `,
            `**Hoạt động ${actNum}`, `HOẠT ĐỘNG ${actNum}`, `HĐ ${actNum}:`,
            `Hoạt động ${actNum}`, `HĐ${actNum}`, `hoạt động ${actNum}`
          ];

          if (subPart === 'NỘI_DUNG') {
            searchPatterns = [
              'b) Nội dung', 'b. Nội dung', 'Nội dung:', 'b)Nội dung',
              '* Nội dung', '- Nội dung', 'NỘI DUNG',
              ...actPatterns
            ];
          } else if (subPart === 'SẢN_PHẨM') {
            searchPatterns = [
              'c) Sản phẩm', 'c. Sản phẩm', 'Sản phẩm:', 'c)Sản phẩm',
              '* Sản phẩm', '- Sản phẩm', 'SẢN PHẨM',
              ...actPatterns
            ];
          } else if (subPart === 'TỔ_CHỨC') {
            searchPatterns = [
              'd) Tổ chức thực hiện', 'd. Tổ chức thực hiện', 'd)Tổ chức',
              'Tổ chức thực hiện', 'd) Tổ chức', 'd. Tổ chức',
              '* Tổ chức', 'TỔ CHỨC THỰC HIỆN',
              ...actPatterns
            ];
          } else if (subPart === 'MỤC_TIÊU_HĐ') {
            searchPatterns = [
              'a) Mục tiêu', 'a. Mục tiêu', 'Mục tiêu:', 'a)Mục tiêu',
              '* Mục tiêu', '- Mục tiêu',
              ...actPatterns
            ];
          } else if (subPart === 'BƯỚC_1') {
            searchPatterns = [
              'Bước 1:', 'Bước 1.', 'Bước 1 ', 'bước 1',
              'Giao nhiệm vụ', 'Chuyển giao nhiệm vụ', 'Chuyển giao',
              ...actPatterns
            ];
          } else if (subPart === 'BƯỚC_2') {
            searchPatterns = [
              'Bước 2:', 'Bước 2.', 'Bước 2 ', 'bước 2',
              'Thực hiện nhiệm vụ', 'HS thực hiện',
              ...actPatterns
            ];
          } else if (subPart === 'BƯỚC_3') {
            searchPatterns = [
              'Bước 3:', 'Bước 3.', 'Bước 3 ', 'bước 3',
              'Báo cáo', 'Thảo luận', 'Trình bày', 'báo cáo, thảo luận',
              ...actPatterns
            ];
          } else if (subPart === 'BƯỚC_4' || subPart === 'KẾT_LUẬN') {
            searchPatterns = [
              'Bước 4:', 'Bước 4.', 'Bước 4 ', 'bước 4',
              'Kết luận', 'Nhận định', 'Đánh giá', 'kết luận, nhận định',
              'Kết luận, nhận định',
              ...actPatterns
            ];
          } else {
            searchPatterns = actPatterns;
          }
        }
        else if (marker === 'NỘI_DUNG') {
          searchPatterns = ['b) Nội dung', 'b. Nội dung', 'Nội dung:'];
        } else if (marker === 'BƯỚC_1') {
          searchPatterns = ['Bước 1:', 'Giao nhiệm vụ', 'Chuyển giao nhiệm vụ'];
        } else if (marker === 'BƯỚC_2') {
          searchPatterns = ['Bước 2:', 'Thực hiện nhiệm vụ', 'HS thực hiện'];
        } else if (marker === 'BƯỚC_3') {
          searchPatterns = ['Bước 3:', 'Báo cáo', 'Thảo luận'];
        } else if (marker === 'BƯỚC_4') {
          searchPatterns = ['Bước 4:', 'Kết luận', 'Nhận định'];
        } else if (marker === 'CỦNG_CỐ') {
          searchPatterns = ['Củng cố', 'Vận dụng'];
        }
      }
      // ================== ENGLISH DC MARKERS ==================
      else if (prefix === 'DC') {
        if (marker === 'OBJECTIVES') {
          searchPatterns = [
            'Competences', 'competences', 'COMPETENCES',
            '2. Competences', 'competence',
            '3. Attitudes', 'Attitudes', 'attitudes', 'ATTITUDES',
            'I. OBJECTIVES', 'OBJECTIVES', 'I. Objectives',
            '1. Language knowledge', 'Language knowledge and skills'
          ];
        }
        else if (marker.startsWith('WARM_UP')) {
          const parts = marker.replace('WARM_UP_', '').split('_');
          const subPart = parts.join('_');

          const warmUpPatterns = [
            'A. Warm up', 'A.Warm up', 'Warm up:', 'WARM UP',
            'Warm up', 'warm up', 'Warm-up'
          ];

          if (subPart === 'ORGANIZATION' || subPart === '') {
            searchPatterns = [
              ...warmUpPatterns,
              'd) Organization', 'd. Organization', 'Organization:',
              "TEACHER'S ACTIVITIES", "STUDENTS' ACTIVITIES"
            ];
          } else if (subPart === 'CONTENT') {
            searchPatterns = [...warmUpPatterns, 'b) Content', 'b. Content', 'Content:'];
          } else if (subPart === 'OUTCOMES') {
            searchPatterns = [...warmUpPatterns, 'c) Outcomes', 'c. Outcomes', 'Outcomes:'];
          } else if (subPart === 'OBJECTIVE') {
            searchPatterns = [...warmUpPatterns, 'a) Objective', 'a. Objective', 'Objective:'];
          } else {
            searchPatterns = warmUpPatterns;
          }
        }
        else if (marker.startsWith('ACTIVITY_')) {
          const parts = marker.replace('ACTIVITY_', '').split('_');
          const actNum = parts[0];
          const subPart = parts.slice(1).join('_');

          const actPatterns = [
            `Activity ${actNum}:`, `Activity ${actNum}.`, `Activity ${actNum} `,
            `**Activity ${actNum}`, `ACTIVITY ${actNum}`, `Activity${actNum}`,
            `Activity ${actNum}`, `activity ${actNum}`,
            ...(actNum === '1' ? ['Presentation', 'presentation', 'PRESENTATION'] : []),
            ...(actNum === '2' ? ['Practice', 'practice', 'PRACTICE'] : []),
            ...(actNum === '3' ? ['Production', 'production', 'PRODUCTION'] : [])
          ];

          if (subPart === 'CONTENT') {
            searchPatterns = [
              'b) Content', 'b. Content', 'Content:', 'b)Content',
              '* Content', '- Content', 'CONTENT',
              ...actPatterns
            ];
          } else if (subPart === 'OUTCOMES') {
            searchPatterns = [
              'c) Outcomes', 'c. Outcomes', 'Outcomes:', 'c)Outcomes',
              '* Outcomes', '- Outcomes', 'OUTCOMES',
              ...actPatterns
            ];
          } else if (subPart === 'ORGANIZATION') {
            searchPatterns = [
              'd) Organization', 'd. Organization', 'd)Organization',
              'Organization:', 'd) Organization', 'd. Organization',
              '* Organization', 'ORGANIZATION',
              "TEACHER'S ACTIVITIES", "STUDENTS' ACTIVITIES",
              ...actPatterns
            ];
          } else if (subPart === 'OBJECTIVE') {
            searchPatterns = [
              'a) Objective', 'a. Objective', 'Objective:', 'a)Objective',
              '* Objective', '- Objective',
              ...actPatterns
            ];
          } else if (subPart === 'TEACHER_ACTIVITIES') {
            searchPatterns = [
              "TEACHER'S ACTIVITIES", "Teacher's Activities", "Teacher's activities",
              ...actPatterns
            ];
          } else if (subPart === 'STUDENT_ACTIVITIES') {
            searchPatterns = [
              "STUDENTS' ACTIVITIES", "Students' Activities", "Students' activities",
              ...actPatterns
            ];
          } else {
            searchPatterns = actPatterns;
          }
        }
        else if (marker.startsWith('CONSOLIDATION')) {
          const parts = marker.replace('CONSOLIDATION_', '').split('_');
          const subPart = parts.join('_');

          const consolidationPatterns = [
            'C. Consolidation', 'C.Consolidation', 'Consolidation:',
            'CONSOLIDATION', 'Consolidation', 'consolidation'
          ];

          if (subPart === 'ORGANIZATION' || subPart === '' || marker === 'CONSOLIDATION') {
            searchPatterns = [
              ...consolidationPatterns,
              'd) Organization', "TEACHER'S ACTIVITIES"
            ];
          } else {
            searchPatterns = consolidationPatterns;
          }
        }
        else if (marker.startsWith('HOMEWORK')) {
          searchPatterns = [
            'D. Homework', 'D.Homework', 'Homework:',
            'HOMEWORK', 'Homework', 'homework'
          ];
        }
      }

      sections.push({
        marker: `${prefix}_${marker}`,
        content: sectionContent,
        searchPatterns
      });
    }

    return sections;
  };

  // Helper: Tạo Table khoá định dạng cột & chống vỡ hàng
  const createTableFromMarkdown = (tableLines: string[]): Table | null => {
    try {
      const validLines = tableLines.filter(line => !line.match(/^\|?\s*[-:]+[-|\s:]*\|?\s*$/));
      const rows = validLines.map((line, rowIndex) => {
        const cells = line.split('|');
        if (line.trim().startsWith('|')) cells.shift();
        if (line.trim().endsWith('|')) cells.pop();
        return new TableRow({
          cantSplit: true,
          tableHeader: rowIndex === 0,
          children: cells.map(cellContent => new TableCell({
            children: [new Paragraph({ children: parseTextWithFormatting(cellContent.trim()) })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            width: { size: Math.floor(100 / (cells.length || 1)), type: WidthType.PERCENTAGE }
          }))
        });
      });
      return new Table({
        rows: rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED
      });
    } catch (e) {
      return null;
    }
  };

  // Helper: Parse text - CHỈ MÀU ĐỎ
  const parseTextWithFormatting = (text: string): TextRun[] => {
    const cleanText = text.replace(/<br\s*\/?>/gi, '');
    const parts = cleanText.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|<red>.*?<\/red>)/g);
    return parts.map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({ text: part.slice(2, -2), bold: true });
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return new TextRun({ text: part.slice(1, -1), italics: true });
      }
      if (part.startsWith('<u>') && part.endsWith('</u>')) {
        return new TextRun({ text: part.replace(/<\/?u>/g, ''), underline: { type: UnderlineType.SINGLE } });
      }
      if (part.startsWith('<red>') && part.endsWith('</red>')) {
        return new TextRun({ text: part.replace(/<\/?red>/g, ''), color: "FF0000" });
      }
      return new TextRun({ text: part });
    });
  };

  // Escape XML
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // ─── HELPERS TẠO XML NLS (Times New Roman, đỏ, không đậm, first-line indent) ───

  const extractFontSizeFromParagraph = (paragraphXml: string): string => {
    const szMatch = paragraphXml.match(/<w:sz w:val="(\d+)"/);
    if (szMatch) return szMatch[1];
    return '26';
  };

  const extractSpacingFromParagraph = (paragraphXml: string): string => {
    const spacingMatch = paragraphXml.match(/<w:spacing\s[^>]*\/>/);
    return spacingMatch ? spacingMatch[0] : '';
  };

  const buildNlsRPr = (_sourceParagraphXml: string = ''): string => {
    return [
      '<w:rPr>',
      '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>',
      '<w:b w:val="0"/>',
      '<w:bCs w:val="0"/>',
      '<w:i w:val="1"/>', // In nghiêng
      '<w:iCs w:val="1"/>',
      '<w:color w:val="FF0000"/>', // Màu đỏ
      '<w:sz w:val="26"/>', // Cỡ 13pt (26 half-points)
      '<w:szCs w:val="26"/>',
      '</w:rPr>',
    ].join('');
  };

  const buildNlsPPr = (sourceParagraphXml: string = ''): string => {
    const spacing = extractSpacingFromParagraph(sourceParagraphXml);
    const jc = '<w:jc w:val="both"/>'; // Căn đều 2 bên
    return `<w:pPr><w:ind w:firstLine="720"/>${spacing}${jc}</w:pPr>`; // Lùi lề 1.27cm (720 twips)
  };

  const convertMarkdownToWordXml = (markdown: string, sourceParagraphXml: string = ''): string => {
    const lines = markdown.split('\n');
    let xml = '';

    const nlsPPr = buildNlsPPr(sourceParagraphXml);
    const nlsRPr = buildNlsRPr(sourceParagraphXml);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('[Chèn') || trimmed.startsWith('(Chèn') ||
        trimmed.startsWith('[chèn') || trimmed.startsWith('(chèn') ||
        trimmed.startsWith('(tiếp tục') || trimmed.startsWith('[tiếp tục') ||
        trimmed.startsWith('...') || trimmed.startsWith('===')) {
        continue;
      }

      let processedLine = trimmed;

      processedLine = processedLine.replace(/^\*?\s*Tích hợp NLS:\s*/i, '- ');
      processedLine = processedLine.replace(/\s*\(\d+\.\d+\.?[A-Za-z]+\d*[a-z]?\)/g, '');
      processedLine = processedLine.replace(/\s*\(\d+\.\d+[A-Za-z]+\d*[a-z]?\)/g, '');

      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '$1');
      processedLine = processedLine.replace(/\*(.*?)\*/g, '$1');
      processedLine = processedLine.replace(/<\/?u>/g, '');
      processedLine = processedLine.replace(/<\/?red>/g, '');
      processedLine = processedLine.replace(/<br\s*\/?>/gi, '');

      const content = escapeXml(processedLine);

      xml += `<w:p>${nlsPPr}<w:r>${nlsRPr}<w:t xml:space="preserve">${content}</w:t></w:r></w:p>`;
    }

    return xml;
  };

  const extractPlainTextFromXmlParagraph = (pXml: string): string => {
    const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
    return tMatches
      .map(t => t.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/i, '$1'))
      .join('')
      .trim();
  };

  // Thuật toán định vị phạm vi Hoạt động (Scoped Activity Search)
  const findAndInsertAfter = (
    xml: string,
    searchPatterns: string[],
    nlsMarkdown: string,
    marker: string = ''
  ): { result: string; inserted: boolean } => {
    const pRegex = /<w:p(?:\s+[^>]*)?>[\s\S]*?<\/w:p>/g;

    // Kiểm tra xem marker có chỉ định Hoạt động cụ thể không (VD: NLS_HOẠT_ĐỘNG_2_NỘI_DUNG)
    let searchScopeXml = xml;
    let scopeOffset = 0;

    const actMatch = marker.match(/(?:HOẠT_ĐỘNG_|ACTIVITY_)(\d+)/i);
    if (actMatch) {
      const actNum = parseInt(actMatch[1], 10);
      const nextActNum = actNum + 1;

      // Tìm vị trí tiêu đề "Hoạt động actNum"
      const actPattern = new RegExp(`(Hoạt động|HĐ|Activity)\\s*${actNum}`, 'i');
      pRegex.lastIndex = 0;
      let startMatch: RegExpExecArray | null = null;
      let endMatchIndex = xml.length;

      let pMatch: RegExpExecArray | null;
      while ((pMatch = pRegex.exec(xml)) !== null) {
        const text = extractPlainTextFromXmlParagraph(pMatch[0]);
        if (!startMatch && actPattern.test(text)) {
          startMatch = pMatch;
        } else if (startMatch && new RegExp(`(Hoạt động|HĐ|Activity)\\s*${nextActNum}`, 'i').test(text)) {
          endMatchIndex = pMatch.index;
          break;
        }
      }

      if (startMatch) {
        scopeOffset = startMatch.index;
        searchScopeXml = xml.slice(scopeOffset, endMatchIndex);
      }
    }

    // Tiến hành tìm kiếm pattern trong phạm vi searchScopeXml
    for (const pattern of searchPatterns) {
      const cleanPattern = pattern.trim().toLowerCase();
      if (!cleanPattern) continue;

      pRegex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pRegex.exec(searchScopeXml)) !== null) {
        const fullPXml = match[0];
        const pPlainText = extractPlainTextFromXmlParagraph(fullPXml).toLowerCase();

        if (pPlainText.includes(cleanPattern)) {
          const contentToInsert = convertMarkdownToWordXml(nlsMarkdown, fullPXml);
          const localInsertIndex = match.index + fullPXml.length;
          const globalInsertIndex = scopeOffset + localInsertIndex;

          const newXml = xml.slice(0, globalInsertIndex) + contentToInsert + xml.slice(globalInsertIndex);
          return { result: newXml, inserted: true };
        }
      }
    }

    // Nếu tìm trong phạm vi bị giới hạn thất bại, tìm kiếm toàn cục làm fallback
    if (scopeOffset > 0) {
      pRegex.lastIndex = 0;
      for (const pattern of searchPatterns) {
        const cleanPattern = pattern.trim().toLowerCase();
        if (!cleanPattern) continue;

        pRegex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pRegex.exec(xml)) !== null) {
          const fullPXml = match[0];
          const pPlainText = extractPlainTextFromXmlParagraph(fullPXml).toLowerCase();

          if (pPlainText.includes(cleanPattern)) {
            const contentToInsert = convertMarkdownToWordXml(nlsMarkdown, fullPXml);
            const globalInsertIndex = match.index + fullPXml.length;
            const newXml = xml.slice(0, globalInsertIndex) + contentToInsert + xml.slice(globalInsertIndex);
            return { result: newXml, inserted: true };
          }
        }
      }
    }

    return { result: xml, inserted: false };
  };

  const injectContentToDocx = async (
    originalArrayBuffer: ArrayBuffer,
    aiResult: string
  ): Promise<Blob> => {
    const zip = await JSZip.loadAsync(originalArrayBuffer);

    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) {
      throw new Error('File DOCX không hợp lệ');
    }

    let documentXml = await documentXmlFile.async('string');

    // Giữ nguyên toàn bộ cấu trúc bảng của giáo án gốc, không can thiệp vào tblLayout

    const sections = parseAllNLSSections(aiResult);

    let insertedCount = 0;
    let notInsertedSections: string[] = [];

    for (const section of sections) {
      const { result, inserted } = findAndInsertAfter(documentXml, section.searchPatterns, section.content, section.marker);

      if (inserted) {
        documentXml = result;
        insertedCount++;
        console.log(`✓ Đã chèn NLS cho: ${section.marker}`);
      } else {
        notInsertedSections.push(section.marker);
        console.log(`✗ Không tìm thấy vị trí cho: ${section.marker}`);
      }
    }

    if (notInsertedSections.length > 0) {
      let fallbackXml = `
        <w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="12" w:space="1" w:color="FF0000"/></w:pBdr></w:pPr></w:p>
        <w:p><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>═══ NỘI DUNG NLS BỔ SUNG ═══</w:t></w:r></w:p>
      `;

      for (const section of sections) {
        if (notInsertedSections.includes(section.marker)) {
          fallbackXml += `<w:p><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>[${section.marker}]</w:t></w:r></w:p>`;
          fallbackXml += convertMarkdownToWordXml(section.content);
        }
      }

      documentXml = documentXml.replace('</w:body>', fallbackXml + '</w:body>');
    }

    console.log(`Tổng: ${insertedCount}/${sections.length} section được chèn vào đúng vị trí`);

    zip.file('word/document.xml', documentXml);

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  };

  const createNewDocx = async (content: string): Promise<Blob> => {
    const lines = content.split('\n');
    const children: (Paragraph | Table)[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      const trimmed = line.trim();

      if (trimmed.startsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
        continue;
      } else if (inTable) {
        if (tableBuffer.length > 0) {
          const tableNode = createTableFromMarkdown(tableBuffer);
          if (tableNode) {
            children.push(tableNode);
            children.push(new Paragraph({ text: "" }));
          }
          tableBuffer = [];
        }
        inTable = false;
      }

      if (!trimmed || (trimmed.startsWith('===') && trimmed.endsWith('==='))) continue;

      if (trimmed.startsWith('## ')) {
        children.push(new Paragraph({
          children: parseTextWithFormatting(trimmed.replace('## ', '')),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 }
        }));
      } else if (trimmed.startsWith('### ')) {
        children.push(new Paragraph({
          children: parseTextWithFormatting(trimmed.replace('### ', '')),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 150, after: 50 }
        }));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        children.push(new Paragraph({
          children: parseTextWithFormatting(trimmed.substring(2)),
          bullet: { level: 0 }
        }));
      } else {
        children.push(new Paragraph({
          children: parseTextWithFormatting(trimmed),
          spacing: { after: 100 },
          alignment: AlignmentType.JUSTIFIED
        }));
      }
    }

    if (tableBuffer.length > 0) {
      const tableNode = createTableFromMarkdown(tableBuffer);
      if (tableNode) children.push(tableNode);
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 27, // 13.5pt
            },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            size: {
              width: 11906,  // 21.0cm A4
              height: 16838, // 29.7cm A4
            },
            margin: {
              top: 1134,   // 2cm
              bottom: 1134, // 2cm
              left: 1701,  // 3cm
              right: 1134, // 2cm
            },
          },
        },
        children: children,
      }],
    });

    return await Packer.toBlob(doc);
  };

  const generateDocx = async () => {
    if (!result) return;
    setIsGeneratingDoc(true);

    try {
      let blob: Blob;
      let fileName: string;

      if (originalDocx?.arrayBuffer) {
        console.log('XML Injection: Chèn NLS vào nhiều vị trí...');
        blob = await injectContentToDocx(originalDocx.arrayBuffer, result);
        fileName = originalDocx.fileName.replace('.docx', '_NLS.docx');
      } else {
        console.log('Tạo file DOCX mới...');
        blob = await createNewDocx(result);
        fileName = 'Giao_an_NLS.docx';
      }

      FileSaver.saveAs(blob, fileName);
      if (user) MockDB.addLog(user.id, 'download_file', 'Tải file DOCX');
    } catch (error) {
      console.error("Lỗi tạo file docx:", error);
      alert("Không thể tạo file .docx. Hệ thống sẽ tải về file văn bản thô.");
      handleDownloadTxt();
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    FileSaver.saveAs(blob, 'Giao_an_NLS.txt');
  };



  const components = {
    red: ({ children }: { children: React.ReactNode }) => (
      <span style={{
        color: '#FF0000',
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '13pt',
        fontStyle: 'italic',
        display: 'block',
        textIndent: '1.27cm',
        textAlign: 'justify',
        marginTop: '0.2rem',
        marginBottom: '0.2rem'
      }}>
        {children}
      </span>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
      <p style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '13.5pt',
        lineHeight: '1.5',
        textAlign: 'justify',
        textIndent: '1.27cm',
        marginBottom: '0.4rem'
      }}>
        {children}
      </p>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '13.5pt',
        lineHeight: '1.5',
        textAlign: 'justify',
        marginBottom: '0.25rem'
      }}>
        {children}
      </li>
    ),
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '16pt',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: '1rem',
        marginBottom: '0.5rem',
        color: '#000'
      }}>
        {children}
      </h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '14pt',
        fontWeight: 'bold',
        marginTop: '0.8rem',
        marginBottom: '0.4rem',
        color: '#000'
      }}>
        {children}
      </h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '13.5pt',
        fontWeight: 'bold',
        marginTop: '0.6rem',
        marginBottom: '0.3rem',
        color: '#000'
      }}>
        {children}
      </h3>
    ),
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="overflow-x-auto my-3">
        <table className="w-full border-collapse border border-black text-[13pt]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }: { children: React.ReactNode }) => (
      <th className="border border-black p-2 bg-slate-100 font-bold text-center">
        {children}
      </th>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
      <td className="border border-black p-2 align-top text-justify">
        {children}
      </td>
    ),
  };

  const sections = result ? parseAllNLSSections(result) : [];

  const getCleanResultForPreview = (content: string): string => {
    return content
      .replace(/===NLS_[^=]+=== */g, '')
      .replace(/===DC_[^=]+=== */g, '')
      .replace(/===END===/g, '')
      .replace(/^===.*===$/gm, '')
      .replace(/\n{3,}/g, '\n\n');
  };

  // Tạo nội dung giáo án hoàn chỉnh từ đầu đến cuối tích hợp NLS màu đỏ
  const generateFullIntegratedPreview = (originalText: string = '', resultText: string = ''): string => {
    if (!resultText) return originalText;

    const parsedSections = parseAllNLSSections(resultText);

    // Nếu không có markers ===...===, trả về nội dung AI trả về
    if (parsedSections.length === 0) {
      return getCleanResultForPreview(resultText);
    }

    // Nếu có giáo án gốc, chèn các section NLS vào đúng vị trí trong giáo án gốc
    if (originalText && originalText.trim().length > 0) {
      let fullText = originalText;

      for (const section of parsedSections) {
        const cleanContent = section.content.replace(/===[^=]+===/g, '').trim();
        if (!cleanContent) continue;

        // Đảm bảo bọc thẻ <red>...</red> cho nội dung NLS
        const redContent = cleanContent.includes('<red>')
          ? cleanContent
          : `<red>\n\n- ${cleanContent}\n\n</red>`;

        for (const pattern of section.searchPatterns) {
          const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escaped}[^\\n]*)`, 'i');

          if (regex.test(fullText)) {
            fullText = fullText.replace(regex, `$1\n\n${redContent}`);
            break;
          }
        }
      }

      return fullText;
    }

    return getCleanResultForPreview(resultText);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-blue-200 overflow-hidden transition-all duration-300">
      {/* Action Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 px-6 py-5 text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-center md:text-left">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm shadow-inner shrink-0 hidden sm:block">
            <CheckCircle className="text-green-400" size={28} />
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <span className="bg-green-500/30 text-green-300 border border-green-400/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {result ? '✓ ĐÃ TÍCH HỢP NLS' : '📋 GIAO DIỆN SO SÁNH'}
              </span>
              <h2 className="text-lg font-bold tracking-tight text-white">So sánh Giáo án Gốc & Giáo án NLS</h2>
            </div>
            <p className="text-blue-100 text-xs mt-0.5">
              {result ? (
                <>Đã chèn NLS màu đỏ vào <strong>{sections.length} mục</strong> trong toàn bộ giáo án</>
              ) : (
                'Hiển thị toàn bộ giáo án từ đầu đến cuối kèm phần tích hợp NLS màu đỏ'
              )}
            </p>
          </div>
        </div>

        {result && (
          <div className="flex items-center space-x-3">
            <button
              onClick={generateDocx}
              disabled={isGeneratingDoc}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-lg hover:shadow-green-500/25 active:scale-95"
            >
              {isGeneratingDoc ? (
                <span className="animate-pulse">Đang xuất file...</span>
              ) : (
                <>
                  <Download size={16} />
                  <span>TẢI FILE WORD (.DOCX)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-slate-50 px-6 py-3 border-b border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm font-bold text-blue-800 animate-pulse">Đang phân tích & tích hợp Năng lực số...</span>
          </div>
          <div className="flex-1 w-full max-w-md flex items-center space-x-3">
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
              </div>
            </div>
            <span className="text-indigo-700 font-extrabold text-sm min-w-[36px]">{Math.floor(progress)}%</span>
          </div>
        </div>
      )}

      {/* Mode Selector Toolbar */}
      <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">Chế độ:</span>
          <div className="bg-white p-1 rounded-xl shadow-inner border border-slate-200 flex space-x-1">
            <button
              onClick={() => { setViewMode('split'); setShowPreview(true); }}
              className={`px-3 py-1.2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'split' && showPreview
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>📱 Song song (Gốc vs NLS)</span>
            </button>
            <button
              onClick={() => { setViewMode('single'); setShowPreview(true); }}
              className={`px-3 py-1.2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'single' && showPreview
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>📄 Giáo án NLS</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="hidden sm:inline font-semibold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-md text-[11px]">
            📝 Times New Roman 13.5pt • Căn đều 2 bên • Lề 1.27cm
          </span>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-blue-700 font-bold hover:underline flex items-center space-x-1 text-xs"
          >
            {showPreview ? (
              <><span>Thu gọn</span> <ChevronUp size={14} /></>
            ) : (
              <><span>Mở rộng</span> <ChevronDown size={14} /></>
            )}
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      {showPreview && (
        <div className="p-4 md:p-6 bg-slate-200/60">
          {viewMode === 'split' ? (
            /* 2 cửa sổ so sánh song song mô phỏng Trang Word A4 */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cửa sổ 1: Giáo án gốc */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden flex flex-col h-[650px]">
                <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 shrink-0">
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-slate-300" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100">1. Giáo án gốc</h3>
                  </div>
                  <span className="text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full font-medium">
                    Văn bản ban đầu
                  </span>
                </div>

                {/* Giả lập trang giấy A4 Word */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white scrollbar-thin text-slate-900" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  {originalContent ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={components as any}
                    >
                      {originalContent}
                    </ReactMarkdown>
                  ) : (
                    <div className="text-slate-400 text-center py-20 flex flex-col items-center justify-center">
                      <FileText size={40} className="mb-3 opacity-40" />
                      <p className="font-medium text-sm">Chưa có văn bản giáo án gốc</p>
                      <p className="text-xs mt-1 text-slate-400">Tải lên file .docx hoặc dán nội dung ở khung bên trên</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cửa sổ 2: Giáo án đã tích hợp NLS */}
              <div className="bg-white rounded-2xl shadow-lg border border-blue-400 overflow-hidden flex flex-col h-[650px]">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-3 flex items-center justify-between border-b border-blue-900 shrink-0">
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-green-300" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-white">2. Giáo án NLS (Toàn văn từ đầu đến cuối)</h3>
                  </div>
                  <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                    NLS màu đỏ
                  </span>
                </div>

                {/* Giả lập trang giấy A4 Word với định dạng chuẩn */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white scrollbar-thin text-slate-900 border-l-4 border-l-blue-600" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  {result ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={components as any}
                    >
                      {generateFullIntegratedPreview(originalContent, result)}
                    </ReactMarkdown>
                  ) : loading ? (
                    <div className="text-slate-400 text-center py-20 flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4 shadow-sm"></div>
                      <p className="font-extrabold text-lg text-blue-600 animate-pulse">Trí tuệ nhân tạo đang phân tích...</p>
                      <p className="text-sm mt-2 text-slate-500 font-medium">Giáo án sẽ xuất hiện theo thời gian thực giống như đang gõ phím</p>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-center py-20 flex flex-col items-center justify-center">
                      <CheckCircle size={40} className="mb-3 opacity-30 text-blue-400" />
                      <p className="font-medium text-sm text-slate-600">Đang chờ tích hợp Năng lực số</p>
                      <p className="text-xs mt-1 text-slate-400 max-w-xs">Sau khi bấm "TÍCH HỢP NĂNG LỰC SỐ", kết quả chèn màu đỏ sẽ hiển thị tại đây</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Chế độ xem 1 cửa sổ (Single Window Mode chuẩn A4) */
            <div className="bg-white rounded-2xl shadow-lg border border-blue-300 overflow-hidden w-full">
              <div className="bg-blue-950 text-white px-5 py-3 flex items-center justify-between border-b border-blue-800">
                <h3 className="font-bold text-xs uppercase tracking-wider flex items-center">
                  <FileText size={15} className="mr-2 text-blue-300" />
                  Giáo án tích hợp Năng lực số (Toàn văn)
                </h3>
                <span className="text-[11px] bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                  Times New Roman 13.5pt
                </span>
              </div>
              <div className="p-8 md:p-12 bg-white text-slate-900 shadow-inner" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                {result ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={components as any}
                  >
                    {generateFullIntegratedPreview(originalContent, result)}
                  </ReactMarkdown>
                ) : loading ? (
                  <div className="text-slate-400 text-center py-16 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4 shadow-sm"></div>
                    <p className="font-extrabold text-lg text-blue-600 animate-pulse">Trí tuệ nhân tạo đang phân tích...</p>
                    <p className="text-sm mt-2 text-slate-500 font-medium">Giáo án sẽ xuất hiện theo thời gian thực giống như đang gõ phím</p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-12 text-sm italic">
                    Chưa có kết quả. Vui lòng bấm "TÍCH HỢP NĂNG LỰC SỐ".
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;