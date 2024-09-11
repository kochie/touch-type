import { createAuthLink } from "aws-appsync-auth-link";
import { runWithAmplifyServerContext } from "./amplify-utils";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { cookies } from "next/headers";

export const authLinkSSR = createAuthLink({
  url: process.env.NEXT_PUBLIC_API_URL || "",
  region: "ap-southeast-2",
  auth: {
    type: "AMAZON_COGNITO_USER_POOLS",
    jwtToken: () =>
      runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: (contextSpec) =>
          fetchAuthSession(contextSpec).then(
            (session) => session.tokens?.idToken?.toString() ?? "",
          ),
      }),
  },
});
