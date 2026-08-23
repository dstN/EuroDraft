#!/usr/bin/env node
// Builds twice on purpose. On the node-server preset, the static-asset
// manifest embedded in the server bundle is frozen while `.output/public`
// is still empty -- the .br/.gz files that `nitro.compressPublicAssets`
// produces land on disk too late for that manifest to know about them, so
// they exist but are never actually served (verified via curl: no
// Content-Encoding header even with the option enabled).
//
// The second build's manifest scan runs against a `.output/public` that
// already contains the .br/.gz siblings the first build's compression pass
// left behind, so this time they make it into the manifest and get served
// correctly.
import { execSync } from 'node:child_process'

execSync('nuxt build', { stdio: 'inherit' })
execSync('nuxt build', { stdio: 'inherit' })
