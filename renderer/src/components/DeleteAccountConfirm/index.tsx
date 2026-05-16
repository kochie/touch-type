"use client";

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";

interface DeleteAccountConfirmProps {
  open: boolean;
  email: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountConfirm({
  open,
  email,
  submitting,
  onCancel,
  onConfirm,
}: DeleteAccountConfirmProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = typed.trim().toLowerCase() === email.trim().toLowerCase();

  useEffect(() => {
    if (open) {
      setTyped("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = () => {
    if (!submitting) onCancel();
  };

  return (
    <Transition show={open} as="div">
      <Dialog as="div" className="relative z-50" onClose={close}>
        <TransitionChild
          as="div"
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
        </TransitionChild>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as="div"
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13151c] p-6 shadow-2xl">
                <DialogTitle className="text-lg font-semibold text-white">
                  Delete your account?
                </DialogTitle>
                <div className="mt-2 space-y-3 text-sm text-gray-400">
                  <p>
                    This permanently removes your account, results, goals, leaderboard scores, settings, and active subscription. This action{" "}
                    <strong className="text-white">cannot be undone</strong>.
                  </p>
                  <p>
                    To confirm, type your email{" "}
                    <span className="font-mono text-white">{email}</span> below.
                  </p>
                </div>

                <input
                  ref={inputRef}
                  type="email"
                  autoComplete="off"
                  spellCheck={false}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matches && !submitting) {
                      e.preventDefault();
                      onConfirm();
                    }
                  }}
                  placeholder={email}
                  disabled={submitting}
                  className="mt-4 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder:text-gray-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                  aria-label="Type your email to confirm deletion"
                />

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    disabled={submitting}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={!matches || submitting}
                    className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/25 hover:text-red-300 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    {submitting ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      "Delete my account"
                    )}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
