"use client";

import { useState, useRef } from "react";
import mammoth from "mammoth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Link from "next/link";

export default function WordToPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Shared processing logic to keep formatting consistent
  const processToPdf = async (merge: boolean) => {
    if (files.length === 0 || !previewRef.current) return;
    setLoading(true);
    setProgress(5);

    try {
      const pdf = merge ? new jsPDF("p", "mm", "a4") : null;
      const pageWidth = 210;
      const pageHeight = 297;

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        
        // DOCX → HTML
        const arrayBuffer = await currentFile.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        previewRef.current.innerHTML = result.value;

        // HTML → Canvas (Scaling for quality)
        const canvas = await html2canvas(previewRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const targetPdf = merge ? pdf! : new jsPDF("p", "mm", "a4");
        
        if (merge && i > 0) targetPdf.addPage();

        let heightLeft = imgHeight;
        let position = 0;

        // Add content (handling multi-page Word docs)
        targetPdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          targetPdf.addPage();
          targetPdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        if (!merge) {
          targetPdf.save(currentFile.name.replace(".docx", "") + ".pdf");
        }

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      if (merge && pdf) {
        pdf.save("combined_documents.pdf");
      }
    } catch (err) {
      console.error(err);
      alert("Conversion failed. Please check your files.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center w-full pt-2 pb-8 px-4 relative">
      <div className="max-w-[800px] w-full flex flex-col gap-4">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white text-xs font-medium transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back
          </Link>
          {files.length > 0 && (
            <button 
              onClick={() => setFiles([])} 
              className="text-[7px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 hover:opacity-70 transition-opacity"
            >
              <span className="material-symbols-outlined text-[10px]">restart_alt</span> Clear All
            </button>
          )}
        </div>

        {/* Dynamic Title Section */}
        {files.length === 0 && (
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
            </div>
            <h1 className="text-xl font-black tracking-tight mt-2">Word to PDF</h1>
            <p className="text-[13px] text-gray-400 mt-1">Convert multiple DOCX files to professional PDF documents.</p>
          </div>
        )}

        {/* Upload Bar */}
        <div className={`bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-sm transition-all duration-300 ${files.length > 0 ? "p-6" : "p-7"}`}>
          <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg p-10 transition-colors hover:border-black dark:hover:border-white cursor-pointer">
            <input 
              type="file" 
              accept=".docx" 
              multiple
              onChange={handleSelect} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
            <span className="material-symbols-outlined text-2xl text-gray-300 mb-1">
              add_circle
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {files.length > 0 ? "Add More Word Files" : "Choose Word Documents (.docx)"}
            </p>
          </div>
        </div>

        {/* Action Section */}
        {files.length > 0 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* File List Cards */}
            <div className="grid grid-cols-1 gap-2">
              {files.map((file, idx) => (
                <div key={idx} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">description</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5">File {idx + 1}</p>
                    <h3 className="text-sm font-bold truncate tracking-tight">{file.name}</h3>
                    <p className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => removeFile(idx)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Settings & Convert Box */}
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
              {loading ? (
                <div className="space-y-3">
                  <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-black dark:bg-white h-full transition-all duration-300" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <p className="text-[9px] font-black text-center text-black dark:text-white uppercase tracking-widest animate-pulse">
                    Processing Batch... {progress}%
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button 
                    onClick={() => processToPdf(false)}
                    className="w-full py-3.5 border border-gray-200 dark:border-neutral-700 text-black dark:text-white rounded-xl text-xs font-black hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Separate PDFs
                  </button>
                  <button 
                    onClick={() => processToPdf(true)}
                    className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black shadow-lg hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">merge</span>
                    One Combined PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden Preview Container */}
        <div className="fixed left-[-9999px] top-0 shadow-none">
          <div
            ref={previewRef}
            id="preview-container"
            className="bg-white text-black p-[40px] w-[794px]"
            style={{ fontFamily: "serif", lineHeight: "1.5" }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        
        :global(#preview-container img) {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}