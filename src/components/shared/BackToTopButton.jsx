/**
 * Global back-to-top button.
 *
 * Uses the standard visual style agreed for the project.
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
      className={`fixed bottom-6 right-6 z-50 h-12 w-12 rounded-2xl bg-slate-900 text-white shadow-lg transition-all duration-300 hover:bg-slate-800 ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <span className="flex items-center justify-center">
        <ArrowUpIcon />
      </span>
    </button>
  );
}

export default BackToTopButton;