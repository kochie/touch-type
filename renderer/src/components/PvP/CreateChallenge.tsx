"use client";

import { CreateChallengeParams, SearchUser, usePvP } from "@/lib/pvp-provider";
import { useSettings } from "@/lib/settings_hook";
import { useWords } from "@/lib/word-provider";
import {
  faCheck,
  faCopy,
  faLink,
  faPaperPlane,
  faSpinner,
} from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { useState } from "react";
import { toast } from "sonner";
import UserSearch from "./UserSearch";

interface CreateChallengeProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateChallenge({
  onSuccess,
  onCancel,
}: CreateChallengeProps) {
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [createInviteLink, setCreateInviteLink] = useState(false);
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdChallenge, setCreatedChallenge] = useState<{
    id: string;
    challengeCode: string;
    inviteCode?: string;
  } | null>(null);

  const { createChallenge } = usePvP();
  const settings = useSettings();
  const [wordList] = useWords();

  // Generate word set from current word list
  const generateWordSet = (): string[] => {
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 15); // Standard test length
  };

  const handleCreate = async () => {
    if (!selectedUser && !createInviteLink) {
      toast.error("Please select a user or enable invite link");
      return;
    }

    setIsCreating(true);

    try {
      const wordSet = generateWordSet();
      
      const params: CreateChallengeParams = {
        opponentId: selectedUser?.id,
        keyboard: settings.keyboardName,
        level: settings.levelName,
        language: settings.language,
        capital: settings.capital,
        punctuation: settings.punctuation,
        numbers: settings.numbers,
        wordSet,
        message: message.trim() || undefined,
        createInviteLink: createInviteLink || !selectedUser,
      };

      const challenge = await createChallenge(params);

      if (challenge) {
        setCreatedChallenge({
          id: challenge.id,
          challengeCode: challenge.challenge_code || "",
          inviteCode: challenge.invite_code || undefined,
        });
        toast.success("Challenge created!");
      }
    } catch (error) {
      toast.error("Failed to create challenge");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    const code = createdChallenge?.inviteCode || createdChallenge?.challengeCode;
    const link = `touchtyper://pvp/invite/${code}`;
    
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyCode = async () => {
    const code = createdChallenge?.challengeCode;
    
    try {
      await navigator.clipboard.writeText(code || "");
      toast.success("Code copied to clipboard!");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  // Success state - show the created challenge details
  if (createdChallenge) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <FontAwesomeIcon
              icon={faCheck}
              className="w-8 h-8 text-green-500"
            />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Challenge Created!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {selectedUser
              ? `Your challenge to ${selectedUser.username} has been sent.`
              : "Share the link or code below with your friend."}
          </p>
        </div>

        {/* Challenge code */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
            Challenge Code
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
              {createdChallenge.challengeCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <FontAwesomeIcon icon={faCopy} className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invite link */}
        {(createdChallenge.inviteCode || !selectedUser) && (
          <button
            onClick={handleCopyLink}
            className={clsx(
              "w-full flex items-center justify-center gap-2 p-4",
              "bg-blue-500 hover:bg-blue-600 text-white",
              "rounded-xl font-medium transition-colors"
            )}
          >
            <FontAwesomeIcon icon={faLink} className="w-5 h-5" />
            Copy Invite Link
          </button>
        )}

        {/* Done button */}
        <button
          onClick={onSuccess}
          className={clsx(
            "w-full flex items-center justify-center gap-2 p-4",
            "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
            "text-gray-700 dark:text-gray-300",
            "rounded-xl font-medium transition-colors"
          )}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Challenge a Friend
        </h3>

        {/* User search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Choose an Opponent
          </label>
          <UserSearch
            onSelect={setSelectedUser}
            selectedUser={selectedUser}
            placeholder="Search by username or email..."
          />
        </div>

        {/* Or divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
              or
            </span>
          </div>
        </div>

        {/* Create invite link option */}
        <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors">
          <input
            type="checkbox"
            checked={createInviteLink}
            onChange={(e) => setCreateInviteLink(e.target.checked)}
            className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Create invite link
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generate a shareable link that anyone can use
            </p>
          </div>
        </label>
      </div>

      {/* Challenge settings preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Challenge Settings
        </label>
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            The challenge will use your current settings:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              Level {settings.levelName}
            </span>
            <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {settings.keyboardName}
            </span>
            <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {settings.language.toUpperCase()}
            </span>
            {settings.capital && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
                Capitals
              </span>
            )}
            {settings.punctuation && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
                Punctuation
              </span>
            )}
            {settings.numbers && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
                Numbers
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Optional message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Message (optional)
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Think you can beat me?"
          maxLength={100}
          className={clsx(
            "w-full px-4 py-3 rounded-lg",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "text-gray-900 dark:text-white placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className={clsx(
              "flex-1 px-4 py-3 rounded-xl font-medium",
              "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
              "text-gray-700 dark:text-gray-300",
              "transition-colors"
            )}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleCreate}
          disabled={isCreating || (!selectedUser && !createInviteLink)}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors"
          )}
        >
          {isCreating ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPaperPlane} className="w-5 h-5" />
              Send Challenge
            </>
          )}
        </button>
      </div>
    </div>
  );
}
