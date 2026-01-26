"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PvPChallenge, usePvP, isUsersTurn } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import PvPMatch from "@/components/PvP/PvPMatch";
import ChallengeCard from "@/components/PvP/ChallengeCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faExclamationTriangle } from "@fortawesome/pro-duotone-svg-icons";
import clsx from "clsx";

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { getChallengeById } = usePvP();
  
  const [challenge, setChallenge] = useState<PvPChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const challengeId = params.challengeId as string;

  useEffect(() => {
    const fetchChallenge = async () => {
      if (!challengeId) {
        setError("Invalid challenge ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getChallengeById(challengeId);
        if (data) {
          setChallenge(data);
        } else {
          setError("Challenge not found");
        }
      } catch (err) {
        setError("Failed to load challenge");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenge();
  }, [challengeId, getChallengeById]);

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
          The challenge you're looking for doesn't exist or you don't have access to it.
        </p>
        <button
          onClick={() => router.push("/pvp")}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
            "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
            "text-gray-700 dark:text-gray-300 transition-colors"
          )}
        >
          Back to PvP Hub
        </button>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Sign in to Play
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You need to be signed in to participate in this challenge.
        </p>
      </div>
    );
  }

  // Check if user is a participant
  const isChallenger = challenge.challenger_id === user.id;
  const isOpponent = challenge.opponent_id === user.id;
  const isParticipant = isChallenger || isOpponent;

  // User is not a participant - maybe they're accepting via code
  if (!isParticipant && challenge.status === "pending") {
    return (
      <div className="max-w-md mx-auto py-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          Challenge Invitation
        </h2>
        <ChallengeCard challenge={challenge} />
      </div>
    );
  }

  // User is not a participant and challenge is not pending
  if (!isParticipant) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You are not a participant in this challenge.
        </p>
      </div>
    );
  }

  // Challenge is still pending (waiting for opponent)
  if (challenge.status === "pending") {
    return (
      <div className="max-w-md mx-auto py-12">
        <ChallengeCard challenge={challenge} />
      </div>
    );
  }

  // Challenge is expired or declined
  if (challenge.status === "expired" || challenge.status === "declined") {
    return (
      <div className="max-w-md mx-auto py-12">
        <ChallengeCard challenge={challenge} />
      </div>
    );
  }

  // Challenge is active or completed - show the match component
  return <PvPMatch challenge={challenge} />;
}
