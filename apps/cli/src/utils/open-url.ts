import * as childProcess from "node:child_process";

export const openUrl = (url: string): void => {
  const openCommand =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";

  childProcess.exec(`${openCommand} ${JSON.stringify(url)}`, () => {});
};
