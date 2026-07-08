"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from "lucide-react";

interface PPTViewerProps {
  slides: string[]; // Array of image URLs
  title: string;
  onClose?: () => void;
}

export default function PPTViewer({ slides, title, onClose }: PPTViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1 < slides.length ? prev + 1 : prev));
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      handleNext();
    } else if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "Escape" && isFullscreen) {
      setIsFullscreen(false);
    }
  }, [handleNext, handlePrev, isFullscreen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const slideVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 100 : -100,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction < 0 ? 100 : -100,
      transition: { duration: 0.2 },
    }),
  };

  const [direction, setDirection] = useState(1);

  const goToNext = () => {
    setDirection(1);
    handleNext();
  };

  const goToPrev = () => {
    setDirection(-1);
    handlePrev();
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="w-full aspect-video bg-[#0F172A] rounded-2xl flex items-center justify-center border border-white/10">
        <p className="text-white/50">준비된 슬라이드가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col bg-[#0F172A] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ${isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : 'w-full aspect-video'}`}>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <h3 className="text-white font-bold drop-shadow-md">{title}</h3>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-sm transition-colors"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 bg-black/40 hover:bg-rose-500/80 text-white rounded-xl backdrop-blur-sm transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Slide Area */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={currentIndex}
            src={slides[currentIndex]}
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute max-w-full max-h-full object-contain"
            alt={`Slide ${currentIndex + 1}`}
          />
        </AnimatePresence>

        {/* Navigation Buttons */}
        <button 
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all disabled:opacity-0 z-40"
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          onClick={goToNext}
          disabled={currentIndex === slides.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all disabled:opacity-0 z-40"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Bottom Progress Bar */}
      <div className="h-1.5 bg-white/10 w-full relative">
        <motion.div 
          className="absolute left-0 top-0 bottom-0 bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 pointer-events-auto shadow-xl">
          <span className="text-white/80 font-medium text-sm">
            <span className="text-white font-bold">{currentIndex + 1}</span> / {slides.length}
          </span>
        </div>
      </div>
    </div>
  );
}
