/**
 * Calendar integration utilities for generating .ics files and calendar URLs
 */

export interface PracticeSession {
  title: string;
  description?: string;
  duration: number; // minutes
  startTime: Date;
  recurrence?: {
    frequency: "DAILY" | "WEEKLY";
    days?: ("MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU")[];
    until?: Date;
    count?: number;
  };
}

/**
 * Format a date for ICS format (YYYYMMDDTHHMMSS)
 */
function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
    .slice(0, 15);
}

/**
 * Format a date for Google Calendar URL
 */
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generate an ICS file content for a practice session
 */
export function generateICS(session: PracticeSession): string {
  const endTime = new Date(session.startTime.getTime() + session.duration * 60000);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@touchtyper.io`;

  const deepLink = `touchtyper://practice?duration=${session.duration}&mode=timed`;

  // Build RRULE if recurrence is set
  let rrule = "";
  if (session.recurrence) {
    const parts = [`RRULE:FREQ=${session.recurrence.frequency}`];

    if (session.recurrence.days?.length) {
      parts.push(`BYDAY=${session.recurrence.days.join(",")}`);
    }
    if (session.recurrence.until) {
      parts.push(`UNTIL=${formatICSDate(session.recurrence.until)}`);
    }
    if (session.recurrence.count) {
      parts.push(`COUNT=${session.recurrence.count}`);
    }

    rrule = parts.join(";") + "\n";
  }

  const description = [
    session.description || "Time to practice your typing skills!",
    "",
    "Click to open Touch Typer:",
    deepLink,
  ].join("\\n");

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Touch Typer//Practice Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(session.startTime)}
DTEND:${formatICSDate(endTime)}
SUMMARY:${session.title}
DESCRIPTION:${description}
URL:${deepLink}
${rrule}BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Time to practice typing!
TRIGGER:-PT2M
END:VALARM
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Touch Typer session starting now
TRIGGER:PT0M
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

/**
 * Download an ICS file to the user's computer
 */
export function downloadICS(
  session: PracticeSession,
  filename = "touch-typer-practice"
): void {
  const ics = generateICS(session);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate a Google Calendar URL for adding an event
 */
export function generateGoogleCalendarUrl(session: PracticeSession): string {
  const endTime = new Date(session.startTime.getTime() + session.duration * 60000);
  const deepLink = `touchtyper://practice?duration=${session.duration}&mode=timed`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates: `${formatGoogleDate(session.startTime)}/${formatGoogleDate(endTime)}`,
    details: `${session.description || "Practice your typing skills!"}\n\nOpen app: ${deepLink}`,
  });

  // Add recurrence if specified
  if (session.recurrence) {
    let recur = `RRULE:FREQ=${session.recurrence.frequency}`;
    if (session.recurrence.days?.length) {
      recur += `;BYDAY=${session.recurrence.days.join(",")}`;
    }
    params.set("recur", recur);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an Outlook calendar URL for adding an event
 */
export function generateOutlookUrl(session: PracticeSession): string {
  const endTime = new Date(session.startTime.getTime() + session.duration * 60000);
  const deepLink = `touchtyper://practice?duration=${session.duration}&mode=timed`;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: session.title,
    startdt: session.startTime.toISOString(),
    enddt: endTime.toISOString(),
    body: `${session.description || "Practice your typing skills!"}\n\nOpen app: ${deepLink}`,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Map day abbreviations to iCal day codes
 */
const dayToICalMap: Record<string, "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU"> = {
  mon: "MO",
  tue: "TU",
  wed: "WE",
  thu: "TH",
  fri: "FR",
  sat: "SA",
  sun: "SU",
};

/**
 * Map day abbreviations to day numbers (0 = Sunday)
 */
const dayToNumberMap: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Create a practice session from user configuration
 */
export function createPracticeSession(config: {
  time: string; // "HH:MM"
  duration: number; // minutes
  days: string[]; // ["mon", "tue", ...]
  repeat: boolean;
  weeksCount?: number;
}): PracticeSession {
  const [hours, minutes] = config.time.split(":").map(Number);

  // Start with today at the specified time
  const startTime = new Date();
  startTime.setHours(hours, minutes, 0, 0);

  // If time has passed today, start tomorrow
  if (startTime <= new Date()) {
    startTime.setDate(startTime.getDate() + 1);
  }

  // Get valid day numbers from config
  const validDays = config.days
    .filter((d) => dayToNumberMap[d] !== undefined)
    .map((d) => dayToNumberMap[d]);

  // Move to the next valid day if needed
  if (validDays.length > 0) {
    let attempts = 0;
    while (!validDays.includes(startTime.getDay()) && attempts < 7) {
      startTime.setDate(startTime.getDate() + 1);
      attempts++;
    }
  }

  const session: PracticeSession = {
    title: "Touch Typer Practice",
    description: `${config.duration} minute typing practice session`,
    duration: config.duration,
    startTime,
  };

  // Add recurrence if enabled
  if (config.repeat && config.days.length > 0) {
    const icalDays = config.days
      .filter((d) => dayToICalMap[d])
      .map((d) => dayToICalMap[d]);

    session.recurrence = {
      frequency: "WEEKLY",
      days: icalDays,
      count: config.weeksCount ? config.weeksCount * config.days.length : undefined,
    };
  }

  return session;
}

/**
 * Get a human-readable description of the schedule
 */
export function getScheduleDescription(config: {
  time: string;
  duration: number;
  days: string[];
  weeksCount?: number;
}): string {
  const dayLabels: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };

  let daysDescription: string;

  if (config.days.length === 7) {
    daysDescription = "Every day";
  } else if (
    config.days.length === 5 &&
    config.days.includes("mon") &&
    config.days.includes("tue") &&
    config.days.includes("wed") &&
    config.days.includes("thu") &&
    config.days.includes("fri") &&
    !config.days.includes("sat") &&
    !config.days.includes("sun")
  ) {
    daysDescription = "Weekdays";
  } else if (
    config.days.length === 2 &&
    config.days.includes("sat") &&
    config.days.includes("sun")
  ) {
    daysDescription = "Weekends";
  } else {
    daysDescription = config.days.map((d) => dayLabels[d] || d).join(", ");
  }

  const weeksText =
    config.weeksCount && config.weeksCount > 0
      ? ` for ${config.weeksCount} weeks`
      : " (recurring)";

  return `${config.duration} min at ${config.time} on ${daysDescription}${weeksText}`;
}
