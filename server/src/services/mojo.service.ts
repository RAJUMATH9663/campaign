import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export interface MojoValidationResult {
  engine: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  elapsedMicroseconds: number;
  rows: {
    name: string;
    rawPhone: string;
    normalizedPhone: string;
    email: string;
    isValid: boolean;
    isDuplicate: boolean;
    error: string;
  }[];
}

/**
 * Executes the native Mojo 1.0 contact validation engine.
 * Validates, normalizes to E.164, and deduplicates at native hardware speeds.
 */
export function validateCsvWithMojo(csvContent: string): Promise<MojoValidationResult> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `mojo_import_${Date.now()}.csv`);
    fs.writeFileSync(tempFile, csvContent, "utf-8");

    // Convert Windows path to WSL /mnt/ path
    const wslTempPath = tempFile.replace(/^([a-zA-Z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`).replace(/\\/g, "/");
    const wslBinaryPath = "/mnt/c/Users/user/Downloads/campaign-manager/mojo-engine/contact_validator";

    const cmd = `wsl ${wslBinaryPath} "${wslTempPath}"`;

    exec(cmd, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch {}

      if (error) {
        return reject(new Error(`Mojo execution failed: ${stderr || error.message}`));
      }

      try {
        const jsonStart = stdout.indexOf("{");
        if (jsonStart === -1) throw new Error("No JSON produced by Mojo engine");
        const jsonStr = stdout.slice(jsonStart);
        const result: MojoValidationResult = JSON.parse(jsonStr);
        resolve(result);
      } catch (err: any) {
        reject(new Error(`Failed to parse Mojo output: ${err.message}`));
      }
    });
  });
}
