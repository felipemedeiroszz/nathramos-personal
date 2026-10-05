"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description: string;
}

interface HowItWorksCarouselProps {
  steps: Step[];
}

export function HowItWorksCarousel({ steps }: HowItWorksCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {steps.map((step, index) => (
            <div
              key={index}
              className="w-full flex-shrink-0 px-4"
            >
              <div className="relative bg-black/50 backdrop-blur-md rounded-3xl p-10 md:p-14 border border-border/60 hover:border-primary/40 transition-all duration-300 min-h-[300px]">
                {/* Background number */}
                <div className="absolute top-4 right-6 text-[120px] font-bold text-primary/10 leading-none select-none">
                  0{index + 1}
                </div>

                {/* Number badge */}
                <div className="absolute -top-4 left-8 w-12 h-12 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl shadow-lg shadow-primary/20">
                  {index + 1}
                </div>

                <div className="relative z-10 pt-4 space-y-6">
                  <h3 className="text-2xl md:text-3xl font-semibold text-text">
                    {step.title}
                  </h3>
                  <p className="text-lg text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentIndex
                ? "bg-primary w-8"
                : "bg-border hover:bg-border/80 w-2"
            )}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
