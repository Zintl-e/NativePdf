"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { tools } from "./constants/tools";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const lineDraw: Variants = {
  hidden: { pathLength: 0 },
  visible: { pathLength: 1 },
};

export default function Home() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f7f7f7] dark:bg-[#191919] text-[#141414] dark:text-white transition-colors duration-200"
    >
      {/* Hero Background */}
      <div className="absolute inset-x-0 top-0 h-[600px] z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#333_1.5px,transparent_1.5px)] [background-size:24px_24px] [mask-image:linear-gradient(to_top,transparent,black)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f7f7f7] dark:to-[#191919]" />
      </div>

      <main className="relative z-10 flex-grow flex flex-col items-center w-full py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1280px] w-full flex flex-col gap-16">

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="text-center space-y-8 max-w-4xl mx-auto pb-2"
          >
            <motion.div variants={fadeUp} className="relative inline-block">
              <span className="text-green-600 dark:text-green-400 font-bold uppercase tracking-widest text-xs">
                100% Private & Open Source
              </span>

              <svg
                className="absolute -bottom-2 left-0 w-full h-2 text-green-500/60"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M0 5 Q 25 0, 50 5 T 100 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  variants={lineDraw}
                  transition={{
                    duration: 0.6,
                    ease: [0.4, 0, 0.2, 1], 
                  }}
                />
              </svg>
            </motion.div>

            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
              Your Privacy, Our Priority:
              <br className="hidden md:block text-3xl" /> Edit, Merge & Convert PDFs 100% Locally.
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-[#757575] dark:text-gray-400 font-medium max-w-2xl mx-auto"
            >
              We process your files directly in your browser.No Uploads, No Data Ever Leaves Your Device.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/tools"
                className="group w-full sm:w-auto px-8 py-3 bg-[#141414] dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
              >
                Explore Tools
                <span className="material-symbols-outlined text-sm transition-transform duration-300 group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>

              <Link
                href="https://github.com/Zintl-e/NativePdf"
                target="_blank"
                className="w-full sm:w-auto px-8 py-3 bg-white dark:bg-neutral-800 border border-[#e0e0e0] dark:border-neutral-700 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 hover:border-black border-2 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Link>
            </motion.div>
          </motion.div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold border-t-4 text-center border-blue p-3" />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tools.map((t, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link
                    href={t.link}
                    className="group flex flex-col p-4 rounded-lg border border-transparent bg-white dark:bg-neutral-900 dark:border-neutral-800 hover:border-[#e0e0e0] dark:hover:border-neutral-700 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="mb-3 flex justify-between items-start">
                      <span className="material-symbols-outlined text-3xl">
                        {t.icon}
                      </span>
                      <span className="material-symbols-outlined text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors text-lg">
                        arrow_outward
                      </span>
                    </div>

                    <h3 className="text-md font-bold">{t.name}</h3>
                    <p className="mt-1 text-[13px] text-[#757575] dark:text-gray-400 line-clamp-2 leading-snug">
                      {t.desc}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }}
            className="bg-[#141414] dark:bg-neutral-800 rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <h2 className="text-3xl font-bold text-white">
                  Feel free to reach out for any suggestions and queries
                </h2>
              
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href="mailto:anshdadhichmm@gamil.com"
                    className="group flex items-center px-4 py-3 rounded-xl border border-transparent hover:border-white hover:bg-white transition-all duration-200"
                  >
                    <Mail className="text-white group-hover:text-black" size={18} />
                  </a>
              
                  <a
                    href="https://x.com/Rokieee__"
                    target="_blank"
                    className="group flex items-center px-4 py-3 rounded-xl border border-transparent hover:border-white hover:bg-white transition-all duration-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white group-hover:text-black"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" />
                      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                    </svg>
                  </a>
                </div>

            </div>
          </motion.div>

        </div>
      </main>
    </motion.div>
  );
}
