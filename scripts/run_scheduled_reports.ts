#!/usr/bin/env node
import scheduler from "../lib/scheduledReports";

async function main() {
  console.log("Running scheduled reports...");
  const results = await scheduler.runDueSchedules();
  console.log("Results:", JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
