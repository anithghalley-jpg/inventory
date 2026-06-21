/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aspects from "../aspects.js";
import type * as dashboardUpdates from "../dashboardUpdates.js";
import type * as fabAcademy from "../fabAcademy.js";
import type * as fabInterns from "../fabInterns.js";
import type * as home from "../home.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as learningPlans from "../learningPlans.js";
import type * as machines from "../machines.js";
import type * as projects from "../projects.js";
import type * as requests from "../requests.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as sheetsSync from "../sheetsSync.js";
import type * as sync from "../sync.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aspects: typeof aspects;
  dashboardUpdates: typeof dashboardUpdates;
  fabAcademy: typeof fabAcademy;
  fabInterns: typeof fabInterns;
  home: typeof home;
  http: typeof http;
  inventory: typeof inventory;
  learningPlans: typeof learningPlans;
  machines: typeof machines;
  projects: typeof projects;
  requests: typeof requests;
  seed: typeof seed;
  settings: typeof settings;
  sheetsSync: typeof sheetsSync;
  sync: typeof sync;
  users: typeof users;
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
