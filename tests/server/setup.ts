// Server test setup — stubs the Nitro auto-imports our handlers rely on
// with h3's own real implementations (h3 is a direct dependency, not a
// mock), so handler code runs unmodified outside of a Nitro build.
import { vi } from 'vitest'
import {
  createError, defineEventHandler, getHeader, getQuery, getRequestIP,
  getRouterParam, readBody, readRawBody, setHeader, setResponseStatus
} from 'h3'

vi.stubGlobal('createError', createError)
vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('getHeader', getHeader)
vi.stubGlobal('getQuery', getQuery)
vi.stubGlobal('getRequestIP', getRequestIP)
vi.stubGlobal('getRouterParam', getRouterParam)
vi.stubGlobal('readBody', readBody)
vi.stubGlobal('readRawBody', readRawBody)
vi.stubGlobal('setHeader', setHeader)
vi.stubGlobal('setResponseStatus', setResponseStatus)

// Nitro's own fetch instance (distinct from h3) -- only server/api/health.get.ts
// uses it (`$fetch.raw(...)`). Each test that exercises that path overrides
// the mock's behavior; this default just keeps every other handler's import
// from crashing on an undefined global.
vi.stubGlobal('$fetch', Object.assign(vi.fn(), { raw: vi.fn() }))
