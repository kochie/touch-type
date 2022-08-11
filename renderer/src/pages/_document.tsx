import Document, { Html, Head, Main, NextScript } from "next/document";
// import "../assets/RobotoMono-Regular.ttf";

const os = require("os");

const isMac = os.platform() === "darwin";
const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="true"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap"
            rel="stylesheet"
          /> */}
        </Head>
        <body
          className={
            isWindows
              ? "dark:text-white text-black dark:bg-zinc-800 bg-zinc-300"
              : ""
          }
        >
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
