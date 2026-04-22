/* =========================================
   CINEMATIC MUSIC OVERLAY — LOGIC
   ========================================= */
(() => {
  const CFG = window.OVERLAY_CONFIG;

  // Apply theme
  Object.entries(CFG.THEME || {}).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });

  // DOM refs
  const el = {
    thumb:       document.getElementById("thumb"),
    art:         document.getElementById("albumArt"),
    title:       document.getElementById("title"),
    artist:      document.getElementById("artist"),
    progressFill:document.getElementById("progressFill"),
    progressGlow:document.getElementById("progressGlow"),
    timeCurrent: document.getElementById("timeCurrent"),
    timeTotal:   document.getElementById("timeTotal"),
    queueList:   document.getElementById("queueList"),
    queueCount:  document.getElementById("queueCount"),
    ambient:     document.getElementById("ambientLayer"),
    particles:   document.getElementById("particles"),
  };

  // State
  let currentSong = null;
  let currentQueue = [];
  let progressStart = 0;
  let progressDuration = 0;
  let progressTimer = null;

  /* ============ Particles ============ */
  function spawnParticles() {
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDuration = (8 + Math.random() * 10) + "s";
      p.style.animationDelay = (Math.random() * 8) + "s";
      p.style.width = p.style.height = (1 + Math.random() * 3) + "px";
      el.particles.appendChild(p);
    }
  }
  spawnParticles();

  /* ============ Format helpers ============ */
  const fmtTime = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  /* ============ Update Now Playing ============ */
  function updateNowPlaying(song) {
    if (!song) {
      el.title.textContent = "Waiting for requests...";
      el.artist.textContent = "Queue is empty";
      el.thumb.src = "";
      return;
    }

    const changed = !currentSong || currentSong.id !== song.id;
    if (!changed) return;

    currentSong = song;

    // Trigger cinematic morph
    el.art.classList.remove("changing");
    void el.art.offsetWidth;
    el.art.classList.add("changing");

    el.title.classList.remove("updating");
    void el.title.offsetWidth;
    el.title.classList.add("updating");

    setTimeout(() => {
      el.thumb.src = song.thumbnail;
      el.title.textContent = song.title;
      el.artist.textContent = song.artist || "YouTube";
      // Ambient background using thumbnail
      el.ambient.style.setProperty("--bg-image", `url("${song.thumbnail}")`);
      el.ambient.style.backgroundImage = `url("${song.thumbnail}")`;
    }, 300);

    // Progress
    progressStart = Date.now();
    progressDuration = (song.duration || 0) * 1000;
    el.timeTotal.textContent = fmtTime(song.duration || 0);
    startProgressTimer();
  }

  function startProgressTimer() {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      if (!progressDuration) return;
      const elapsed = Date.now() - progressStart;
      const pct = Math.min(100, (elapsed / progressDuration) * 100);
      el.progressFill.style.width = pct + "%";
      el.progressGlow.style.left = pct + "%";
      el.timeCurrent.textContent = fmtTime(elapsed / 1000);
      if (pct >= 100) clearInterval(progressTimer);
    }, 250);
  }

  /* ============ Update Queue ============ */
  function updateQueue(queue) {
    const shown = queue.slice(0, CFG.MAX_QUEUE_ITEMS);
    el.queueCount.textContent = queue.length;

    // Detect removed items for animation
    const oldIds = currentQueue.map(s => s.id);
    const newIds = shown.map(s => s.id);
    const noChange = oldIds.length === newIds.length && oldIds.every((v,i) => v===newIds[i]);
    if (noChange) return;

    currentQueue = shown;

    if (shown.length === 0) {
      el.queueList.innerHTML = `<div class="empty-queue">No songs in queue — use <b>!songrequest</b></div>`;
      return;
    }

    el.queueList.innerHTML = "";
    shown.forEach((s, i) => {
      const node = document.createElement("div");
      node.className = "queue-item";
      node.style.animationDelay = (i * 70) + "ms";
      node.innerHTML = `
        <div class="q-index">${i + 1}</div>
        <div class="q-thumb"><img src="${s.thumbnail}" alt=""/></div>
        <div class="q-info">
          <div class="q-title">${escapeHtml(s.title)}</div>
          <div class="q-user">${escapeHtml(s.user || "anonymous")}</div>
        </div>
      `;
      el.queueList.appendChild(node);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[m]);
  }

  /* ============ Nightbot API ============ */
  async function fetchNightbot() {
    try {
      // Public queue endpoint
      const url = `https://api.nightbot.tv/1/song_requests/queue?channel=${encodeURIComponent(CFG.NIGHTBOT_CHANNEL)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Nightbot API " + res.status);
      const data = await res.json();

      // Current
      const current = data.current ? normalizeSong(data.current) : null;
      // Queue
      const queue = (data.queue || []).map(normalizeSong);

      if (current) updateNowPlaying(current);
      else updateNowPlaying(null);
      updateQueue(queue);
    } catch (err) {
      console.warn("[Overlay] Nightbot fetch failed:", err.message);
      // If not configured, fallback to demo
      if (CFG.DEMO_MODE) runDemoTick();
    }
  }

  function normalizeSong(item) {
    const track = item.track || item;
    return {
      id:        track.providerId || track.id || Math.random().toString(36),
      title:     track.title || "Unknown",
      artist:    track.artist || track.provider || "YouTube",
      thumbnail: track.image || track.thumbnail ||
                 `https://i.ytimg.com/vi/${track.providerId}/hqdefault.jpg`,
      duration:  track.duration || 0,
      user:      item.user?.displayName || item.user?.name || "anonymous",
    };
  }

  /* ============ Demo Mode ============ */
  const DEMO_SONGS = [
    { id:"d1", title:"Blinding Lights", artist:"The Weeknd", thumbnail:"https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg", duration:200, user:"viewer_42" },
    { id:"d2", title:"Levitating", artist:"Dua Lipa", thumbnail:"https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg", duration:203, user:"musiclover" },
    { id:"d3", title:"Sunflower", artist:"Post Malone", thumbnail:"https://i.ytimg.com/vi/ApXoWvfEYVU/hqdefault.jpg", duration:158, user:"nova_stream" },
    { id:"d4", title:"Starboy", artist:"The Weeknd", thumbnail:"https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg", duration:230, user:"dj_kai" },
    { id:"d5", title:"Bad Guy", artist:"Billie Eilish", thumbnail:"https://i.ytimg.com/vi/DyDfgMOUjCI/hqdefault.jpg", duration:194, user:"eclipse" },
    { id:"d6", title:"As It Was", artist:"Harry Styles", thumbnail:"https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg", duration:167, user:"lumen" },
  ];

  let demoIdx = 0;
  function runDemoTick() {
    const current = DEMO_SONGS[demoIdx % DEMO_SONGS.length];
    const queue = [];
    for (let i = 1; i <= 5; i++) queue.push(DEMO_SONGS[(demoIdx + i) % DEMO_SONGS.length]);
    updateNowPlaying(current);
    updateQueue(queue);
  }

  function startDemoLoop() {
    runDemoTick();
    // Advance every 15s in demo
    setInterval(() => { demoIdx++; runDemoTick(); }, 15000);
  }

  /* ============ Boot ============ */
  if (CFG.DEMO_MODE || !CFG.NIGHTBOT_CHANNEL || CFG.NIGHTBOT_CHANNEL === "YOUR_CHANNEL_NAME") {
    console.log("[Overlay] Running in DEMO mode");
    startDemoLoop();
  } else {
    fetchNightbot();
    setInterval(fetchNightbot, CFG.POLL_INTERVAL);
  }
})();
