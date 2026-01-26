import Tracker from "@/components/Tracker";
import { StreakWarningBanner } from "@/components/StreakDisplay";

export default function IndexPage() {
  return (
    <div className="w-screen max-h-screen dark:text-white">
      <StreakWarningBanner />
      <Tracker />
    </div>
  );
}
