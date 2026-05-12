"use client";

import { useResults } from "@/lib/result-provider";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

interface ActivityCalendarProps {
  className?: string;
}

export default function ActivityCalendar({ className }: ActivityCalendarProps) {
  const { results } = useResults();
  const [selectedMonth, setSelectedMonth] = useState(() => Temporal.Now.plainDateISO());

  // Get unique activity dates for the selected month
  const activityDates = useMemo(() => {
    const dates = new Set<string>();
    results.forEach((result) => {
      const date = Temporal.Instant.from(result.datetime)
        .toZonedDateTimeISO(Temporal.Now.timeZoneId())
        .toPlainDate();
      if (date.month === selectedMonth.month && date.year === selectedMonth.year) {
        dates.add(date.toString());
      }
    });
    return dates;
  }, [results, selectedMonth]);

  // Get all activity dates for intensity calculation
  const allActivityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((result) => {
      const dateStr = Temporal.Instant.from(result.datetime)
        .toZonedDateTimeISO(Temporal.Now.timeZoneId())
        .toPlainDate()
        .toString();
      counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
    });
    return counts;
  }, [results]);

  // Generate calendar days for the selected month
  const calendarDays = useMemo(() => {
    const startOfMonth = selectedMonth.with({ day: 1 });
    const endOfMonth = selectedMonth.with({ day: selectedMonth.daysInMonth });
    // Temporal dayOfWeek: 1=Mon, so dayOfWeek-1 days back = Monday of that week
    const startOfCalendar = startOfMonth.subtract({ days: startOfMonth.dayOfWeek - 1 });
    // End of week containing last day of month = add (7 - dayOfWeek) days to reach Sunday
    const endOfCalendar = endOfMonth.add({ days: 7 - endOfMonth.dayOfWeek });

    const days: Temporal.PlainDate[] = [];
    let current = startOfCalendar;
    while (Temporal.PlainDate.compare(current, endOfCalendar) <= 0) {
      days.push(current);
      current = current.add({ days: 1 });
    }
    return days;
  }, [selectedMonth]);

  const today = Temporal.Now.plainDateISO();

  const goToPrevMonth = () => {
    setSelectedMonth((prev) => prev.subtract({ months: 1 }));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => prev.add({ months: 1 }));
  };

  const goToToday = () => {
    setSelectedMonth(Temporal.Now.plainDateISO());
  };

  // Get intensity level (0-4) based on session count
  const getIntensityLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Calculate stats for the month
  const monthStats = useMemo(() => {
    let activeDays = 0;
    let totalSessions = 0;
    calendarDays.forEach((day) => {
      if (day.month === selectedMonth.month && day.year === selectedMonth.year) {
        const dateStr = day.toString();
        const count = allActivityCounts.get(dateStr) || 0;
        if (count > 0) {
          activeDays++;
          totalSessions += count;
        }
      }
    });
    return { activeDays, totalSessions };
  }, [calendarDays, selectedMonth, allActivityCounts]);

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Activity Calendar</h4>
        <div className="flex items-center gap-2">
          {!(selectedMonth.month === Temporal.Now.plainDateISO().month &&
            selectedMonth.year === Temporal.Now.plainDateISO().year) && (
            <button
              onClick={goToToday}
              className="cursor-pointer px-2 py-1 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
            >
              Today
            </button>
          )}
          <div className="flex items-center">
            <button
              onClick={goToPrevMonth}
              className="cursor-pointer p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Previous month"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-5 h-5" />
            </button>
            <span className="w-32 text-center text-sm text-gray-300">
              {selectedMonth.toLocaleString("en", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={goToNextMonth}
              className={clsx("p-1 text-gray-400 transition-colors", !(selectedMonth.month === Temporal.Now.plainDateISO().month && selectedMonth.year === Temporal.Now.plainDateISO().year) && "hover:text-white cursor-pointer")}
              disabled={selectedMonth.month === Temporal.Now.plainDateISO().month &&
                selectedMonth.year === Temporal.Now.plainDateISO().year}
              aria-label="Next month"
            >
              <FontAwesomeIcon
                icon={faChevronRight}
                className={clsx(
                  "w-5 h-5",
                  selectedMonth.month === Temporal.Now.plainDateISO().month &&
                    selectedMonth.year === Temporal.Now.plainDateISO().year && "opacity-30"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white/5 rounded-lg p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs text-gray-500 font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dateStr = day.toString();
            const isCurrentMonth = day.month === selectedMonth.month && day.year === selectedMonth.year;
            const isToday = day.equals(today);
            const hasActivity = activityDates.has(dateStr);
            const sessionCount = allActivityCounts.get(dateStr) || 0;
            const intensity = getIntensityLevel(sessionCount);

            return (
              <div
                key={index}
                className={clsx(
                  "aspect-square flex items-center justify-center text-sm rounded-md relative",
                  "transition-all duration-200",
                  !isCurrentMonth && "opacity-30",
                  isToday && "ring-2 ring-orange-400 ring-offset-1 ring-offset-transparent",
                  hasActivity
                    ? [
                        intensity === 1 && "bg-orange-500/20 text-orange-300",
                        intensity === 2 && "bg-orange-500/40 text-orange-200",
                        intensity === 3 && "bg-orange-500/60 text-orange-100",
                        intensity === 4 && "bg-orange-500/80 text-white",
                      ]
                    : "text-gray-400 hover:bg-white/5"
                )}
                title={
                  hasActivity
                    ? `${day.toLocaleString("en", { month: "short", day: "numeric" })}: ${sessionCount} session${sessionCount !== 1 ? "s" : ""}`
                    : day.toLocaleString("en", { month: "short", day: "numeric" })
                }
              >
                {day.day}
                {hasActivity && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Active days:</span>
          <span className="text-white font-medium">{monthStats.activeDays}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Sessions:</span>
          <span className="text-white font-medium">{monthStats.totalSessions}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-white/10" />
          <div className="w-3 h-3 rounded-sm bg-orange-500/20" />
          <div className="w-3 h-3 rounded-sm bg-orange-500/40" />
          <div className="w-3 h-3 rounded-sm bg-orange-500/60" />
          <div className="w-3 h-3 rounded-sm bg-orange-500/80" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
