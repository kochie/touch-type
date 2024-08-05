import Providers from "./Providers";
import { Amplify } from "aws-amplify";

const os = require("os");

const isMac = os.platform() === "darwin";
const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

import "@/styles/globals.css";
import Fathom from "@/components/Fathom";
import clsx from "clsx";



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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={clsx(
          !isMac && "dark:text-white text-black dark:bg-zinc-800 bg-zinc-300",
          "w-screen min-h-screen dark:text-white"
        )}
      >
        <Fathom />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
