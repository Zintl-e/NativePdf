"use client";

import './globals.css';
import Link from 'next/link';
import { useState, useLayoutEffect, useEffect } from 'react';
import { Mail } from "lucide-react";
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {

  const [darkMode, setDarkMode] = useState(false);

  useLayoutEffect(() => {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: light)').matches;

    if (theme === 'dark' || (!theme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);


  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#f7f7f7] dark:bg-[#191919] text-[#141414] dark:text-white min-h-screen flex flex-col text-[14px]">
        <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md border-b border-[#f2f2f2] dark:border-neutral-800">
          <div className="max-w-[1024px] mx-auto px-4 sm:px-5">
            <div className="flex items-center justify-between h-12 gap-3">
              <Link href="/" className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center justify-center size-6 bg-[#141414] dark:bg-white rounded text-white dark:text-black">
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                </div>
                <h1 className="text-lg font-bold tracking-tight hidden sm:block">Native PDF</h1>
              </Link>

              <div className="flex items-center gap-3 shrink-0">
                {/* DARK MODE TOGGLE */}
                {/* DARK MODE TOGGLE */}
                <div className="toggle-wrapper">
                  <input
                    className="toggle-checkbox"
                    type="checkbox"
                    checked={darkMode}
                    onChange={() => setDarkMode(!darkMode)}
                  />
                  <div className="toggle-container">
                    <div className="toggle-button">
                      <div className="toggle-button-circles-container">
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center">
                  <a
                    href="mailto:anshdadhichmm@gamil.com"
                    className="group flex items-center px-3 py-2.5
                               rounded-xl
                               border-2 border-transparent
                               hover:border-black dark:hover:border-white 
                               transition-colors duration-200"
                  >
                    <Mail
                      size={18}
                      className="text-neutral-700 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white transition-colors"
                    />
                  </a>

                  <a
                    href="https://x.com"
                    target="_blank"
                    className="group flex items-center px-3 py-2.5
                               rounded-xl
                               border-2 border-transparent
                               hover:border-black 
                               transition-colors duration-200"
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
                      className="text-neutral-700 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white transition-colors"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow">
          {children}
        </main>

        <footer className="w-full bg-white dark:bg-[#191919] border-t border-[#f2f2f2] dark:border-neutral-800 mt-auto">
          <div className="max-w-[1024px] mx-auto px-4 py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center size-6 bg-[#141414] dark:bg-white rounded text-white dark:text-black">
                  <span className="material-symbols-outlined text-[12px]">picture_as_pdf</span>
                </div>
                <span className="text-md font-bold">PDF Tools</span>
              </div>
              <div className="flex flex-wrap justify-center gap-5 text-xs font-medium text-[#757575]">
                <p className="hover:text-black dark:hover:text-white">Made by Zintle</p>
              </div>
              <div className="text-[#757575] text-[11px]">
                © {new Date().getFullYear()} Native PDF.
              </div>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}

