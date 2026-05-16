import { cronJobs } from "convex/server";
import { anyApi } from "convex/server";

const crons = cronJobs();

crons.interval(
  "send weigh-in reminders",
  { minutes: 15 },
  anyApi.pushActions.sendDueReminders
);

export default crons;
