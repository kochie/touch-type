"use client";

// import { Amplify } from "aws-amplify";
import { SettingsProvider } from "@/lib/settings_hook";
import { UserProvider } from "@/lib/user_hook";
import { ApolloWrapper } from "@/lib/apollo-provider";
import { WordProvider } from "@/lib/word-provider";
import { Amplify } from "aws-amplify";

Amplify.configure(
  {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_USERPOOL_CLIENT_ID!,
      },
    },
  },
  { ssr: true },
);

export default function Providers({ children }) {
  return (
    <UserProvider>
      <ApolloWrapper>
        <SettingsProvider>
          <WordProvider>{children}</WordProvider>
        </SettingsProvider>
      </ApolloWrapper>
    </UserProvider>
  );
}
