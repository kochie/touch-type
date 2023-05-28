import Providers from "./Providers";
import {Auth} from "aws-amplify"

const os = require("os");

const isMac = os.platform() === "darwin";
const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

import "@/styles/globals.css";
import Fathom from "@/components/Fathom";

Auth.configure({
  userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID,
  userPoolWebClientId: process.env.NEXT_PUBLIC_USERPOOL_CLIENT_ID,
  region: "ap-southeast-2",
  ssr: true
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={
          isWindows
            ? "dark:text-white text-black dark:bg-zinc-800 bg-zinc-300"
            : ""
        }
      >
        <Fathom />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
