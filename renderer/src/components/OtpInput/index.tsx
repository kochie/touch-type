"use client";

import { useRef, ClipboardEvent, KeyboardEvent } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function OtpInput({
  length = 8,
  value,
  onChange,
  onBlur,
  disabled,
  hasError,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function focusAt(index: number) {
    const target = inputsRef.current[Math.min(Math.max(index, 0), length - 1)];
    target?.focus();
    // Move cursor to end so backspace on a populated box clears it correctly.
    target?.setSelectionRange(target.value.length, target.value.length);
  }

  function handleChange(index: number, raw: string) {
    // Accept only digits; take only the first one entered.
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));

    if (index < length - 1) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.slice();
      if (next[index]) {
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        next[index - 1] = "";
        onChange(next.join(""));
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted.padEnd(value.length > pasted.length ? value.length : pasted.length, value.slice(pasted.length)).slice(0, length));
    onChange(pasted);
    focusAt(Math.min(pasted.length, length - 1));
  }

  const ringClass = hasError
    ? "ring-red-400 focus:ring-red-500"
    : "ring-gray-300 focus:ring-indigo-600";

  return (
    <div className="flex gap-2 justify-center" onBlur={onBlur}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={[
            "w-9 h-11 rounded-md border-0 text-center text-lg font-semibold text-gray-900",
            "shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset outline-none",
            "disabled:bg-gray-50 disabled:text-gray-400",
            ringClass,
          ].join(" ")}
          aria-label={`Digit ${i + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
