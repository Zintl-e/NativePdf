"use client";

import { PDFDocument } from "pdf-lib";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";

export default function MergeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | undefined>(undefined);
  const [showPreview, setShowPreview] = useState(false);
  
  const [duplicatePopup, setDuplicatePopup] = useState<{show: boolean, name: string}>({
    show: false,
    name: ""
  });

  useEffect(() => {
    return () => {
      if (mergedPdfUrl) URL.revokeObjectURL(mergedPdfUrl);
    };
  }, [mergedPdfUrl]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      const duplicate = newFiles.find(newFile => 
        files.some(existingFile => existingFile.name === newFile.name)
      );

      if (duplicate) {
        setDuplicatePopup({ show: true, name: duplicate.name });
        setTimeout(() => setDuplicatePopup({ show: false, name: "" }), 3000);
        e.target.value = ""; 
        return;
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setMergedPdfUrl(undefined);
      setShowPreview(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMergedPdfUrl(undefined);
    setShowPreview(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((f) => f.name === active.id);
      const newIndex = files.findIndex((f) => f.name === over.id);
      setFiles(arrayMove(files, oldIndex, newIndex));
    }
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Select at least 2 PDFs to merge.");
      return;
    }
    setLoading(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
      setShowPreview(true);
    } catch (err) {
      console.error(err);
      alert("Error merging PDFs.");
    } finally {
      setLoading(false);
    }
  };

  const downloadMergedPDF = () => {
    if (!mergedPdfUrl) return;
    const link = document.createElement("a");
    link.href = mergedPdfUrl;
    link.download = "merged-documents.pdf";
    link.click();
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
            <span className="material-symbols-outlined text-xl">call_merge</span>
          </div>
          <h1 className="text-xl font-black tracking-tight mt-2">Merge PDF</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            Combine multiple PDF files into one.
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-8 items-stretch transition-all duration-300">
          
          <div className={`flex flex-col gap-4 transition-all duration-500 ${showPreview ? "flex-1" : "w-full max-w-2xl mx-auto"}`}>
            <div className={`relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg transition-colors hover:border-black dark:hover:border-white cursor-pointer ${showPreview ? "p-6" : "p-16"}`}>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <span className="material-symbols-outlined text-2xl text-gray-300 group-hover:text-black dark:group-hover:text-white mb-1">
                upload_file
              </span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                {showPreview ? "Add More" : "Click or drag PDFs to start"}
              </p>
            </div>

            {files.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={files.map((f) => f.name)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1.5">
                    {files.map((file, idx) => (
                      <SortableItem key={file.name} id={file.name} file={file} index={idx} removeFile={removeFile} />
                    ))}
                  </div>
                </SortableContext>

                <button
                  onClick={mergePDFs}
                  disabled={loading}
                  className={`w-full mt-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    loading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white hover:opacity-90 dark:bg-white dark:text-black shadow-sm"
                  }`}
                >
                  {loading ? "Merging Documents..." : "Merge Files Now"}
                </button>
              </DndContext>
            )}
          </div>

          {showPreview && mergedPdfUrl && (
            <div className="flex-1 w-full flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-gray-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Ready to Save</span>
                </div>
                <button
                  onClick={downloadMergedPDF}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-[11px] font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download PDF
                </button>
              </div>

              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-800 h-[480px] bg-gray-100 dark:bg-neutral-800">
                <iframe
                  src={mergedPdfUrl}
                  className="w-full h-full"
                  title="Merged PDF Preview"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {duplicatePopup.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
          <div className="bg-[#141414] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
            <span className="material-symbols-outlined text-red-500 text-lg">error</span>
            <p className="text-[12px] font-medium whitespace-nowrap">
              <span className="opacity-70">File</span> {duplicatePopup.name} <span className="opacity-70">is already added.</span>
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out forwards; }
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-slide-down { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}