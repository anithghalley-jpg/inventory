/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as fabAcademy from "../fabAcademy.js";
import type * as home from "../home.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as requests from "../requests.js";
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
  fabAcademy: typeof fabAcademy;
  home: typeof home;
  http: typeof http;
  inventory: typeof inventory;
  requests: typeof requests;
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
