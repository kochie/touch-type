"use client";
// ^ this file needs the "use client" pragma

import {
  ApolloLink,
  HttpLink,
  SuspenseCache,
} from "@apollo/client";
import {
  NextSSRApolloClient,
  ApolloNextAppProvider,
  NextSSRInMemoryCache,
  SSRMultipartLink,
} from "@apollo/experimental-nextjs-app-support/ssr";

import { createAuthLink } from "aws-appsync-auth-link";
import { Auth } from "aws-amplify";

// have a function to create a client for you
function makeClient() {
  const authLink = createAuthLink({
    url: process.env.NEXT_PUBLIC_API_URL || "",
    region: "ap-southeast-2",
    auth: {
      type: "AMAZON_COGNITO_USER_POOLS",
      jwtToken: async () =>
        (await Auth.currentSession()).getIdToken().getJwtToken(),
    },
  });

  const httpLink = new HttpLink({
    // this needs to be an absolute url, as relative urls cannot be used in SSR
    uri: process.env.NEXT_PUBLIC_API_URL,
    // you can disable result caching here if you want to
    // (this does not work if you are rendering your page with `export const dynamic = "force-static"`)
    fetchOptions: { cache: "no-store" },
  });

  return new NextSSRApolloClient({
    // use the `NextSSRInMemoryCache`, not the normal `InMemoryCache`
    cache: new NextSSRInMemoryCache(),
    link:
      typeof window === "undefined"
        ? ApolloLink.from([
            // in a SSR environment, if you use multipart features like
            // @defer, you need to decide how to handle these.
            // This strips all interfaces with a `@defer` directive from your queries.
            new SSRMultipartLink({
              stripDefer: true,
            }),
            authLink,
            httpLink,
          ])
        : ApolloLink.from([authLink, httpLink]),
  });
}

// also have a function to create a suspense cache
function makeSuspenseCache() {
  return new SuspenseCache();
}

// you need to create a component to wrap your app in
export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
