"use client";

import { useState } from "react";
import { Field, Label, Description, Select } from "@headlessui/react";
import clsx from "clsx";
import {
  createPracticeSession,
  downloadICS,
  generateGoogleCalendarUrl,
  generateOutlookUrl,
  getScheduleDescription,
} from "@/lib/calendar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faCalendarPlus } from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";

const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const DURATIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
];

const WEEKS = [
  { value: 4, label: "4 weeks" },
  { value: 8, label: "8 weeks" },
  { value: 12, label: "12 weeks" },
  { value: 0, label: "Forever" },
];

export function CalendarSettings() {
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(5);
  const [days, setDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [weeksCount, setWeeksCount] = useState(4);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const getSessionConfig = () => ({
    time,
    duration,
    days,
    repeat: days.length > 0,
    weeksCount: weeksCount || undefined,
  });

  const handleDownloadICS = () => {
    if (days.length === 0) return;

    setIsDownloading(true);
    try {
      const session = createPracticeSession(getSessionConfig());
      downloadICS(session, "touch-typer-practice");
    } catch (err) {
      console.error("Failed to generate ICS:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGoogleCalendar = () => {
    if (days.length === 0) return;

    try {
      const session = createPracticeSession(getSessionConfig());
      const url = generateGoogleCalendarUrl(session);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to open Google Calendar:", err);
    }
  };

  const handleOutlookCalendar = () => {
    if (days.length === 0) return;

    try {
      const session = createPracticeSession(getSessionConfig());
      const url = generateOutlookUrl(session);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to open Outlook:", err);
    }
  };

  const scheduleDescription = getScheduleDescription({
    time,
    duration,
    days,
    weeksCount: weeksCount || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">
          Add to Calendar
        </h3>
        <p className="text-sm text-gray-400">
          Schedule typing practice sessions in your calendar. Click on events
          to open Touch Typer directly.
        </p>
      </div>

      {/* Time Picker */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label className="text-sm font-medium text-white">Practice Time</Label>
          <Description className="text-sm text-gray-500">
            When do you want to practice?
          </Description>
        </span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="block w-32 rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </Field>

      {/* Duration */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label className="text-sm font-medium text-white">
            Session Duration
          </Label>
          <Description className="text-sm text-gray-500">
            How long is each practice session?
          </Description>
        </span>
        <Select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className={clsx(
            "block w-32 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
            "*:text-black"
          )}
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>

      {/* Day Selector */}
      <Field as="div">
        <Label className="text-sm font-medium text-white block mb-2">
          Practice Days
        </Label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id)}
              className={clsx(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                days.includes(day.id)
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Repeat Duration */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label className="text-sm font-medium text-white">
            Schedule Duration
          </Label>
          <Description className="text-sm text-gray-500">
            How long should the schedule repeat?
          </Description>
        </span>
        <Select
          value={weeksCount}
          onChange={(e) => setWeeksCount(Number(e.target.value))}
          className={clsx(
            "block w-32 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
            "*:text-black"
          )}
        >
          {WEEKS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </Select>
      </Field>

      {/* Preview */}
      {days.length > 0 && (
        <div className="p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Schedule Preview:</p>
          <p className="text-white font-medium">{scheduleDescription}</p>
        </div>
      )}

      {days.length === 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            Please select at least one day to create a schedule.
          </p>
        </div>
      )}

      {/* Calendar Buttons */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Add to your calendar:</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleDownloadICS}
            disabled={days.length === 0 || isDownloading}
            className={clsx(
              "cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white transition-colors",
              days.length > 0
                ? "bg-white/10 hover:bg-white/20"
                : "bg-white/5 opacity-50 cursor-not-allowed"
            )}
          >
            <FontAwesomeIcon icon={faDownload} />
            <span>Download .ics</span>
          </button>

          <button
            onClick={handleGoogleCalendar}
            disabled={days.length === 0}
            className={clsx(
              "cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white transition-colors",
              days.length > 0
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-600/50 opacity-50 cursor-not-allowed"
            )}
          >
            <FontAwesomeIcon icon={faGoogle} />
            <span>Google</span>
          </button>

          <button
            onClick={handleOutlookCalendar}
            disabled={days.length === 0}
            className={clsx(
              "cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white transition-colors",
              days.length > 0
                ? "bg-[#0078d4] hover:bg-[#106ebe]"
                : "bg-[#0078d4]/50 opacity-50 cursor-not-allowed"
            )}
          >
            <FontAwesomeIcon icon={faCalendarPlus} />
            <span>Outlook</span>
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Tip: The .ics file works with Apple Calendar, Outlook desktop, and
          most calendar apps.
        </p>
      </div>
    </div>
  );
}

export default CalendarSettings;
