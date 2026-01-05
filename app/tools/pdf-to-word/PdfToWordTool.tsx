"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Document, Packer, Paragraph, ImageRun, AlignmentType, convertInchesToTwip } from "docx";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ISectionOptions } from "docx";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface SortableFileItemProps {
  id: string;
  file: File;
  index: number;
  onRemove: (index: number) => void;
}

function SortableFileItem({ id, file, index, onRemove }: SortableFileItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto"
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-3 bg-white dark:bg-neutral-800 border rounded-xl mb-2 transition-all ${isDragging ? "border-blue-500 shadow-lg opacity-50" : "border-gray-100 dark:border-neutral-700"}`}>
      <div className="flex items-center gap-3 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-black dark:hover:text-white">
          <span className="material-symbols-outlined text-lg">drag_indicator</span>
        </div>
        <span className="text-[11px] font-bold text-gray-400 w-4">{index + 1}.</span>
        <span className="text-[11px] font-black truncate max-w-[200px]">{file.name}</span>
      </div>
      <button onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500 transition-colors">
        <span className="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>
  );
}

export default function PdfToWordTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState(0.8);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      setFiles((items) => {
        const oldIndex = items.findIndex((_, idx) => `file-${idx}` === activeId);
        const newIndex = items.findIndex((_, idx) => `file-${idx}` === overId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const convert = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setProgress(0);

    try {
      const sections: ISectionOptions[] = [];
      let totalPages = 0;

      for (const file of files) {
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        totalPages += pdf.numPages;
      }

      let processedPages = 0;
      for (const file of files) {
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: ctx,
            viewport
          }).promise;

          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          const base64 = dataUrl.split(",")[1];
          const imageBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

          const usableWidth = 7.5 * 72;
          const usableHeight = 10 * 72;

          const imgWidth = viewport.width;
          const imgHeight = viewport.height;

          const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);

          sections.push({
            properties: {
              page: {
                margin: {
                  top: convertInchesToTwip(0.5),
                  right: convertInchesToTwip(0.5),
                  bottom: convertInchesToTwip(0.5),
                  left: convertInchesToTwip(0.5),
                },
              },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    type: "jpg",
                    transformation: {
                      width: imgWidth * scale,
                      height: imgHeight * scale,
                    },
                  }),
                ],
              }),
            ],
          });

          processedPages++;
          setProgress(Math.round((processedPages / totalPages) * 100));
        }
      }

      const doc = new Document({ sections });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted_document.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Conversion Failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full pt-2 pb-8 px-4 relative">
      <div className="max-w-[800px] w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white text-xs font-medium transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back
          </button>
          {files.length > 0 && (
            <button onClick={() => setFiles([])} className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-[14px]">restart_alt</span> Clear All
            </button>
          )}
        </div>

        {!files.length && (
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
              <span className="material-symbols-outlined text-xl">description</span>
            </div>
            <h1 className="text-xl font-black tracking-tight mt-2">PDF to Word</h1>
            <p className="text-[13px] text-gray-400 mt-1">Convert PDFs to editable Word documents visually.</p>
          </div>
        )}

        <div className={`bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-sm transition-all duration-300 ${files.length > 0 ? "p-3" : "p-10"}`}>
          <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg p-6 transition-colors hover:border-black dark:hover:border-white cursor-pointer">
            <input type="file" accept="application/pdf" multiple onChange={handleSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <span className="material-symbols-outlined text-2xl text-gray-300 mb-1">add_circle</span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{files.length > 0 ? "Add More PDFs" : "Choose PDFs to Convert"}</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 animate-fade-in">
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Rearrange Sequence</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={files.map((_, i) => `file-${i}`)} strategy={verticalListSortingStrategy}>
                  <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {files.map((file, index) => (
                      <SortableFileItem
                        key={`file-${index}`}
                        id={`file-${index}`}
                        file={file}
                        index={index}
                        onRemove={(idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">
                  Quality: <span className="text-black dark:text-white">{(quality * 100).toFixed(0)}%</span>
                </label>

                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.01"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="quality-slider w-full cursor-pointer accent-black dark:accent-white"
                />

                <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase mt-2">
                  <span>Fast</span>
                  <span>High Res</span>
                </div>
                <div className="h-[1px] bg-gray-100 dark:bg-neutral-800 my-5" />
                <button
                  onClick={convert}
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${loading ? 'bg-gray-100 text-gray-400' : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'}`}
                >
                  {loading ? `Processing ${progress}%` : 'Convert to Word'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        
        .quality-slider {
          -webkit-appearance: none;
          height: 6px;
          background: #f3f4f6;
          border-radius: 5px;
          outline: none;
        }
        :global(.dark) .quality-slider { background: #262626; }
        .quality-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: currentColor;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}