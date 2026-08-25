// Phusion Passenger startup shim — delegates to the Nitro node-server output.
// PassengerStartupFile points here; the actual server is in .output/server/index.mjs.
// This file must stay at the project root; .output/ is relative to it.
//
// DEPLOYMENT.md's "try the simple option first" (pointing Startup File
// directly at .output/server/index.mjs, no wrapper) was tried first on the
// real ed.rntm.de deploy and produced Passenger's generic "Web application
// could not be started" for every route — the same failure mode
// DEPLOYMENT.md predicted might need this wrapper. The sibling GourMerge
// app (same account, same Netcup/Plesk hosting, same Node 26.7.0, same
// "type": "module" in package.json) uses exactly this file successfully in
// production, so it's the proven fix here rather than a guess.
import('./.output/server/index.mjs')
