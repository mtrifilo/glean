import fs from "node:fs";

type ReadFileSync = typeof fs.readFileSync;

const JSDOM_STYLESHEET_SUFFIX = "/jsdom/lib/jsdom/browser/default-stylesheet.css";

let patchedReadFile = false;

function shouldHandleMissingStylesheet(pathArg: Parameters<ReadFileSync>[0]): boolean {
  return typeof pathArg === "string" && pathArg.endsWith(JSDOM_STYLESHEET_SUFFIX);
}

function patchReadFileForCompiledBinary(): void {
  if (patchedReadFile) {
    return;
  }

  const originalReadFileSync = fs.readFileSync.bind(fs);

  fs.readFileSync = ((pathArg: Parameters<ReadFileSync>[0], options?: Parameters<ReadFileSync>[1]) => {
    if (!shouldHandleMissingStylesheet(pathArg)) {
      return originalReadFileSync(pathArg, options as never);
    }

    try {
      return originalReadFileSync(pathArg, options as never);
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (typedError.code !== "ENOENT") {
        throw error;
      }

      const encoding =
        typeof options === "string"
          ? options
          : options && typeof options === "object"
            ? (options.encoding ?? null)
            : null;

      if (encoding) {
        return "";
      }

      return Buffer.from("");
    }
  }) as ReadFileSync;

  patchedReadFile = true;
}

patchReadFileForCompiledBinary();
