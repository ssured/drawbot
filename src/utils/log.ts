import debug from "debug";

const debugPathFromFilename = (file: string, scope: string) => {
  const parts = file.match(/^.*[\\\/]src[\\\/](.*).ts$/i);
  if (parts == null) return `${scope}:${file}`;
  const path = parts[1].split(/[\\\/]/) as string[];
  return `${scope}:${path.join(":")}`;
};

export const createLogger = (
  provide$__filename$variable$here: string,
  scope: string = "project"
) => debug(debugPathFromFilename(provide$__filename$variable$here, scope));
