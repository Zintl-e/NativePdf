"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from "jspdf";
import { Rnd } from "react-rnd";

const PDF_JS_VERSION = "4.2.67";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;

interface PageData {
  id: number;
  url: string;
  width: number;
  height: number;
  crop: { x: number; y: number; width: number; height: number };
  scale: number;
}

export default function CropPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [applyToAll, setApplyToAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [flashApply, setFlashApply] = useState(false);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset states for the new file
    setPages([]);
    setFile(selectedFile);
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const newPages: PageData[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.2;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;

        newPages.push({
          id: i,
          url: canvas.toDataURL(),
          width: viewport.width,
          height: viewport.height,
          scale,
          crop: {
            x: 0,
            y: 0,
            width: viewport.width * 1.57,
            height: viewport.height * 1.51,
          },
        });
      }
      setPages(newPages);
      setActivePageIndex(0);
      setFlashApply(true);
      setTimeout(() => setFlashApply(false), 1500); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateCrop = (index: number, newCrop: PageData['crop']) => {
    setPages((prev) =>
      prev.map((p, i) =>
        applyToAll || i === index ? { ...p, crop: newCrop } : p
      )
    );
  };


  const processDownload = async () => {
    if (!file || pages.length === 0) return;
    setLoading(true);

    try {
      const pdfBytes = await file.arrayBuffer();
      const loadingTask: pdfjsLib.PDFDocumentLoadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf: pdfjsLib.PDFDocumentProxy = await loadingTask.promise;

      // Use higher render scale for better quality output
      const renderScale = 2;
      let output: jsPDF | null = null;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const pageData = pages[i - 1];

        // Render at higher scale for quality
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Cannot get canvas context");
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert crop coordinates from preview scale (1.2) to render scale
        const scaleRatio = renderScale / pageData.scale;
        const cropX = Math.round(pageData.crop.x * scaleRatio);
        const cropY = Math.round(pageData.crop.y * scaleRatio);
        const cropWidth = Math.round(pageData.crop.width * scaleRatio);
        const cropHeight = Math.round(pageData.crop.height * scaleRatio);

        // Ensure crop bounds don't exceed canvas
        const safeX = Math.max(0, Math.min(cropX, canvas.width - 1));
        const safeY = Math.max(0, Math.min(cropY, canvas.height - 1));
        const safeWidth = Math.min(cropWidth, canvas.width - safeX);
        const safeHeight = Math.min(cropHeight, canvas.height - safeY);

        // Create cropped canvas
        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = safeWidth;
        croppedCanvas.height = safeHeight;

        const croppedCtx = croppedCanvas.getContext("2d");
        if (!croppedCtx) throw new Error("Cannot get cropped canvas context");

        croppedCtx.drawImage(
          canvas,
          safeX, safeY, safeWidth, safeHeight,
          0, 0, safeWidth, safeHeight
        );

        const imgData = croppedCanvas.toDataURL("image/jpeg", 0.95);
        const pdfWidth = safeWidth / renderScale;
        const pdfHeight = safeHeight / renderScale;

        if (i === 1) {
          output = new jsPDF({
            unit: "px",
            format: [pdfWidth, pdfHeight],
            hotfixes: ["px_scaling"]
          });
        } else if (output) {
          output.addPage([pdfWidth, pdfHeight]);
        }

        if (output) {
          output.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
        }
      }

      if (output) {
        output.save(`cropped-${file.name}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const triggerChangeFile = () => fileInputRef.current?.click();

  return (

    <div className="flex flex-col items-center w-full pt-2 pb-8 px-4 relative bg-gray-50/50 min-h-screen dark:bg-black">
      <div className="max-w-[1024px] w-full flex flex-col gap-4">

        <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-xs font-medium w-fit">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to all tools
        </Link>

        {!file && (
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
              <span className="material-symbols-outlined text-xl">crop</span>
            </div>
            <h1 className="text-xl font-black tracking-tight mt-2 dark:text-white">Crop PDF</h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Precisely trim and adjust your PDF documents.</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <div className="flex-[2.5] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm min-h-[400px] flex flex-col">
            {!file ? (
              <div className="flex-1 relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-xl transition-colors hover:border-black dark:hover:border-white cursor-pointer">
                <input type="file" accept="application/pdf" onChange={handleSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">upload_file</span>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Select PDF File</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {pages.length > 0 && pages[activePageIndex] ? (
                  <>
                    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-neutral-950 rounded-xl border border-gray-100 dark:border-neutral-800 overflow-hidden py-8">
                      <div className="relative shadow-2xl" style={{ width: 280, height: 380 }}>
                        <img src={pages[activePageIndex].url} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                        <Rnd
                          bounds="parent"
                          size={{ width: pages[activePageIndex].crop.width * 0.25, height: pages[activePageIndex].crop.height * 0.25 }}
                          position={{ x: pages[activePageIndex].crop.x * 0.25, y: pages[activePageIndex].crop.y * 0.25 }}
                          onDragStop={(e, d) =>
                            updateCrop(activePageIndex, {
                              ...pages[activePageIndex].crop,
                              x: d.x / 0.25,
                              y: d.y / 0.25,
                            })
                          }
                          onResizeStop={(e, dir, ref, delta, pos) =>
                            updateCrop(activePageIndex, {
                              ...pages[activePageIndex].crop,
                              width: parseFloat(ref.style.width) / 0.25,
                              height: parseFloat(ref.style.height) / 0.25,
                              x: pos.x / 0.25,
                              y: pos.y / 0.25,
                            })
                          }
                          className="border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] z-10"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto mt-4 pb-2 custom-scrollbar">
                      {pages.map((p, idx) => (
                        <button
                          key={p.id}
                          onClick={() => setActivePageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-20 rounded-lg border-2 transition-all overflow-hidden ${activePageIndex === idx ? "border-black dark:border-white shadow-md" : "border-transparent opacity-50 hover:opacity-100"
                            }`}
                        >
                          <img src={p.url} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Generating Previews...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 lg:max-w-[260px] flex flex-col">
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm h-full flex flex-col justify-between gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">
                  Settings
                </label>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-gray-500">Pages</span>
                    <span className="text-[11px] font-black bg-gray-50 dark:bg-neutral-800 px-2 py-0.5 rounded dark:text-gray-300">
                      {pages.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500">Apply to all</span>
                    <button
                      onClick={() => setApplyToAll(!applyToAll)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${applyToAll ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-neutral-800'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full transition-transform ${applyToAll ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-1 bg-gray-400'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <input type="file" ref={fileInputRef} accept="application/pdf" onChange={handleSelect} className="hidden" />

                {file && (
                  <button
                    onClick={triggerChangeFile}
                    className="w-full py-2.5 rounded-xl text-[11px] font-bold border border-red-200 dark:border-neutral-800 text-red-200 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                    Change PDF
                  </button>
                )}

                <button
                  onClick={processDownload}
                  disabled={loading || !file || pages.length === 0}
                  className={`w-full py-3.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${loading || !file || pages.length === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-neutral-800"
                    : "bg-black text-white dark:bg-white dark:text-black hover:opacity-90 shadow-md"
                    }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{loading ? 'hourglass_empty' : 'download'}</span>
                  {loading ? "Processing..." : "Export PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}