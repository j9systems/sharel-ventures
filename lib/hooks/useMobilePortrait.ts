"use client";

import { useState, useEffect } from "react";

export function useMobilePortrait() {
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isMobile && isPortrait);
    };

    check();
    window.addEventListener("resize", check);

    const orientationHandler = () => {
      // Delay to let the browser update dimensions after orientation change
      setTimeout(check, 100);
    };
    window.addEventListener("orientationchange", orientationHandler);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", orientationHandler);
    };
  }, []);

  return isMobilePortrait;
}
