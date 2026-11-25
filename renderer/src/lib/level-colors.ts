import { Levels } from "@/lib/settings_hook";

// Washed-out so charts stay calm, but distinct enough to tell levels apart.
// Typos use dusty rose, so no level should land near it.
export const LEVEL_COLORS: Record<Levels, string> = {
  [Levels.LEVEL_0]: "#8b95a3",
  [Levels.LEVEL_1]: "#6f9bbf",
  [Levels.LEVEL_2]: "#7ba88a",
  [Levels.LEVEL_3]: "#c9a96a",
  [Levels.LEVEL_4]: "#9a88c4",
  [Levels.LEVEL_5]: "#6bb0b0",
  [Levels.LEVEL_6]: "#bf8f6a",
};

export const colorForLevel = (level: Levels | undefined) =>
  (level && LEVEL_COLORS[level]) || LEVEL_COLORS[Levels.LEVEL_0];
