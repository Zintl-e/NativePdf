"use client";

import { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import Link from "next/link";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Thumbnail {
  id: string;
  src: string;
  originalIndex: number;
}

interface SortableThumbnailProps {
  id: string;
  src: string;
  index: number;
  isSelected: boolean;
  toggleSelect: (index: number) => void;
  onDelete: (index: number) => void;
}

function SortableThumbnail({ id, src, index, isSelected, toggleSelect, onDelete }: SortableThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-[3/4] rounded-lg border-2 cursor-pointer transition-all group ${
        isSelected 
          ? 'border-blue-600 ring-2 ring-blue-500/10 scale-[0.98]' 
          : 'border-gray-100 dark:border-neutral-800 hover:border-black'
      } ${isDragging ? 'opacity-50 border-blue-400' : ''}`}
    >
      {/* Drag Handle & Click Area */}
      <div 
        {...attributes} 
        {...listeners} 
        onClick={() => toggleSelect(index)}
        className="w-full h-full"
      >
        <img src={src} className="w-full h-full object-cover rounded-md pointer-events-none" alt={`Page ${index + 1}`} />
      </div>

      {isSelected && (
       <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-blue-600/70 text-white text-[8px] font-bold px-2 py-[0.5px] rounded-sm flex items-center justify-center pointer-events-none">
          Selected
        </div>
      )}

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(index);
        }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md z-10"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>

      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${
        isSelected ? 'bg-blue-600 text-white' : 'bg-black/60 text-white'
      }`}>
        {index + 1}
      </div>
    </div>
  );
}

export default function SplitTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState("");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);
  const [pdfjs, setPdfjs] = useState<typeof import("pdfjs-dist/legacy/build/pdf.mjs") | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const initPdfJs = async () => {
      const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjsModule.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url
      ).toString();
      setPdfjs(pdfjsModule);
    };
    initPdfJs();
  }, []);

  useEffect(() => {
    if (file && pdfjs) generateThumbnails();
  }, [file, pdfjs]);

  const generateThumbnails = async () => {
    setLoading(true);
    try {
      const arrayBuffer = await file!.arrayBuffer();
      if (!pdfjs) throw new Error("Internal server Error");
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const thumbs: Thumbnail[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        thumbs.push({ id: `p-${i}-${Math.random()}`, src: canvas.toDataURL(), originalIndex: i - 1 });
      }
      setThumbnails(thumbs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setThumbnails((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setSelectedPages([]); // Reset selection on move to prevent index mismatch
    }
  };

  const deletePage = (index: number) => {
    setThumbnails(prev => prev.filter((_, i) => i !== index));
    setSelectedPages(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

 const processPdf = async () => {
  if (!file) return;
  setProcessing(true);

  try {
    const bytes = await file.arrayBuffer();
    const originalPdf = await PDFDocument.load(bytes);
    const newPdf = await PDFDocument.create();

    // Determine pages to include
    let finalOrder = thumbnails;
    const finalIndices = new Set(selectedPages);

    if (pageRange.trim()) {
      pageRange.split(",").forEach(p => {
        const n = parseInt(p.trim(), 10) - 1;
        if (!isNaN(n) && n >= 0 && n < thumbnails.length) {
          finalIndices.add(n);
        }
      });
    }

    if (finalIndices.size > 0) {
      finalOrder = thumbnails.filter((_, idx) => finalIndices.has(idx));
    }

    const originalIndices = finalOrder.map(thumb => thumb.originalIndex);
    if (originalIndices.length === 0) throw new Error("No pages selected");

    const copiedPages = await newPdf.copyPages(originalPdf, originalIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

   const pdfBytes = await newPdf.save();

   const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
   
   const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "organized.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);

  } catch (err) {
    console.error("PDF generation failed", err);
    alert("Error: PDF could not be generated.");
  } finally {
    setProcessing(false);
  }
};


  return (
    <div className="flex flex-col items-center w-full pt-2 pb-8 px-4 relative">
      <div className="max-w-[1200px] w-full flex flex-col gap-4">
        {/* Nav and Title sections remain identical to your original structure */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white text-xs font-medium transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back
          </Link>
          <button
            onClick={() => { setFile(null); setThumbnails([]); setDownloadUrl(undefined); }}
            className={`text-[7px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 transition-all ${file ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <span className="material-symbols-outlined text-[10px]">restart_alt</span>
            Change File
          </button>
        </div>

        {!file && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
              <span className="material-symbols-outlined text-xl">low_priority</span>
            </div>
            <h1 className="text-xl font-black tracking-tight mt-2">Organize/Reorder PDF</h1>
          </div>
        )}

        <div className={`bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-sm p-4 ${!file ? 'py-10' : ''}`}>
          {!file ? (
            <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg p-10 transition-colors hover:border-black dark:hover:border-white cursor-pointer">
              <input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">upload_file</span>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Upload PDF</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-600">description</span>
                  <div>
                    <p className="text-[11px] font-black truncate max-w-[200px]">{file.name}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Ready to edit</p>
                  </div>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{thumbnails.length} Pages Remaining</p>
            </div>
          )}
        </div>

        {file && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-[2.5] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Drag to reorder • Hover to delete </p>
                <button onClick={() => setSelectedPages([])} className="text-[9px] font-black text-red-500 uppercase hover:underline">Deselect All</button>
              </div>

              {loading ? (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-gray-50 dark:bg-neutral-800 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={thumbnails.map(t => t.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                      {thumbnails.map((thumb, i) => (
                        <SortableThumbnail
                          key={thumb.id}
                          id={thumb.id}
                          src={thumb.src}
                          index={i}
                          isSelected={selectedPages.includes(i)}
                          onDelete={deletePage}
                          toggleSelect={(idx) => setSelectedPages(p => p.includes(idx) ? p.filter(x => x !== idx) : [...p, idx])}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="flex-1 w-full lg:max-w-xs sticky top-4">
              <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Extraction Logic</label>
                <input
                  type="text"
                  placeholder="e.g. 1, 2, 5"
                  value={pageRange}
                  onChange={e => setPageRange(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-800 rounded-xl p-3 text-xs outline-none focus:ring-2 ring-black/5 mb-4"
                />
                
                <button
                  onClick={processPdf}
                  disabled={processing}
                  className={`w-full py-3.5 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${processing ? "bg-gray-100 text-gray-400" : "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">build</span>
                  {processing ? "Generating..." : "Generate PDF"}
                </button>

              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}