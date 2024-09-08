import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "@headlessui/react";
import { Card } from "./Card";

const getDailyChallenge = (category) => {
  switch (category) {
    case "speed":
      return "Type 100 words in 2 minutes";
    case "accuracy":
      return "Type a paragraph with 99% accuracy";
    case "ergonomics":
      return "Complete a 5-minute typing session with perfect posture";
    case "practice":
      return "Practice for 30 minutes today";
    case "rhythm":
      return "Maintain a consistent 60 WPM for 3 minutes";
    default:
      return "No challenge available";
  }
};

export function ChallengeCard({
  category,
  startChallenge,
  isChallengeActive,
  challengeTime,
}: {
  category: string;
  startChallenge: () => void;
  isChallengeActive: boolean;
  challengeTime: number;
}) {
  return (
    <Card header={<div>Daily Challengers</div>}>
      <p className="mb-4">{getDailyChallenge(category)}</p>
      <div className="flex items-center justify-between">
        <Button onClick={startChallenge} disabled={isChallengeActive}>
          <FontAwesomeIcon icon={faPlay} className="mr-2" />
          Start Challenge
        </Button>
        <div className="text-2xl font-bold">
          {Math.floor(challengeTime / 60)}:
          {(challengeTime % 60).toString().padStart(2, "0")}
        </div>
      </div>
    </Card>
  );
}
