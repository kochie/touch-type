"use client";

import { useState, useEffect } from "react";
import { useStreak, getNextMilestone, STREAK_MILESTONES } from "@/lib/streak_hook";
import { useMas } from "@/lib/mas_hook";
import ActivityCalendar from "@/components/ActivityCalendar";
import Modal from "@/components/Modal";
import { StreakFreezeCheckout } from "@/components/Payment";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFire, faSnowflake } from "@fortawesome/pro-duotone-svg-icons";

const STREAK_FREEZE_PRODUCT_ID = "io.kochie.touch-typer.streak-freeze";

export function StreakSettings() {
  const {
    currentStreak,
    longestStreak,
    isAtRisk,
    freezesAvailable,
    isPremium,
    isLoading,
    refreshStreak,
  } = useStreak();
  const isMas = useMas();
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [iapProducts, setIapProducts] = useState<Electron.Product[]>([]);
  const [iapLoading, setIapLoading] = useState(false);
  const [iapPurchasing, setIapPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (isMas && isPremium && typeof window !== "undefined" && window.electronAPI?.getProducts) {
      setIapLoading(true);
      window.electronAPI.getProducts().then((products) => {
        setIapProducts(products?.filter((p) => p.productIdentifier === STREAK_FREEZE_PRODUCT_ID) ?? []);
        setIapLoading(false);
      }).catch(() => setIapLoading(false));
    }
  }, [isMas, isPremium]);

  const nextMilestone = getNextMilestone(currentStreak);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Streak</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-white/5 rounded-lg"></div>
          <div className="h-12 bg-white/5 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">Streak</h3>
        <p className="text-sm text-gray-400">
          Keep your practice streak going! Complete at least one typing session each day.
        </p>
      </div>

      {/* Current streak display */}
      <div
        className={clsx(
          "p-4 rounded-lg border",
          currentStreak === 0
            ? "bg-gray-500/10 border-gray-500/30"
            : isAtRisk
            ? "bg-orange-500/10 border-orange-500/30"
            : "bg-green-500/10 border-green-500/30"
        )}
      >
        <div className="flex items-center gap-4">
          <FontAwesomeIcon
            icon={faFire}
            size="3x"
            className={clsx(
              currentStreak === 0
                ? "text-gray-500"
                : isAtRisk
                ? "text-orange-400 animate-pulse"
                : "text-orange-500"
            )}
          />
          <div>
            <p className="text-3xl font-bold text-white">
              {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </p>
            <p className="text-sm text-gray-400">
              {currentStreak === 0
                ? "Start practicing to build your streak!"
                : isAtRisk
                ? "Practice today to keep your streak!"
                : "Great job! Keep it up!"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-sm text-gray-400">Personal Best</p>
          <p className="text-xl font-semibold text-white">{longestStreak} days</p>
        </div>
        {nextMilestone && currentStreak > 0 && (
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-400">Next Milestone</p>
            <p className="text-xl font-semibold text-white">
              {nextMilestone} days
              <span className="text-sm text-gray-500 ml-2">
                ({nextMilestone - currentStreak} to go)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Activity Calendar */}
      <ActivityCalendar />

      {/* Streak Freeze Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faSnowflake} className="w-5 h-5 text-blue-400" />
          <h4 className="text-sm font-medium text-white">Streak Freeze</h4>
          {!isPremium && (
            <span className="text-xs bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded-full">
              Premium
            </span>
          )}
        </div>

        {isPremium ? (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">
                  Freezes Available:{" "}
                  <span className="font-semibold">{freezesAvailable}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Streak freezes let you skip one day without breaking your streak.
                  You earn 1 freeze per month as a premium member. Buy more below.
                </p>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.max(freezesAvailable, 0) }).map((_, i) => (
                  <FontAwesomeIcon
                    icon={faSnowflake}
                    key={i}
                    className="w-6 h-6 text-blue-400"
                  />
                ))}
                {freezesAvailable === 0 && (
                  <FontAwesomeIcon
                  icon={faSnowflake} className="w-6 h-6 text-gray-600" />
                )}
              </div>
            </div>
            {freezesAvailable === 0 && (
              <p className="text-xs text-blue-300">
                You'll receive a new freeze next month.
              </p>
            )}
            {!showStripeCheckout ? (
              <div className="flex items-center gap-2 flex-wrap">
                {isMas ? (
                  iapLoading ? (
                    <span className="text-sm text-gray-500">Loading…</span>
                  ) : (
                    iapProducts.map((product) => (
                      <button
                        key={product.productIdentifier}
                        type="button"
                        onClick={async () => {
                          if (!window.electronAPI?.purchaseProduct) return;
                          setIapPurchasing(product.productIdentifier);
                          try {
                            await window.electronAPI.purchaseProduct(product.productIdentifier, 1);
                            await refreshStreak();
                          } catch (err) {
                            console.error("Streak freeze purchase failed:", err);
                          } finally {
                            setIapPurchasing(null);
                          }
                        }}
                        disabled={!!iapPurchasing}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-70"
                      >
                        {iapPurchasing === product.productIdentifier ? "Purchasing…" : `Buy freeze – ${product.formattedPrice}`}
                      </button>
                    ))
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowStripeCheckout(true)}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Buy additional freeze
                  </button>
                )}
              </div>
            ) : null}
            <Modal
              open={showStripeCheckout}
              onClose={() => setShowStripeCheckout(false)}
              className="w-full max-w-2xl"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Buy streak freeze</h3>
                <StreakFreezeCheckout
                  onComplete={() => {
                    refreshStreak();
                    setShowStripeCheckout(false);
                  }}
                />
              </div>
            </Modal>
          </div>
        ) : (
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-sm text-gray-400">
              Upgrade to Premium to get monthly streak freezes. Miss a day? Your
              streak freeze will automatically save your progress.
            </p>
          </div>
        )}
      </div>

      {/* Milestone Progress */}
      {currentStreak > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">Milestone Progress</h4>
          <div className="flex gap-2 flex-wrap">
            {STREAK_MILESTONES.slice(0, 6).map((milestone) => (
              <div
                key={milestone}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  currentStreak >= milestone
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-white/5 text-gray-500"
                )}
              >
                {milestone} days {currentStreak >= milestone && "✓"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StreakSettings;
