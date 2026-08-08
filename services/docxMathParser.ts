import JSZip from 'jszip';

export interface DocxParseResult {
  text: string;
  images: { base64: string; mimeType: string }[];
  method: 'xml' | 'mammoth' | 'hybrid';
  wmfCount: number;
  ommlCount: number;
}

declare const mammoth: any;

/**
 * Chuyển đổi OMML (Office Math Markup Language) XML Node sang chuỗi LaTeX
 */
function ommlToLatex(mathNode: Element): string {
  let latex = '';

  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const localName = el.localName || el.tagName.split(':').pop();

    switch (localName) {
      case 't': // Math Text
        return el.textContent || '';

      case 'f': { // Fraction
        const num = el.getElementsByTagNameNS('*', 'num')[0];
        const den = el.getElementsByTagNameNS('*', 'den')[0];
        const numText = num ? Array.from(num.childNodes).map(processNode).join('') : '';
        const denText = den ? Array.from(den.childNodes).map(processNode).join('') : '';
        return `\\frac{${numText.trim()}}{${denText.trim()}}`;
      }

      case 'sSup': { // Superscript (x^2)
        const e = el.getElementsByTagNameNS('*', 'e')[0];
        const sup = el.getElementsByTagNameNS('*', 'sup')[0];
        const baseText = e ? Array.from(e.childNodes).map(processNode).join('') : '';
        const supText = sup ? Array.from(sup.childNodes).map(processNode).join('') : '';
        return `${baseText.trim()}^{${supText.trim()}}`;
      }

      case 'sSub': { // Subscript (x_1)
        const e = el.getElementsByTagNameNS('*', 'e')[0];
        const sub = el.getElementsByTagNameNS('*', 'sub')[0];
        const baseText = e ? Array.from(e.childNodes).map(processNode).join('') : '';
        const subText = sub ? Array.from(sub.childNodes).map(processNode).join('') : '';
        return `${baseText.trim()}_{${subText.trim()}}`;
      }

      case 'sSubSup': { // SubSuperscript (x_1^2)
        const e = el.getElementsByTagNameNS('*', 'e')[0];
        const sub = el.getElementsByTagNameNS('*', 'sub')[0];
        const sup = el.getElementsByTagNameNS('*', 'sup')[0];
        const baseText = e ? Array.from(e.childNodes).map(processNode).join('') : '';
        const subText = sub ? Array.from(sub.childNodes).map(processNode).join('') : '';
        const supText = sup ? Array.from(sup.childNodes).map(processNode).join('') : '';
        return `${baseText.trim()}_{${subText.trim()}}^{${supText.trim()}}`;
      }

      case 'rad': { // Radical / Square Root (\sqrt{x})
        const deg = el.getElementsByTagNameNS('*', 'deg')[0];
        const e = el.getElementsByTagNameNS('*', 'e')[0];
        const degText = deg ? Array.from(deg.childNodes).map(processNode).join('') : '';
        const baseText = e ? Array.from(e.childNodes).map(processNode).join('') : '';
        if (degText.trim()) {
          return `\\sqrt[${degText.trim()}]{${baseText.trim()}}`;
        }
        return `\\sqrt{${baseText.trim()}}`;
      }

      case 'nary': { // Integral / Summation
        const chr = el.getElementsByTagNameNS('*', 'chr')[0];
        const sub = el.getElementsByTagNameNS('*', 'sub')[0];
        const sup = el.getElementsByTagNameNS('*', 'sup')[0];
        const e = el.getElementsByTagNameNS('*', 'e')[0];
        const symbol = chr ? chr.getAttribute('m:val') || '\\int' : '\\int';
        const subText = sub ? Array.from(sub.childNodes).map(processNode).join('') : '';
        const supText = sup ? Array.from(sup.childNodes).map(processNode).join('') : '';
        const baseText = e ? Array.from(e.childNodes).map(processNode).join('') : '';
        let result = symbol;
        if (subText.trim()) result += `_{${subText.trim()}}`;
        if (supText.trim()) result += `^{${supText.trim()}}`;
        return `${result} {${baseText.trim()}}`;
      }

      case 'func': { // Trigonometric / Functions (\sin x)
        const fName = el.getElementsByTagNameNS('*', 'fName')[0];
        const e = el.getElementsByTagNameNS('*', 'e')[0];
        const nameText = fName ? Array.from(fName.childNodes).map(processNode).join('') : '';
        const baseText = e ? Array.from(e.childNodes).map(processNode).join('') : '';
        return `\\${nameText.trim()} ${baseText.trim()}`;
      }

      default:
        return Array.from(el.childNodes).map(processNode).join('');
    }
  };

  latex = Array.from(mathNode.childNodes).map(processNode).join('');
  latex = latex.replace(/\s+/g, ' ').trim();
  return latex ? `$${latex}$` : '';
}

