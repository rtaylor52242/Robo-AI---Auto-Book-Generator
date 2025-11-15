
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, DownloadIcon } from './icons';

declare const marked: any;
declare const jspdf: any;
declare const html2canvas: any;

// Fix for window.docx not being recognized by TypeScript
declare global {
  interface Window {
    docx: any;
  }
}

interface StorybookViewerProps {
  bookContent: string;
  bookTitle: string;
  subtitle: string;
  author: string;
  frontCoverImage: string;
  onClose: () => void;
}

const paperTextureUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGZpbHRlciBpZD0ibm9pc2UiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjgiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlciA+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC4wOCIvPjwvc3ZnPg==";
const woodTextureUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJ3b29kIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC4wMiAwLjciIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXXI9InVybCgjd29vZCkiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==";

// Singleton promise to ensure the script is loaded only once.
let docxPromise: Promise<void> | null = null;

const loadDocxScript = (): Promise<void> => {
  // If window.docx is already available, the script is loaded.
  if (window.docx) {
    return Promise.resolve();
  }

  // If the script is already being loaded, return the existing promise.
  if (docxPromise) {
    return docxPromise;
  }

  // Create a new promise for loading the script.
  docxPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/docx@8.5.0/build/index.js';
    script.async = true;

    script.onload = () => {
      if (window.docx) {
        resolve();
      } else {
        // This is a safeguard for an unexpected script behavior.
        docxPromise = null; // Allow retry
        reject(new Error("Script loaded but 'window.docx' was not found."));
      }
    };

    script.onerror = () => {
      // On error, reset the promise to allow retrying, and reject.
      docxPromise = null;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new Error("The 'docx' library script failed to load."));
    };

    document.body.appendChild(script);
  });

  return docxPromise;
};


