
export enum Category {
  Speed = "speed",
  Accuracy = "accuracy",
  Ergonomics = "ergonomics",
  Practice = "practice",
  Rhythm = "rhythm",
}

export function getCategoryDataKey(category: string) {
  if (category === "speed") {
    return "wpm";
  } else if (category === "accuracy") {
    return "accuracy";
  } else if (category === "ergonomics") {
    return "score";
  } else if (category === "rhythm") {
    return "consistency";
  } else {
    return "minutes";
  }
}

export function formatTooltipValue(category: string) {
  return (value, name, props) => {
    if (category === "speed") {
      return `${value} WPM`;
    } else if (category === "accuracy") {
      return `${value}%`;
    } else if (category === "ergonomics") {
      return `${value} Score`;
    } else if (category === "practice") {
      return `${props.payload.label}`;
    } else if (category === "rhythm") {
      return `${value}ms`;
    }
    return value;
  };
}

export function formatTick(category: string): ((value: any, index: number) => string) | undefined {
  return (tick) => {
    if (category === "speed") {
      return `${tick}`;
    } else if (category === "accuracy") {
      return `${tick}%`;
    } else if (category === "ergonomics") {
      return `${tick}`;
    } else if (category === "practice") {
      return `${tick} min`;
    } else if (category === "rhythm") {
      return `${tick}ms`;
    }
    return tick;
  };
}