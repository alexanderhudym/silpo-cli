import { spawn } from "node:child_process";

function launcher(): { command: string; args: readonly string[] } {
  switch (process.platform) {
    case "darwin":
      return { command: "open", args: [] };
    case "win32":
      return { command: "cmd", args: ["/c", "start", ""] };
    default:
      return { command: "xdg-open", args: [] };
  }
}

export function openInBrowser(url: string): boolean {
  const { command, args } = launcher();
  try {
    const child = spawn(command, [...args, url], { stdio: "ignore", detached: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
