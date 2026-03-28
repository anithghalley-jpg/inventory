import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Webhook endpoint for bulk syncing Google Sheets tables
http.route({
  path: "/syncTable",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { table, data } = body;
      
      await ctx.runMutation(internal.sync.syncTable, { table, data });
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
  }),
});

// Webhook endpoint for single row updates
http.route({
  path: "/syncRow",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { table, key, keyValue, data } = body;
      
      await ctx.runMutation(internal.sync.syncRow, { table, key, keyValue, data });
      
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
  }),
});

// Webhook endpoint for single row deletes
http.route({
  path: "/deleteRow",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { table, key, keyValue } = body;
      
      await ctx.runMutation(internal.sync.deleteRow, { table, key, keyValue });
      
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
  }),
});
// Webhook endpoint to delete rows missing from Google Sheets
http.route({
  path: "/deleteMissingRows",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { table, key, validKeys } = body;
      
      await ctx.runMutation(internal.sync.deleteMissingRows, { table, key, validKeys });
      
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
  }),
});

export default http;
