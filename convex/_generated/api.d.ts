/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_knownFoodEstimates from "../ai/knownFoodEstimates.js";
import type * as ai_mealPrompt from "../ai/mealPrompt.js";
import type * as checkIns from "../checkIns.js";
import type * as coach from "../coach.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as habits from "../habits.js";
import type * as hydrationAnalysis from "../hydrationAnalysis.js";
import type * as hydrationLogs from "../hydrationLogs.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_defaultHabits from "../lib/defaultHabits.js";
import type * as mealAnalysis from "../mealAnalysis.js";
import type * as mealLogs from "../mealLogs.js";
import type * as profiles from "../profiles.js";
import type * as pushActions from "../pushActions.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as scaleAnalysis from "../scaleAnalysis.js";
import type * as scaleLogs from "../scaleLogs.js";
import type * as uploads from "../uploads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/knownFoodEstimates": typeof ai_knownFoodEstimates;
  "ai/mealPrompt": typeof ai_mealPrompt;
  checkIns: typeof checkIns;
  coach: typeof coach;
  crons: typeof crons;
  dashboard: typeof dashboard;
  habits: typeof habits;
  hydrationAnalysis: typeof hydrationAnalysis;
  hydrationLogs: typeof hydrationLogs;
  "lib/auth": typeof lib_auth;
  "lib/defaultHabits": typeof lib_defaultHabits;
  mealAnalysis: typeof mealAnalysis;
  mealLogs: typeof mealLogs;
  profiles: typeof profiles;
  pushActions: typeof pushActions;
  pushNotifications: typeof pushNotifications;
  scaleAnalysis: typeof scaleAnalysis;
  scaleLogs: typeof scaleLogs;
  uploads: typeof uploads;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
