import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  id: string;
  file: File;
  index: number;
  removeFile: (index: number) => void;
}

export default function SortableItem({ id, file, index, removeFile }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between p-2 bg-gray-100 dark:bg-neutral-800 rounded-md border border-transparent dark:border-neutral-700 cursor-grab"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="material-symbols-outlined text-red-500 text-lg">picture_as_pdf</span>
        <span className="text-xs font-medium truncate">{file.name}</span>
      </div>
      <button
        onClick={() => removeFile(index)}
        className="text-gray-500 hover:text-red-500 p-1 flex"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
}
