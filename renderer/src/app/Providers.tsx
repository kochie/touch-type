"use client";

import { Auth } from "aws-amplify";
import { SettingsProvider } from "@/lib/settings_hook";
import { UserProvider } from "@/lib/user_hook";
import { ApolloWrapper } from "@/lib/apollo-provider";

Auth.configure({
  userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID,
  userPoolWebClientId: process.env.NEXT_PUBLIC_USERPOOL_CLIENT_ID,
  region: "ap-southeast-2",
  ssr: true,
});

export default function Providers({ children }) {
  return (
    <UserProvider>
      <ApolloWrapper>
        <SettingsProvider>{children}</SettingsProvider>
      </ApolloWrapper>
    </UserProvider>
  );
}
