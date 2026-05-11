"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

export function PlatformBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [isNonMac, setIsNonMac] = useState(false);

  useEffect(() => {
    const checkPlatform = async () => {
      const info = await window.electronAPI?.getDebugInfo?.();
      if (info) {
        setIsNonMac(info.platform !== "darwin");
      } else {
        setIsNonMac(!navigator.platform.toLowerCase().startsWith("mac"));
      }
    };
    checkPlatform();
  }, []);

  return (
    <body
      className={clsx(
        isNonMac && "dark:text-white text-black dark:bg-zinc-800 bg-zinc-300",
        "w-full min-h-screen dark:text-white",
        className
      )}
    >
      {children}
    </body>
  );
}
