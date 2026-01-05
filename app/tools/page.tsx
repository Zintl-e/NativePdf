import Link from "next/link";
import { tools } from "../constants/tools";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full py-8 px-4 sm:px-6">
      <div className="max-w-[1024px] w-full flex flex-col gap-8">

        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Tools to work with your PDFs
          </h2>
          <p className="text-md text-[#757575] dark:text-gray-400 font-medium">
            We make PDF easy. Fast, private, and productive.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {tools.map((t, idx) => (
            <Link
              href={t.link}
              key={idx}
              className="tool-card group flex flex-col p-4 rounded-lg border border-transparent bg-white dark:bg-neutral-900 dark:border-neutral-800 hover:border-[#e0e0e0] dark:hover:border-neutral-700 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-2 text-[#141414] dark:text-white">
                <span className="material-symbols-outlined text-3xl">
                  {t.icon}
                </span>
              </div>
              <h3 className="text-sm font-bold group-hover:text-blue-600 transition-colors">
                {t.name}
              </h3>
              <p className="mt-1 text-[12px] text-[#757575] dark:text-gray-400 leading-snug line-clamp-2">
                {t.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}