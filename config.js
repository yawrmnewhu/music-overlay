/* =========================================
   CONFIGURATION — Edit these values
   ========================================= */
window.OVERLAY_CONFIG = {
  // Your Nightbot channel name (from your dashboard URL: nightbot.tv/commands)
  // Find it: go to https://api.nightbot.tv/1/song_requests/queue and use the channel id,
  // OR use public endpoint with your channel slug.
  NIGHTBOT_CHANNEL: "yrm-idk",

  // Polling interval (ms) — how often to refresh queue
  POLL_INTERVAL: 5000,

  // Max queue items to show
  MAX_QUEUE_ITEMS: 5,

  // Theme (override any CSS variable)
  THEME: {
    "--accent-1": "#a855f7",   // purple
    "--accent-2": "#ec4899",   // pink
    "--accent-3": "#06b6d4",   // cyan
  },

  // DEMO MODE — set to true to test without Nightbot
  DEMO_MODE: false,
};
