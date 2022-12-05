import "../styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import * as Fathom from "fathom-client";
import { KeyboardProvider } from "../lib/keyboard_hook";

function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Initialize Fathom when the app loads
    // Example: yourdomain.com
    //  - Do not include https://
    //  - This must be an exact match of your domain.
    //  - If you're using www. for your domain, make sure you include that here.
    Fathom.load("FTEFDASP");

    function onRouteChangeComplete() {
      Fathom.trackPageview();
    }
    // Record a pageview when route changes
    router.events.on("routeChangeComplete", onRouteChangeComplete);

    // Unassign event listener
    return () => {
      router.events.off("routeChangeComplete", onRouteChangeComplete);
    };
  }, [router.events]);

  return (
    <KeyboardProvider>
      <Component {...pageProps} />;
    </KeyboardProvider>
  );
}

export default App;
