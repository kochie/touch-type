"use client";

import { usePvP } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import {
  faGamepadModern,
  faHourglass,
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
import NewChallengePrompt from "./NewChallengePrompt";

type TabId = "active" | "awaiting" | "history" | "new";

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
    myActiveGames,
    myAwaitingGames,
    myCompletedGames,
    isLoading,
  } = usePvP();

  const tabs: Tab[] = [
    {
      id: "active",
      label: "Active",
      icon: faGamepadModern,
      badge: myActiveGames.length,
    },
    {
      id: "awaiting",
      label: "Awaiting",
      icon: faHourglass,
      badge: myAwaitingGames.length,
    },
    {
      id: "history",
      label: "History",
      icon: faHistory,
    },
    {
      id: "new",
      label: "New",
      icon: faPlus,
    },
  ];

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
        return myActiveGames.length > 0 ? (
          <div className="space-y-4">
            {myActiveGames.map((g) => (
              <ChallengeCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={faGamepadModern}
            title="No active games"
            description="Games where you haven't raced yet show up here. Create a new one or join a friend's invite."
            action={{
              label: "Create Game",
              onClick: () => setActiveTab("new"),
            }}
          />
        );

      case "awaiting":
        return myAwaitingGames.length > 0 ? (
          <div className="space-y-4">
            {myAwaitingGames.map((g) => (
              <ChallengeCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={faHourglass}
            title="No games awaiting partner"
            description="Games where you've raced but the other side hasn't appear here."
          />
        );

      case "history":
        return myCompletedGames.length > 0 ? (
          <div className="space-y-4">
            {myCompletedGames.map((g) => (
              <ChallengeCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={faHistory}
            title="No completed games"
            description="Completed, cancelled, and expired games show up here."
          />
        );

      case "new":
        return <NewChallengePrompt />;

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <FontAwesomeIcon
          icon={faSwords}
          className="w-8 h-8 text-blue-500 dark:text-blue-400"
        />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          PvP Arena
        </h1>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`pvp-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
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
                    : "bg-blue-500 text-white",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}

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
            "bg-blue-500 hover:bg-blue-600 text-white transition-colors",
          )}
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
