#!/usr/bin/env node

import { errorMessage, LaneError } from "./errors.js";
import { runCli } from "./cli.js";

runCli(process.argv.slice(2)).catch((error: unknown) => {
  const output = {
    ok: false,
    code: error instanceof LaneError ? error.code : "UNEXPECTED_ERROR",
    error: errorMessage(error),
  };
  process.stderr.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = 1;
});
