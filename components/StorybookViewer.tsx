import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, DownloadIcon } from './icons';

declare const marked: any;
declare const jspdf: any;
declare const html2canvas: any;

interface StorybookViewerProps {
  bookContent: string;
  bookTitle: string;
  author: string;
  frontCoverImage: string;
  onClose: () => void;
}

export const StorybookViewer: React.FC<StorybookViewerProps> = ({ bookContent, bookTitle, author, frontCoverImage, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [htmlContent, setHtmlContent] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (bookContent) {
      setHtmlContent(marked.parse(bookContent));
    }
  }, [bookContent]);

  const calculatePages = useCallback(() => {
    if (contentRef.current && viewerRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const viewerHeight = viewerRef.current.clientHeight;
      const pages = Math.ceil(contentHeight / viewerHeight);
      setTotalPages(pages > 0 ? pages : 1);
    }
  }, [htmlContent]);

  useEffect(() => {
    calculatePages();
    const handleResize = () => calculatePages();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculatePages]);
  
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  
  const handleExport = async (format: 'pdf' | 'docx' | 'html' | 'md') => {
    setExporting(`Exporting to ${format.toUpperCase()}...`);
    try {
        switch (format) {
            case 'pdf': await exportToPDF(); break;
            case 'docx': await exportToDOCX(); break;
            case 'html': await exportToHTML(); break;
            case 'md': await exportToMD(); break;
        }
    } catch (e) {
        console.error(`Failed to export to ${format}`, e);
        alert(`Failed to export to ${format}. See console for details.`);
    } finally {
        setExporting(null);
    }
  };

  const exportToPDF = async () => {
    const { jsPDF } = jspdf;
    const pdf = new jsPDF('p', 'px', 'a4');
    const pageContainer = viewerRef.current;
    if (!pageContainer || !contentRef.current) return;
    
    // Add cover page
    if (frontCoverImage) {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${frontCoverImage}`;
        await new Promise(resolve => img.onload = resolve);
        pdf.addImage(img, 'JPEG', 40, 40, 365, 486);
        pdf.setFontSize(24);
        pdf.text(bookTitle, pdf.internal.pageSize.getWidth() / 2, 550, { align: 'center' });
        pdf.setFontSize(16);
        pdf.text(`by ${author}`, pdf.internal.pageSize.getWidth() / 2, 580, { align: 'center' });
    }

    const originalScrollTop = pageContainer.scrollTop;
    for (let i = 0; i < totalPages; i++) {
        pdf.addPage();
        pageContainer.scrollTop = i * pageContainer.clientHeight;
        await new Promise(resolve => setTimeout(resolve, 100)); // Allow render
        const canvas = await html2canvas(pageContainer, {
            scrollY: -window.scrollY,
            useCORS: true,
            height: pageContainer.clientHeight,
            y: pageContainer.clientHeight * i,
        });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    }
    
    pageContainer.scrollTop = originalScrollTop;
    pdf.deletePage(1); // remove blank page
    pdf.save(`${bookTitle}.pdf`);
  }

  const exportToDOCX = async () => {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = (window as any).docx;
      const paragraphs: any[] = [];
      
      bookContent.split('\n').forEach(line => {
          if (line.startsWith('# ')) {
              paragraphs.push(new Paragraph({ text: line.substring(2), heading: HeadingLevel.HEADING_1 }));
          } else if (line.startsWith('## ')) {
              paragraphs.push(new Paragraph({ text: line.substring(3), heading: HeadingLevel.HEADING_2 }));
          } else if (line.startsWith('### ')) {
              paragraphs.push(new Paragraph({ text: line.substring(4), heading: HeadingLevel.HEADING_3 }));
          } else {
              paragraphs.push(new Paragraph({ children: [new TextRun(line)] }));
          }
      });

      const doc = new Document({
          sections: [{
              properties: {},
              children: [
                  new Paragraph({ text: bookTitle, heading: HeadingLevel.TITLE }),
                  new Paragraph({ text: `by ${author}`, heading: HeadingLevel.HEADING_2 }),
                  ...paragraphs
              ],
          }],
      });

      const blob = await Packer.toBlob(doc);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${bookTitle}.docx`;
      link.click();
  }

  const exportToHTML = async () => {
    const htmlFileContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${bookTitle}</title>
            <style>
                body { font-family: serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; }
                h1, h2, h3 { line-height: 1.2; }
                img { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            <h1>${bookTitle}</h1>
            <h2>by ${author}</h2>
            <hr>
            ${htmlContent}
        </body>
        </html>
    `;
    const blob = new Blob([htmlFileContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bookTitle}.html`;
    link.click();
  }

  const exportToMD = async () => {
      const blob = new Blob([bookContent], { type: 'text/markdown' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${bookTitle}.md`;
      link.click();
  }


  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-gray-900 border border-indigo-500/30 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col text-white relative">
            <header className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-indigo-300 truncate pr-4">{bookTitle}</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                <XMarkIcon className="w-6 h-6" />
            </button>
            </header>
            <div className="flex-grow overflow-hidden relative" ref={viewerRef}>
            <div
                ref={contentRef}
                className="font-lora text-lg p-8 md:p-12 leading-relaxed transition-transform duration-500 ease-in-out"
                style={{ transform: `translateY(-${(currentPage - 1) * (viewerRef.current?.clientHeight || 0)}px)` }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            ></div>
            </div>
            <footer className="flex items-center justify-between p-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                    <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="btn-secondary text-sm">PDF</button>
                    <button onClick={() => handleExport('docx')} disabled={!!exporting} className="btn-secondary text-sm">DOCX</button>
                    <button onClick={() => handleExport('html')} disabled={!!exporting} className="btn-secondary text-sm">HTML</button>
                    <button onClick={() => handleExport('md')} disabled={!!exporting} className="btn-secondary text-sm">MD</button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevPage} disabled={currentPage === 1} className="disabled:opacity-50">Prev</button>
                    <span className="text-sm font-mono">{currentPage} / {totalPages}</span>
                    <button onClick={handleNextPage} disabled={currentPage === totalPages} className="disabled:opacity-50">Next</button>
                </div>
            </footer>
            {exporting && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
                    <p className="text-indigo-300">{exporting}</p>
                </div>
            )}
        </div>
    </div>
  );
};