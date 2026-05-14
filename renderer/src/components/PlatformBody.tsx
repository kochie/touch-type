"use client";

export function PlatformBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <body className={`w-full h-screen overflow-hidden flex flex-col dark:text-white${className ? ` ${className}` : ""}`}>
      {children}
    </body>
  );
}
