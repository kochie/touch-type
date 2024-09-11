import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import { registerApolloClient } from "@apollo/experimental-nextjs-app-support";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { createAuthLink } from "aws-appsync-auth-link";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "./amplify-utils";

export const { getClient } = registerApolloClient(() => {
  const authLink = createAuthLink({
    url: process.env.NEXT_PUBLIC_API_URL || "",
    region: "ap-southeast-2",
    auth: {
      type: "AMAZON_COGNITO_USER_POOLS",
      jwtToken: () =>
        runWithAmplifyServerContext({
          nextServerContext: { cookies },
          operation: (contextSpec) =>
            fetchAuthSession(contextSpec).then(
              (session) => session.tokens?.idToken?.toString() ?? ""
            ),
        }),
    },
  });

  const httpLink = new HttpLink({
    // this needs to be an absolute url, as relative urls cannot be used in SSR
    uri: process.env.NEXT_PUBLIC_API_URL,
    // you can disable result caching here if you want to
    // (this does not work if you are rendering your page with `export const dynamic = "force-static"`)
    fetchOptions: { cache: "no-store" },
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([authLink, httpLink]),
  });
});
