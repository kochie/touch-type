
import { Suspense } from "react";
import { ClientAssistant } from "./client";

export default function AssistantPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientAssistant />
    </Suspense>
  );
}
