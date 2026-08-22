import React from "react";

export const Logo = ({ size = "md" }) => {
  const isLarge = size === "lg";
  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-md bg-primary flex items-center justify-center font-bold text-white shrink-0 ${
        isLarge ? "w-8 h-8 text-lg" : "w-6 h-6 text-sm"
      }`}>
        d
      </div>
      <span className={`font-sans font-bold tracking-tight text-ink ${
        isLarge ? "text-[22px]" : "text-[16px]"
      }`}>
        Dayflow<span className="text-primary">.</span>
      </span>
    </div>
  );
};
