'use client';

import { Amplify } from 'aws-amplify';

const outputs = {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_USERPOOL_CLIENT_ID!,
      },
    },
  };

Amplify.configure(outputs, { ssr: true });

export default function ConfigureAmplifyClientSide() {
  return null;
}