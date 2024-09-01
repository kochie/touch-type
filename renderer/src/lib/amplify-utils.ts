// utils/amplify-utils.ts

import { createServerRunner } from "@aws-amplify/adapter-nextjs";

const outputs = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_USERPOOL_CLIENT_ID!,
    },
  },
};

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});
