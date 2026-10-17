import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    ipAddress: {
      // Client IP for rate limiting and session tracking. Deployed, the app
      // is only reachable through the reverse proxy, which overwrites
      // `X-Real-IP` with the connecting address (docker/nginx/
      // default.conf.template) — unlike `X-Forwarded-For`, which it appends
      // to, so a client-sent value can't spoof it. Any proxy in front of the
      // app must do the same. In development better-auth falls back to
      // localhost.
      ipAddressHeaders: ['x-real-ip'],
    },
  },
  plugins: [tanstackStartCookies()],
})
