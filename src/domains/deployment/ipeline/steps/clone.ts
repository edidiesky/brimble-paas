import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import type { LogWriter } from "../log-writer";
import { WORKSPACES_DIR } from "../../../../shared/constants";
import { PipelineError } from "../../../../shared/utils/error";

export async function cloneStep(
  deploymentId: string,
  sourceType: string,
  sourceRef: string,
  log: LogWriter
): Promise<string> {
  const workDir = path.join(WORKSPACES_DIR, deploymentId);

  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
  }

  try {
    if (sourceType === "git") {
      log(`Cloning repository: ${sourceRef}`, "clone");

      execSync(`git clone --depth=1 ${sourceRef} ${workDir}`, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      log("Clone complete", "clone");
    } else {
      // upload: sourceRef is path to extracted directory on disk
      log(`Using uploaded source at ${sourceRef}`, "clone");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Clone failed: ${message}`, "clone");
    throw new PipelineError(message, deploymentId, "clone");
  }

  return workDir;
}