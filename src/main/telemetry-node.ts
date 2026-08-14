import * as store from './store-node'
import { app } from 'electron'
import { ofetch } from 'ofetch'

// Telemetry is disabled.
// Google Analytics Measurement Protocol endpoint is not called.
// Constants are left for reference but the event function is a no-op.

// Measurement ID and API Secret are intentionally left empty.
// const measurement_id = `G-B365F44W6E`
// const api_secret = `3H5zJ3WTSAm-4jOajRDP7A`

// export async function event(name: string, params: any = {}) {
//   const clientId = store.getConfig().uuid
//   const res = await ofetch(
//     `https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`,
//     {
//       method: 'POST',
//       body: {
//         user_id: clientId,
//         client_id: clientId,
//         events: [
//           {
//             name: name,
//             params: {
//               app_name: 'chatbox',
//               app_version: app.getVersion(),
//               chatbox_platform_type: 'desktop',
//               chatbox_platform: 'desktop',
//               app_platform: process.platform,
//               ...params,
//             },
//           },
//         ],
//       },
//     }
//   )
//   return res
// }

// Disabled: always returns undefined without making a network call.
export function event(name: string, params: any = {}): undefined {
  // Telemetry intentionally disabled.
  return undefined
}

// Optionally, expose a flag for other modules to check.
export const isTelemetryEnabled = false