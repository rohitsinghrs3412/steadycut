import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send weigh-in reminders",
  { minutes: 15 },
  internal.pushActions.sendDueReminders
);

crons.interval(
  "delete stale meal estimates",
  { minutes: 30 },
  internal.mealLogs.deleteStaleEstimatingMealLogs
);

export default crons;
