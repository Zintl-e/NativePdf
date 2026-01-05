"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type * as PDFJS from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";

function PdfToJpgToolInner() {
  type ExportFormat = "jpg" | "png" | "webp";

  const [format, setFormat] = useState<ExportFormat>("jpg");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfjsLib, setPdfjsLib] = useState<typeof PDFJS | null>(null);
  const [quality, setQuality] = useState<number>(1);
  const [downloadAllAsZip, setDownloadAllAsZip] = useState(false);

  useEffect(() => {
    const loadPdfjs = async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;
      setPdfjsLib(pdfjs);
    };
    loadPdfjs();
  }, []);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && pdfjsLib) {
      setFile(selectedFile);
      
      try {
        const pdfBytes = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        
        setDownloadAllAsZip(pdf.numPages > 3);
      } catch (err) {
        console.error("Error reading PDF page count:", err);
      }
    }
  };

  const convertPageToBlob = async (page: PDFJS.PDFPageProxy): Promise<Blob> => {
    const scale = 3 * (window.devicePixelRatio || 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const mimeMap = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

    return new Promise<Blob>((resolve, reject) => {
      if (format === "png") {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create PNG blob"))), "image/png");
      } else {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create image blob"))),
          mimeMap[format],
          quality
        );
      }
    });
  };

  const convert = async () => {
    if (!file || !pdfjsLib) return;
    setLoading(true);
    setProgress(0);

    try {
      const pdfBytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

      if (downloadAllAsZip) {
        const zip = new JSZip();
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const blob = await convertPageToBlob(page);
          zip.file(`page-${i}.${format}`, blob);
          setProgress(Math.round((i / pdf.numPages) * 100));
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, `${file.name.replace(/\.pdf$/i, "")}-images.zip`);
      } else {
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const blob = await convertPageToBlob(page);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `page-${i}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setProgress(Math.round((i / pdf.numPages) * 100));
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to convert PDF");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center w-full pt-2 pb-8 px-4 relative">
      <div className="max-w-[1024px] w-full flex flex-col gap-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-xs font-medium w-fit"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to all tools
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
            <span className="material-symbols-outlined text-xl">image</span>
          </div>
          <h1 className="text-xl font-black tracking-tight mt-2">PDF to Image</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            Convert each PDF page into a high-quality image.
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col items-stretch">
        <div className="flex-1 w-full flex flex-col gap-4">
          {/* PDF Upload */}
          <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg p-10 transition-colors hover:border-black dark:hover:border-white cursor-pointer">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span className="material-symbols-outlined text-2xl text-gray-300 group-hover:text-black dark:group-hover:text-white mb-1">
              upload_file
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {file ? file.name : "Click or drag PDF"}
            </p>
          </div>
      
          {/* Formats + Slider + Download All Toggle */}
          {file && (
            <div className="flex items-center justify-between gap-4">
              {/* Format Buttons */}
              <div className="flex gap-2">
                {(["jpg", "png", "webp"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      format === f
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
      
              {/* Quality Slider or PNG Message */}
              <div className="flex-1 flex items-center gap-2 ml-4">
                {format === "png" ? (
                  <span className="text-[11px] font-bold">Download PNG without any loss</span>
                ) : (
                  <>
                    <span className="text-[11px] font-bold">{Math.round(quality * 100)}%</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.01}
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-1 rounded-lg appearance-none bg-black accent-black cursor-pointer"
                    />
                  </>
                )}
              </div>
              </div>

      
              {/* Download All as ZIP Toggle */}
              <div className="ml-4 flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={downloadAllAsZip}
                    onChange={(e) => setDownloadAllAsZip(e.target.checked)} 
                  />

                  <div className="group w-[28px] h-[16px] bg-white border border-black rounded-full flex items-center px-[3px] transition-colors
                    peer-checked:bg-black peer-focus:ring-1 peer-focus:ring-black">
                    
                    <div className={`h-[10px] w-[10px] rounded-full transition-all duration-200 ease-in-out
                      ${downloadAllAsZip 
                        ? "translate-x-[12px] bg-white" 
                        : "translate-x-0 bg-black"
                      }`} 
                    />
                  </div>
                  
                  <span className="ml-2 text-[11px] font-bold text-black uppercase tracking-tight">
                    Download all as ZIP
                  </span>
                </label>
              </div>
            </div>
          )}
      
          {/* Convert Button */}
          {file && (
            <button
              onClick={convert}
              disabled={loading || !pdfjsLib}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                loading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-black text-white hover:opacity-90 dark:bg-white dark:text-black shadow-sm"
              }`}
            >
              {loading ? `Converting (${progress}%)...` : `Convert to ${format.toUpperCase()} Now`}
            </button>
          )}
      
          {/* Progress Bar */}
          {loading && (
            <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-black dark:bg-white h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
       </div>
      </div>

      {/* Loading PDF.js */}
      {!pdfjsLib && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-black dark:border-white border-t-transparent animate-spin rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-tight">Initializing Tools...</span>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(PdfToJpgToolInner), { ssr: false });
