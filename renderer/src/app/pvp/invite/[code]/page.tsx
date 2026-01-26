"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePvP, PvPChallenge } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faCheck,
  faSwords,
  faPlay,
} from "@fortawesome/pro-duotone-svg-icons";
import clsx from "clsx";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { acceptChallengeByInvite, getChallengeByCode } = usePvP();

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [challenge, setChallenge] = useState<PvPChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const code = params.code as string;

  // Fetch challenge info on mount
  useEffect(() => {
    const fetchChallenge = async () => {
      if (!code) {
        setError("Invalid invite code");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getChallengeByCode(code);
        if (data) {
          setChallenge(data);
        } else {
          setError("Challenge not found or invite has expired");
        }
      } catch (err) {
        setError("Failed to load challenge");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenge();
  }, [code, getChallengeByCode]);

  const handleAccept = async () => {
    if (!user) {
      // TODO: Show sign in modal or redirect
      setError("Please sign in to accept this challenge");
      return;
    }

    setIsAccepting(true);
    try {
      const result = await acceptChallengeByInvite(code);
      if (result) {
        setAccepted(true);
        // Redirect to the challenge page after a brief delay
        setTimeout(() => {
          router.push(`/pvp/${result.id}`);
        }, 1500);
      } else {
        setError("Failed to accept challenge");
      }
    } catch (err) {
      setError("Failed to accept challenge");
      console.error(err);
    } finally {
      setIsAccepting(false);
    }
  };

  // Loading state
  if (isLoading || isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <FontAwesomeIcon
          icon={faSpinner}
          className="w-8 h-8 text-gray-400 animate-spin"
        />
      </div>
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faCheck}
            className="w-10 h-10 text-green-500"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Challenge Accepted!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to the challenge...
        </p>
      </div>
    );
  }

  // Error state
  if (error || !challenge) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="w-8 h-8 text-red-500"
          />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {error || "Challenge not found"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The invite link may be invalid or expired.
        </p>
        <button
          onClick={() => router.push("/pvp")}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
            "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
            "text-gray-700 dark:text-gray-300 transition-colors"
          )}
        >
          Go to PvP Hub
        </button>
      </div>
    );
  }

  // Own challenge
  if (challenge.challenger_id === user?.id) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faSwords}
            className="w-8 h-8 text-yellow-500"
          />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          This is your challenge!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Share this link with a friend so they can accept it.
        </p>
        <button
          onClick={() => router.push(`/pvp/${challenge.id}`)}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
            "bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          )}
        >
          View Challenge
        </button>
      </div>
    );
  }

  // Show invite details
  return (
    <div className="max-w-md mx-auto py-12">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faSwords}
            className="w-10 h-10 text-blue-500"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          You've Been Challenged!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {challenge.challenger_username} wants to battle you in typing!
        </p>
      </div>

      {/* Challenge details */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-6">
        {challenge.message && (
          <p className="text-center text-gray-700 dark:text-gray-300 italic mb-4">
            "{challenge.message}"
          </p>
        )}
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 text-center">
          Challenge Settings
        </h3>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            Level {challenge.level}
          </span>
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {challenge.keyboard}
          </span>
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {challenge.language.toUpperCase()}
          </span>
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {challenge.word_set.length} words
          </span>
        </div>
      </div>

      {/* Not logged in */}
      {!user && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-6">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
            Please sign in to accept this challenge
          </p>
        </div>
      )}

      {/* Accept button */}
      <button
        onClick={handleAccept}
        disabled={isAccepting || !user}
        className={clsx(
          "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg",
          "bg-green-500 hover:bg-green-600 text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors shadow-lg"
        )}
      >
        {isAccepting ? (
          <>
            <FontAwesomeIcon icon={faSpinner} className="w-5 h-5 animate-spin" />
            Accepting...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
            Accept Challenge
          </>
        )}
      </button>

      <button
        onClick={() => router.push("/pvp")}
        className={clsx(
          "w-full mt-3 px-4 py-2 rounded-lg font-medium text-center",
          "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
          "transition-colors"
        )}
      >
        Decline
      </button>
    </div>
  );
}