/**
 * Trích xuất nội dung DOCX bao gồm công thức toán học và hình ảnh MathType WMF
 */
export async function parseDocxWithMath(arrayBuffer: ArrayBuffer): Promise<DocxParseResult> {
  const images: { base64: string; mimeType: string }[] = [];
  let wmfCount = 0;
  let ommlCount = 0;

  // Bước 1: Dùng Mammoth để convert HTML (Mammoth tự convert WMF -> PNG base64)
  let mammothText = '';
  if (typeof mammoth !== 'undefined') {
    try {
      await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.inline((element: any) => {
            return element.read("base64").then((imageBuffer: string) => {
              const contentType = element.contentType || "image/png";
              images.push({
                base64: imageBuffer,
                mimeType: contentType
              });
              return { src: `data:${contentType};base64,${imageBuffer}` };
            });
          })
        }
      );

      // Lấy raw text từ Mammoth
      const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
      mammothText = rawTextResult.value || '';
    } catch (e) {
      console.warn('[DocxMathParser] Mammoth extraction warning:', e);
    }
  }

  // Bước 2: Unzip DOCX và parse word/document.xml cho OMML + đếm WMF
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Đếm file media WMF/EMF trong zip
    const mediaFiles = zip.folder('word/media');
    if (mediaFiles) {
      mediaFiles.forEach((relativePath) => {
        if (relativePath.toLowerCase().endsWith('.wmf') || relativePath.toLowerCase().endsWith('.emf')) {
          wmfCount++;
        }
      });
    }

    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      const xmlString = await docXmlFile.async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

      // Tìm tất cả các thẻ OMML Math: <m:oMath> hoặc <m:oMathPara>
      const mathNodes = xmlDoc.getElementsByTagNameNS('*', 'oMath');
      ommlCount = mathNodes.length;

      if (ommlCount > 0) {
        // Thay thế từng node oMath bằng text LaTeX $...$
        Array.from(mathNodes).forEach((mathNode) => {
          const latexString = ommlToLatex(mathNode);
          if (latexString) {
            const textNode = xmlDoc.createTextNode(` ${latexString} `);
            mathNode.parentNode?.replaceChild(textNode, mathNode);
          }
        });
      }

        // Trích xuất văn bản + chuyển đổi tất cả các bảng Word <w:tbl> thành Markdown Table
        let parsedXmlText = '';
        const bodyNode = xmlDoc.getElementsByTagNameNS('*', 'body')[0];

        const parseXmlNode = (node: Element) => {
          const localName = node.localName || node.tagName?.split(':').pop();

          if (localName === 'p') {
            const pText = node.textContent || '';
            if (pText.trim()) {
              parsedXmlText += pText.trim() + '\n\n';
            }
          } else if (localName === 'tbl') {
            // Chuyển đổi bảng Word <w:tbl> sang Markdown Table | ... |
            const trNodes = node.getElementsByTagNameNS('*', 'tr');
            const tableRows: string[][] = [];

            Array.from(trNodes).forEach((tr) => {
              const tcNodes = (tr as Element).getElementsByTagNameNS('*', 'tc');
              const rowCells: string[] = [];
              Array.from(tcNodes).forEach((tc) => {
                const cellText = (tc.textContent || '').replace(/\s+/g, ' ').trim();
                rowCells.push(cellText || ' ');
              });
              if (rowCells.length > 0) {
                tableRows.push(rowCells);
              }
            });

            if (tableRows.length > 0) {
              const maxCols = Math.max(...tableRows.map(r => r.length));
              // Chuẩn hóa số cột
              tableRows.forEach(r => {
                while (r.length < maxCols) r.push(' ');
              });

              // Tạo hàng tiêu đề
              const headerRow = tableRows[0];
              parsedXmlText += '\n| ' + headerRow.join(' | ') + ' |\n';
              parsedXmlText += '| ' + headerRow.map(() => '---').join(' | ') + ' |\n';

              // Tạo các hàng dữ liệu
              for (let r = 1; r < tableRows.length; r++) {
                parsedXmlText += '| ' + tableRows[r].join(' | ') + ' |\n';
              }
              parsedXmlText += '\n';
            }
          }
        };

        if (bodyNode) {
          Array.from(bodyNode.childNodes).forEach((child) => {
            if (child.nodeType === Node.ELEMENT_NODE) {
              parseXmlNode(child as Element);
            }
          });
        }

        if (parsedXmlText.trim()) {
          return {
            text: parsedXmlText.trim(),
            images,
            method: wmfCount > 0 ? 'hybrid' : 'xml',
            wmfCount,
            ommlCount
          };
        }
      }
    }
  } catch (e) {
    console.warn('[DocxMathParser] XML parsing failed, falling back to mammoth text:', e);
  }

  // Fallback: Sử dụng text từ Mammoth
  return {
    text: mammothText,
    images,
    method: 'mammoth',
    wmfCount,
    ommlCount
  };
}
