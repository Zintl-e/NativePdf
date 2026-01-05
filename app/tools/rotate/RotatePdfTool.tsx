"use client";

import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from "jspdf";
import Link from "next/link";

// Automatically pulls the version from your installed node_modules
const PDF_JS_VERSION = pdfjsLib.version;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;

interface PageRotation {
  id: number;
  angle: number;
  url: string;
}

export default function RotatePdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageRotation[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);
  const [globalAngle, setGlobalAngle] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const loadedPages: PageRotation[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;

        loadedPages.push({
          id: i,
          angle: 0,
          url: canvas.toDataURL(),
        });
      }
      setPages(loadedPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const rotatePage = (index: number, direction: 'right' | 'left') => {
    const change = direction === 'right' ? 90 : -90;
    if (applyToAll) {
      setGlobalAngle(prev => (prev + change) % 360);
    } else {
      setPages(prev => prev.map((p, i) => 
        i === index ? { ...p, angle: (p.angle + change) % 360 } : p
      ));
    }
  };

  const exportRotatedPDF = async () => {
    if (!file) return;
    setLoading(true);
  
    try {
      const pdfBytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      let output: jsPDF | null = null;
  
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const pageRotation = applyToAll ? globalAngle : pages[i - 1].angle;
        const finalRotation = (pageRotation % 360 + 360) % 360;
        
        const viewport = page.getViewport({ scale: 2, rotation: finalRotation });
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
  
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
  
        if (!output) {
          output = new jsPDF({
            orientation: pageWidth > pageHeight ? "landscape" : "portrait",
            unit: "pt",
            format: [pageWidth, pageHeight],
          });
        } else {
          output.addPage([pageWidth, pageHeight], pageWidth > pageHeight ? "landscape" : "portrait");
        }
  
        output.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }
  
      output?.save(`rotated-${file.name}`);
    } catch (e) {
      console.error("Export Error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={file ? "animate-[fadeIn_0.4s_ease-out_forwards]" : ""}>
    <div className="flex flex-col items-center w-full pt-2 pb-8 px-4 relative bg-gray-50/50 min-h-screen dark:bg-black">
      <div className="max-w-[1024px] w-full flex flex-col gap-4">
        
        <Link
          href="/"
          className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-xs font-medium w-fit"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to all tools
        </Link>

        {/* Header - Hides once a file is selected */}
        {!file && (
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
              <span className="material-symbols-outlined text-xl">rotate_right</span>
            </div>
            <h1 className="text-xl font-black tracking-tight mt-2 dark:text-white">Rotate PDF</h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              Rotate individual pages or the entire document.
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row gap-8 items-stretch transition-all duration-300">
          
          {/* Main Area */}
          <div className="flex-[2.5] flex flex-col gap-4">
            {!file ? (
              <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-xl p-16 transition-colors hover:border-black dark:hover:border-white cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="material-symbols-outlined text-3xl text-gray-300 group-hover:text-black dark:group-hover:text-white mb-2">
                  upload_file
                </span>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Click or drag PDF to start
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-2 overflow-y-auto max-h-[600px] animate-fade-in">
               {pages.map((p, idx) => {
                const currentAngle = applyToAll ? globalAngle : p.angle;
                const isSideways = (currentAngle / 90) % 2 !== 0;
              
                return (
                  <div key={p.id} className="flex flex-col gap-2">
                    <div 
                      className="relative group bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-100 dark:border-neutral-700 shadow-sm transition-all duration-300 ease-in-out flex items-center justify-center overflow-hidden"
                      style={{ 
                        aspectRatio: isSideways ? "4 / 3" : "3 / 4",
                      }}
                    >
                      <div 
                        className="w-full h-full transition-transform duration-300 ease-in-out flex items-center justify-center"
                        style={{ 
                          transform: `rotate(${currentAngle}deg)`,
                          width: isSideways ? "75%" : "100%",
                          height: isSideways ? "133.33%" : "100%",
                        }}
                      >
                        <img
                          src={p.url}
                          className="w-full h-full object-contain pointer-events-none"
                          alt={`Page ${p.id}`}
                        />
                      </div>
                      
                      {/* Overlay Controls */}
                      {!applyToAll && (
                        <div className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={() => rotatePage(idx, 'left')} 
                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 shadow-lg"
                          >
                            <span className="material-symbols-outlined text-sm">rotate_left</span>
                          </button>
                          <button 
                            onClick={() => rotatePage(idx, 'right')} 
                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 shadow-lg"
                          >
                            <span className="material-symbols-outlined text-sm">rotate_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-center font-bold text-gray-400 uppercase tracking-tighter">
                      Page {p.id}
                    </p>
                  </div>
                );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          {file && (
            <div className="flex-1 lg:max-w-[260px] flex flex-col gap-4 animate-fade-in">
              <div className="bg-gray-50 dark:bg-neutral-800/50 p-5 rounded-xl border border-gray-100 dark:border-neutral-800 flex flex-col gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Settings</label>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Apply to all pages</span>
                    <button
                      onClick={() => setApplyToAll(!applyToAll)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        applyToAll ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-neutral-700'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full transition-transform ${
                        applyToAll ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-1 bg-gray-400'
                      }`} />
                    </button>
                  </div>

                  {applyToAll && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button 
                        onClick={() => rotatePage(0, 'left')} 
                        className="flex items-center justify-center gap-1 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">rotate_left</span> Left
                      </button>
                      <button 
                        onClick={() => rotatePage(0, 'right')} 
                        className="flex items-center justify-center gap-1 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                         Right <span className="material-symbols-outlined text-sm">rotate_right</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={exportRotatedPDF}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    loading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-neutral-800"
                      : "bg-black text-white hover:opacity-90 dark:bg-white dark:text-black shadow-md"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {loading ? 'hourglass_empty' : 'download'}
                  </span>
                  {loading ? "Processing..." : "Export PDF"}
                </button>
              </div>
              
              <button 
                onClick={() => { setFile(null); setPages([]); }}
                className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest text-center"
              >
                Clear File
              </button>
            </div>
          )}
        </div>
      </div>

      </div>
    </div>
  );
}