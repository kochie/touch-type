'use client';

import { Amplify, ResourcesConfig } from 'aws-amplify';

const outputs: ResourcesConfig = {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_USERPOOL_CLIENT_ID!,
        userPoolEndpoint: process.env.NEXT_PUBLIC_AUTH_URL,
      },
    },
  };

Amplify.configure(outputs, { ssr: false });

export default function ConfigureAmplifyClientSide() {
  return null;
}