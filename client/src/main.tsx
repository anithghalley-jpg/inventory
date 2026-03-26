import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";
import { requireConvexUrl } from "./config";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

try {
  const convex = new ConvexReactClient(requireConvexUrl());

  createRoot(rootElement).render(
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  createRoot(rootElement).render(
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-50">
      <div className="max-w-lg rounded-2xl border border-red-500/40 bg-slate-900 p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Configuration Error</p>
        <h1 className="mt-3 text-2xl font-semibold">The app cannot start on this deployment.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Verify the Firebase Hosting build environment includes <code>VITE_CONVEX_URL</code>, then rebuild and redeploy.
        </p>
      </div>
    </div>
  );
}
