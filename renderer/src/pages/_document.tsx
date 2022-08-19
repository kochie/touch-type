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
        <Head></Head>
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
