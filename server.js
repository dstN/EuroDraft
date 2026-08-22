// server.js — Phusion Passenger startup entry point
// Passenger discovers this file by convention in the App Root.
// Dynamic import works in both CJS and ESM Node.js contexts.
// Nitro auto-reads process.env.PORT which Passenger injects.
import('./.output/server/index.mjs')