export const StorybookViewer: React.FC<StorybookViewerProps> = ({ bookContent, bookTitle, subtitle, author, frontCoverImage, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0); // 0: Cover, 1: Spread 1-2, etc.
  const [totalContentPages, setTotalContentPages] = useState(1);
  const [htmlContent, setHtmlContent] = useState('');
  
  const contentMeasureRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (bookContent) {
      setHtmlContent(marked.parse(bookContent));
    }
  }, [bookContent]);

  const calculatePages = useCallback(() => {
    const measureElement = contentMeasureRef.current?.parentElement as HTMLDivElement;
    if (contentMeasureRef.current && pageContainerRef.current && measureElement) {
        // To get an accurate measurement, we temporarily force the hidden measurement
        // element's height to match the visible page container's height.
        measureElement.style.height = `${pageContainerRef.current.clientHeight}px`;

        const style = window.getComputedStyle(measureElement);
        const paddingTop = parseFloat(style.paddingTop);
        const paddingBottom = parseFloat(style.paddingBottom);

        const pageClientHeight = measureElement.clientHeight;
        const contentAreaHeight = pageClientHeight - paddingTop - paddingBottom;
        
        // After measurement, reset the height so scrollHeight gives the total content height.
        measureElement.style.height = '';

        if (contentAreaHeight > 0) {
            setPageHeight(contentAreaHeight);
            
            const contentHeight = contentMeasureRef.current.scrollHeight;
            const pages = Math.ceil(contentHeight / contentAreaHeight);
            setTotalContentPages(pages > 0 ? pages : 1);
        }
    }
  }, [htmlContent]);


  useEffect(() => {
    const doCalculation = () => calculatePages();
    // A timeout ensures that the layout has settled before we measure.
    document.fonts.ready.then(doCalculation);
    const timer = setTimeout(doCalculation, 150);

    const handleResize = () => calculatePages();
    window.addEventListener('resize', handleResize);
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
    }
  }, [calculatePages]);
  
  const totalSpreads = Math.ceil(totalContentPages / 2);

  const changePage = (newPage: number) => {
    setIsAnimating(true);
    setTimeout(() => {
        setCurrentPage(newPage);
        setIsAnimating(false);
    }, 250); // Corresponds to half of the animation duration
  }

  const handleNextPage = () => {
    if (currentPage <= totalSpreads) {
      changePage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      changePage(currentPage - 1);
    }
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
    } catch (e: any) {
        console.error(`Failed to export to ${format}`, e);
        alert(`Failed to export to ${format}. See console for details.`);
    } finally {
        setExporting(null);
    }
  };

  const exportToPDF = async () => {
    const { jsPDF } = jspdf;
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt', // Use points for font sizing
        format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // Page 1: Cover Page
    if (frontCoverImage) {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${frontCoverImage}`;
        await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        
        const imgWidth = contentWidth * 0.8;
        const imgHeight = imgWidth * (4/3); // Maintain 3:4 aspect ratio
        const imgX = (pageWidth - imgWidth) / 2;
        const imgY = margin * 1.5;
        pdf.addImage(img, 'JPEG', imgX, imgY, imgWidth, imgHeight);

        pdf.setFontSize(24).setFont(undefined, 'bold');
        pdf.text(bookTitle, pageWidth / 2, imgY + imgHeight + 40, { align: 'center' });

        pdf.setFontSize(16).setFont(undefined, 'normal');
        pdf.text(`by ${author}`, pageWidth / 2, imgY + imgHeight + 70, { align: 'center' });
    } else {
        pdf.setFontSize(32).setFont(undefined, 'bold');
        pdf.text(bookTitle, pageWidth / 2, pageHeight / 3, { align: 'center' });
        
        pdf.setFontSize(20).setFont(undefined, 'normal');
        pdf.text(`by ${author}`, pageWidth / 2, pageHeight / 3 + 40, { align: 'center' });
    }

    // Subsequent pages: Content
    if (bookContent) {
        pdf.addPage();
        let cursorY = margin;
        const lines = bookContent.split('\n');

        for (const line of lines) {
            let text = line.trim();
            let isHeader1 = false, isHeader2 = false, isHeader3 = false;

            if (text.startsWith('# ')) { isHeader1 = true; text = text.substring(2); }
            else if (text.startsWith('## ')) { isHeader2 = true; text = text.substring(3); }
            else if (text.startsWith('### ')) { isHeader3 = true; text = text.substring(4); }
            
            pdf.setFontSize(isHeader1 ? 18 : isHeader2 ? 14 : isHeader3 ? 12 : 12)
               .setFont(undefined, isHeader1 || isHeader2 || isHeader3 ? 'bold' : 'normal');
            
            if (isHeader1 && cursorY > margin) cursorY += 20;
            else if (isHeader2 && cursorY > margin) cursorY += 15;

            const splitText = pdf.splitTextToSize(text, contentWidth);
            const textHeight = splitText.length * (pdf.getFontSize() * 1.15);
            
            if (cursorY + textHeight > pageHeight - margin) {
                pdf.addPage();
                cursorY = margin;
            }

            pdf.text(splitText, margin, cursorY);
            cursorY += textHeight;
        }
    }

    pdf.save(`${bookTitle}.pdf`);
  }

  const exportToDOCX = async () => {
    try {
        await loadDocxScript();
    } catch (e: any) {
        const errorMsg = "Failed to export to DOCX: The required library could not be loaded. Please check your internet connection and try again.";
        console.error(errorMsg, e);
        alert(errorMsg);
        throw e; // Re-throw to be caught by the calling function's handler
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
    
    const docChildren: any[] = [
        new Paragraph({ text: bookTitle, heading: HeadingLevel.TITLE }),
        new Paragraph({ text: `by ${author}`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({}) // Spacer paragraph
    ];

    // The image markdown line can be extremely long and may cause issues with the docx library.
    // Since it can't be rendered as an image anyway, we filter it out.
    const contentLines = bookContent.split('\n').filter(line => !line.startsWith('![Front Cover]'));

    contentLines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('# ')) {
            docChildren.push(new Paragraph({ text: trimmedLine.substring(2).trim(), heading: HeadingLevel.HEADING_1 }));
        } else if (trimmedLine.startsWith('## ')) {
            docChildren.push(new Paragraph({ text: trimmedLine.substring(3).trim(), heading: HeadingLevel.HEADING_2 }));
        } else if (trimmedLine.startsWith('### ')) {
            docChildren.push(new Paragraph({ text: trimmedLine.substring(4).trim(), heading: HeadingLevel.HEADING_3 }));
        } else if (trimmedLine) {
            docChildren.push(new Paragraph({ children: [new TextRun(trimmedLine)] }));
        } else {
            // Add an empty paragraph for spacing, which corresponds to an empty line in the source.
            docChildren.push(new Paragraph({}));
        }
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: docChildren,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bookTitle}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const leftPageNum = (currentPage - 1) * 2 + 1;
  const rightPageNum = (currentPage - 1) * 2 + 2;

  // Render a hidden, full-height version of the content to measure it
  const contentForMeasuring = (
    <div className="absolute top-0 left-0 w-1/2 -z-10 opacity-0 pointer-events-none p-12">
      <div ref={contentMeasureRef} className="prose max-w-none font-lora" dangerouslySetInnerHTML={{ __html: htmlContent }}/>
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: `#3a2d27 url('${woodTextureUrl}')` }} onClick={onClose}>
        {/* Hidden content for measurement */}
        {contentForMeasuring}

      <div className="relative w-full max-w-5xl h-[85vh] rounded-lg p-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-2 text-white bg-black/50 rounded-full hover:bg-black/80 z-20">
          <XMarkIcon className="w-6 h-6" />
        </button>

        {exporting && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 rounded-lg">
                <p className="text-white text-lg">{exporting}</p>
            </div>
        )}

        <div className="flex-grow relative overflow-hidden flex justify-center items-center" ref={pageContainerRef}>
          <div className={`transition-opacity duration-500 w-full h-full flex justify-center items-center ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            {/* Cover Page */}
            {currentPage === 0 && (
              <div className="relative w-1/2 h-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.75)] rounded-lg overflow-hidden">
                <img src={`data:image/jpeg;base64,${frontCoverImage}`} alt="Front Cover" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 flex flex-col items-center justify-center p-6 text-center">
                    <h2 
                        className="text-2xl md:text-4xl font-bold text-white font-lora" 
                        style={{ textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}
                    >
                        {bookTitle}
                    </h2>
                    {subtitle && (
                      <p 
                        className="text-base md:text-lg text-white/90 font-lora mt-2"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                      >
                        {subtitle}
                      </p>
                    )}
                    <div className="w-1/4 h-px bg-white/50 my-4"></div>
                    <p 
                        className="text-xl md:text-2xl text-white font-lora"
                        style={{ textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}
                    >
                        {author}
                    </p>
                </div>
              </div>
            )}
            
            {/* Content Pages */}
            {currentPage > 0 && (
              <div className="flex w-full h-full book-spread shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]">
                {/* Left Page */}
                <div className="w-1/2 p-12 bg-[#FBF6EE] text-black overflow-hidden font-lora relative rounded-l-lg shadow-[inset_-10px_0_15px_-10px_rgba(0,0,0,0.4)]" style={{ backgroundImage: `url('${paperTextureUrl}')`}}>
                    <div style={{ transform: `translateY(-${(leftPageNum - 1) * pageHeight}px)`}}>
                        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: htmlContent }}/>
                    </div>
                    <p className="absolute bottom-6 left-12 text-sm text-gray-500 font-lora">{leftPageNum}</p>
                </div>

                {/* Spine */}
                <div className="w-6 bg-[#312E2B] shadow-inner" style={{ backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.4) 100%)' }}></div>
                
                {/* Right Page */}
                <div className="w-1/2 p-12 bg-[#FBF6EE] text-black overflow-hidden font-lora relative rounded-r-lg shadow-[inset_10px_0_15px_-10px_rgba(0,0,0,0.4)]" style={{ backgroundImage: `url('${paperTextureUrl}')`}}>
                   {rightPageNum <= totalContentPages && (
                     <>
                        <div style={{ transform: `translateY(-${(rightPageNum - 1) * pageHeight}px)`}}>
                            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: htmlContent }}/>
                        </div>
                        <p className="absolute bottom-6 right-12 text-sm text-gray-500 font-lora">{rightPageNum}</p>
                     </>
                   )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 mt-auto text-white">
            <button onClick={handlePrevPage} disabled={currentPage === 0 || isAnimating} className="px-4 py-2 bg-indigo-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                Previous
            </button>
            <div className="text-center">
              <div className="flex gap-2 justify-center">
                <button onClick={() => handleExport('pdf')} className="p-2 hover:bg-white/20 rounded-full" title="Export as PDF"><DownloadIcon className="w-5 h-5"/></button>
                <button onClick={() => handleExport('docx')} className="p-2 hover:bg-white/20 rounded-full" title="Export as DOCX"><DownloadIcon className="w-5 h-5"/></button>
                <button onClick={() => handleExport('html')} className="p-2 hover:bg-white/20 rounded-full" title="Export as HTML"><DownloadIcon className="w-5 h-5"/></button>
                <button onClick={() => handleExport('md')} className="p-2 hover:bg-white/20 rounded-full" title="Export as Markdown"><DownloadIcon className="w-5 h-5"/></button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                 {currentPage === 0 ? 'Cover' : `Spread ${currentPage} of ${totalSpreads}`}
              </p>
            </div>
            <button onClick={handleNextPage} disabled={currentPage > totalSpreads || isAnimating} className="px-4 py-2 bg-indigo-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                Next
            </button>
        </div>
      </div>
    </div>
  );
}