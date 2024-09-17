// Native
import { createServer } from "http";
import { join, isAbsolute, normalize } from "path";

// Packages
import { app, protocol } from "electron";
// import isDev from 'electron-is-dev'
// import { resolve } from "app-root-path";
import pkg from 'app-root-path';
const { resolve } = pkg;


interface Directories {
  [key: string]: string;
  production: string;
  development: string;
}

const devServer = async (dir: string, port?: number) => {
  // We need to load it here because the app's production
  // bundle shouldn't include it, which would result
  // in an error
  const next = require("next")({ dev: true, dir });
  const requestHandler = next.getRequestHandler();

  // Build the renderer code and watch the files
  await next.prepare();

  // But if developing the application, create a
  // new native HTTP server (which supports hot code reloading)
  const server = createServer(requestHandler);

  server.listen(port || 8000, () => {
    // Make sure to stop the server when the app closes
    // Otherwise it keeps running on its own
    app.on("before-quit", () => server.close());
  });
};

const adjustRenderer = (directory: string) => {
  const paths = ["/_next", "/static"];
  const isWindows = process.platform === "win32";

  const rscFile = /\/.+\.txt/;

  protocol.interceptFileProtocol("file", (request, callback) => {
    let path = request.url.substr(isWindows ? 8 : 7);

    let newPath = path;

    // On windows the request looks like: file:///C:/static/bar
    // On other systems it's file:///static/bar
    if (isWindows) {
      newPath = newPath.substr(2);
    }

    if (
      paths.some((prefix) => newPath.startsWith(prefix)) ||
      rscFile.test(newPath)
    ) {
      if (isWindows) {
        newPath = normalize(newPath);
      }

      newPath = join(directory, "out", newPath);
      path = newPath;
    }

    // Electron doesn't like anything in the path to be encoded,
    // so we need to undo that. This specifically allows for
    // Electron apps with spaces in their app names.
    path = decodeURIComponent(path);

    callback({ path });
  });
};

export default async (directories: Directories | string, port?: number) => {
  if (!directories) {
    throw new Error("Renderer location not defined");
  }

  if (typeof directories === "string") {
    directories = {
      production: directories,
      development: directories,
    };
  }

  for (const directory in directories) {
    if (!Object.hasOwnProperty.call(directories, directory)) {
      continue;
    }

    if (!isAbsolute(directories[directory])) {
      directories[directory] = resolve(directories[directory]);
    }
  }

  const isDev = await import("electron-is-dev");
  if (!isDev.default) {
    // adjustRenderer(directories.production);
    return;
  }

  await devServer(directories.development, port);
};
