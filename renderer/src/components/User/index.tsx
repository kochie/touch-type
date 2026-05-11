"use client";
// import { headers } from "next/headers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightToBracket, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faUser } from "@fortawesome/pro-duotone-svg-icons";
import { useUser } from "@/lib/user_hook";

export default function User({ signIn, account }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center px-2.5 py-1.5">
        <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 text-slate-400" spin />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={signIn}
        title="Sign In or Sign Up"
        className="flex items-center px-2.5 py-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-150"
      >
        <FontAwesomeIcon icon={faRightToBracket} className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={account}
      title="Account"
      className="flex items-center px-2.5 py-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-150"
    >
      <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
    </button>
  );
}
