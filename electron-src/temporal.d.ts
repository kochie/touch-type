declare global {
  namespace Temporal {
    class Instant {
      static from(item: string | Instant): Instant;
      static fromEpochMilliseconds(epochMilliseconds: number): Instant;
      static fromEpochSeconds(epochSeconds: number): Instant;
      toString(): string;
      toZonedDateTimeISO(timeZone: string): ZonedDateTime;
      epochMilliseconds: number;
      epochSeconds: number;
    }

    class ZonedDateTime {
      static from(item: string | ZonedDateTime): ZonedDateTime;
      toString(): string;
      toInstant(): Instant;
    }

    class PlainDateTime {
      static from(item: string | PlainDateTime): PlainDateTime;
      toString(): string;
    }

    class PlainDate {
      static from(item: string | PlainDate): PlainDate;
      toString(): string;
    }

    class Duration {
      static from(item: string | Duration | DurationLike): Duration;
      toString(): string;
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    }

    interface DurationLike {
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
      milliseconds?: number;
      microseconds?: number;
      nanoseconds?: number;
    }

    function now(): Instant;
  }
}

export {};
