"use client";

import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import Link from "next/link";
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

interface SortableThumbnailProps {
  id: string;
  file: File;
  index: number;
  onRemove: (id: string) => void;
}

function SortableThumbnail({ id, file, index, onRemove }: SortableThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-[3/4] rounded-xl overflow-hidden border group transition-all duration-200 ${
        isDragging 
          ? "border-black dark:border-white shadow-2xl scale-105 z-50" 
          : "border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800"
      }`}
    >
      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
      
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(id); }}
        className="absolute top-2 right-2 z-20 w-6 h-6 bg-white/90 dark:bg-neutral-900/90 text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>

      <div {...attributes} {...listeners} className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing" />

      <div className="absolute bottom-2 left-2 z-20 bg-black/60 backdrop-blur-md text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
        P.{index + 1}
      </div>
    </div>
  );
}

export default function JpgToPdfTool() {
  const [items, setItems] = useState<{ id: string; file: File }[]>([]);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f) => ({
        id: `${f.name}-${Math.random().toString(36).substr(2, 9)}`,
        file: f,
      }));
      setItems((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const removeFile = (id: string) => setItems((prev) => prev.filter((f) => f.id !== id));
  const clearAll = () => { if(confirm("Remove all images?")) setItems([]); };

  const convert = async () => {
    if (items.length === 0) return;
    setLoading(true);
    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < items.length; i++) {
      let { file } = items[i];
      
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      const img = new Image();
      img.src = data;
      await new Promise((r) => (img.onload = r));
      const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      if (i > 0) pdf.addPage();
     const format =
     file.type === "image/png"
       ? "PNG"
       : file.type === "image/webp"
       ? "WEBP"
       : "JPEG"; 

pdf.addImage(data, format, (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
    }
    pdf.save("document.pdf");
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center w-full pt-2 pb-8 px-4 relative">
      <div className="max-w-[1024px] w-full flex flex-col gap-4">
        
        <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-xs font-medium w-fit">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to all tools
        </Link>

        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
            <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
          </div>
          <h1 className="text-xl font-black tracking-tight mt-2">JPG to PDF</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Convert multiple images into one organized PDF.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Main Content Area */}
          <div className="flex-[2.5] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm min-h-[320px] flex flex-col">
            {items.length === 0 ? (
              <div className="flex-1 relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-xl transition-colors hover:border-black dark:hover:border-white cursor-pointer">
                <input type="file" accept="image/*" multiple onChange={handleFiles} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">add_a_photo</span>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Select Images</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {items.map((item, idx) => (
                      <SortableThumbnail key={item.id} id={item.id} file={item.file} index={idx} onRemove={removeFile} />
                    ))}
                    <label className="aspect-[3/4] border-2 border-dashed border-gray-100 dark:border-neutral-800 rounded-xl flex items-center justify-center cursor-pointer hover:border-black dark:hover:border-white transition-colors">
                      <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
                      <span className="material-symbols-outlined text-gray-300">add</span>
                    </label>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

        {/* Sidebar Area */}
          <div className="flex-1 lg:max-w-[260px] flex flex-col">
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm h-full flex flex-col justify-between gap-6">
              {/* Top Section */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">
                  Settings
                </label>
                
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-500">Selected</span>
                  <span className="text-[11px] font-black bg-gray-50 dark:bg-neutral-800 px-2 py-0.5 rounded">
                    {items.length} Files
                  </span>
                </div>
              </div>

              {/* Bottom Actions Section */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={convert}
                  disabled={loading || items.length === 0}
                  className={`w-full py-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    loading || items.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white dark:bg-white dark:text-black hover:opacity-90 shadow-md"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {loading ? "Processing..." : "Generate PDF"}
                </button>

                {items.length > 0 && (
                  <button 
                    onClick={clearAll}
                    className="w-full py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}