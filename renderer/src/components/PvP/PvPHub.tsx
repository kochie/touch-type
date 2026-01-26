"use client";

import { usePvP } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import {
  faGamepadModern,
  faInbox,
  faHistory,
  faPlus,
  faSwords,
  faSpinner,
  faUserSlash,
} from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { useState } from "react";
import ChallengeCard from "./ChallengeCard";
import CreateChallenge from "./CreateChallenge";

type TabId = "active" | "incoming" | "history" | "create";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof faSwords;
  badge?: number;
}

export default function PvPHub() {
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const { user, isLoading: isUserLoading } = useSupabase();
  const {
    activeChallenges,
    incomingChallenges,
    completedChallenges,
    pendingCount,
    isLoading,
  } = usePvP();

  const tabs: Tab[] = [
    {
      id: "active",
      label: "Active",
      icon: faGamepadModern,
      badge: activeChallenges.length,
    },
    {
      id: "incoming",
      label: "Incoming",
      icon: faInbox,
      badge: pendingCount,
    },
    {
      id: "history",
      label: "History",
      icon: faHistory,
    },
    {
      id: "create",
      label: "New",
      icon: faPlus,
    },
  ];

  // Not logged in state
  if (!isUserLoading && !user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FontAwesomeIcon
              icon={faUserSlash}
              className="w-10 h-10 text-gray-400 dark:text-gray-500"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Sign in to Play PvP
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Create an account or sign in to challenge friends and compete in typing battles.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon
            icon={faSpinner}
            className="w-8 h-8 text-gray-400 animate-spin"
          />
        </div>
      );
    }

    switch (activeTab) {
      case "active":
        return activeChallenges.length > 0 ? (
          <div className="space-y-4">
            {activeChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={faGamepadModern}
            title="No active challenges"
            description="Start a new challenge or wait for someone to accept your invitation."
            action={{
              label: "Create Challenge",
              onClick: () => setActiveTab("create"),
            }}
          />
        );

      case "incoming":
        return incomingChallenges.length > 0 ? (
          <div className="space-y-4">
            {incomingChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={faInbox}
            title="No incoming challenges"
            description="When someone challenges you, it will appear here."
          />
        );

      case "history":
        return completedChallenges.length > 0 ? (
          <div className="space-y-4">
            {completedChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={faHistory}
            title="No completed challenges"
            description="Your completed challenges will appear here."
          />
        );

      case "create":
        return (
          <CreateChallenge
            onSuccess={() => setActiveTab("active")}
            onCancel={() => setActiveTab("active")}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FontAwesomeIcon
          icon={faSwords}
          className="w-8 h-8 text-blue-500 dark:text-blue-400"
        />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          PvP Arena
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={clsx(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-blue-500 text-white"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: typeof faSwords;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <FontAwesomeIcon
          icon={icon}
          className="w-8 h-8 text-gray-400 dark:text-gray-500"
        />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "transition-colors"
          )}
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
