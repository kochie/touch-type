"use client";

export function PlatformBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <body className={`w-full min-h-screen dark:text-white${className ? ` ${className}` : ""}`}>
      {children}
    </body>
  );
}
