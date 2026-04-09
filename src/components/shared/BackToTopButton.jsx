/**
 * Global back-to-top button.
 *
 * On mobile it sits above the floating bottom navigation so it does not cover
 * the navigation actions. On desktop it keeps the standard project position.
 */

import { useEffect, useState } from "react";

function ArrowUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m18 15-6-6-6 6" />
    </svg>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 320);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Volver arriba"
      title="Volver arriba"
      className={`fixed right-4 z-[60] h-12 w-12 rounded-2xl bg-slate-900 text-white shadow-lg transition-all duration-300 hover:bg-slate-800 dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] lg:bottom-6 lg:right-6 lg:bg-slate-900 lg:text-white lg:dark:bg-[#E0E0E0] lg:dark:text-[#121212] lg:dark:hover:bg-white ${
        visible
          ? "pointer-events-auto bottom-28 translate-y-0 opacity-100"
          : "pointer-events-none bottom-24 translate-y-3 opacity-0"
      }`}
      style={{
        bottom: visible
          ? "calc(env(safe-area-inset-bottom, 0px) + 6.25rem)"
          : "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
      }}
    >
      <span className="flex items-center justify-center">
        <ArrowUpIcon />
      </span>
    </button>
  );
}

export default BackToTopButton;
