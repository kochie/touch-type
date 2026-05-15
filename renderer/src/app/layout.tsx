import "@/lib/temporal-polyfill";
import Providers from "./Providers";
import "@/styles/globals.css";
import Fathom from "@/components/Fathom";
import "@/lib/i18n";
import { PlatformBody } from "@/components/PlatformBody";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <PlatformBody>
        <Fathom />
        <Providers>
          {children}
        </Providers>
      </PlatformBody>
    </html>
  );
}
