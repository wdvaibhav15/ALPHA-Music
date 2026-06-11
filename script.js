
// ── Playlist Data 
// Each track is a simulated entry 
// 'duration' is in seconds. 'color' sets the dynamic accent colour.

const tracks = [
  {
    title: "Neon Drift",
    artist: "Synthwave City",
    album: "Electric Dreams",
    genre: "SYNTHWAVE",
    emoji: "🌆",
    color: "#e8ff57",
    duration: 214,
  },
  {
    title: "Midnight Rain",
    artist: "The Velvet Moons",
    album: "Dark Horizons",
    genre: "INDIE POP",
    emoji: "🌙",
    color: "#b4a0ff",
    duration: 187,
  },
  {
    title: "Chrome Heart",
    artist: "Ada Noir",
    album: "Mechanical Love",
    genre: "ELECTRO",
    emoji: "⚙️",
    color: "#ff4d6d",
    duration: 243,
  },
  {
    title: "Solar Wind",
    artist: "Cosmo Atlas",
    album: "Beyond the Belt",
    genre: "AMBIENT",
    emoji: "☀️",
    color: "#ffd166",
    duration: 331,
  },
  {
    title: "Glass City",
    artist: "Mirror Lake",
    album: "Reflections",
    genre: "DREAM POP",
    emoji: "🏙️",
    color: "#06d6a0",
    duration: 198,
  },
  {
    title: "Red Desert",
    artist: "Dune Riders",
    album: "Sands of Mars",
    genre: "PSYCH ROCK",
    emoji: "🏜️",
    color: "#f4a261",
    duration: 275,
  },
  {
    title: "Static Love",
    artist: "Ada Noir",
    album: "Mechanical Love",
    genre: "ELECTRO",
    emoji: "⚡",
    color: "#ff4d6d",
    duration: 222,
  },
  {
    title: "Aurora Drive",
    artist: "Polar Sounds",
    album: "Northern Lights",
    genre: "CHILL",
    emoji: "🌌",
    color: "#90e0ef",
    duration: 308,
  },
];

// ── State ──────────────────────────────────────────────────────────────────
let currentIndex = 0;
let isPlaying = false;
let isShuffled = false;
let isRepeat = false;
let isAutoplay = false;
let elapsed = 0;
let timer = null;
let volume = 80;

// ── Web Audio (simulated tone per track) ───────────────────────────────────
let audioCtx = null;
let gainNode = null;
let oscillator = null;

/**
 * Lazily create the AudioContext on first interaction
 * (browsers require a user gesture before creating one).
 */
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);
  }
  return audioCtx;
}

/** Start a gentle sine-wave tone that represents the current track. */
function playTone() {
  const ctx = getAudioCtx();
  if (oscillator) {
    try {
      oscillator.stop();
    } catch (e) {}
    oscillator.disconnect();
  }
  oscillator = ctx.createOscillator();
  oscillator.type = "sine";
  // Give each track a slightly different pitch so switching is audible
  oscillator.frequency.value = 220 + currentIndex * 30;
  oscillator.connect(gainNode);
  gainNode.gain.setTargetAtTime((volume / 100) * 0.08, ctx.currentTime, 0.1);
  oscillator.start();
}

/** Fade the tone out and stop the oscillator. */
function stopTone() {
  if (gainNode && audioCtx) {
    gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
  }
  setTimeout(() => {
    if (oscillator) {
      try {
        oscillator.stop();
      } catch (e) {}
      oscillator = null;
    }
  }, 200);
}

// ── Utilities ──────────────────────────────────────────────────────────────

/** Convert raw seconds to "m:ss" string. */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Track Loading ──────────────────────────────────────────────────────────

/**
 * Load a track into the UI without changing play state.
 * @param {number} index - Index into the tracks array.
 */
function loadTrack(index) {
  currentIndex = index;
  elapsed = 0;

  const t = tracks[index];

  // Update song info
  document.getElementById("songTitle").textContent = t.title;
  document.getElementById("songArtist").textContent = t.artist;
  document.getElementById("songAlbum").textContent = t.album;
  document.getElementById("songGenre").textContent = t.genre;
  document.getElementById("artEmoji").textContent = t.emoji;

  // Reset time display
  document.getElementById("totalTime").textContent = formatTime(t.duration);
  document.getElementById("currentTime").textContent = "0:00";
  document.getElementById("progressFill").style.width = "0%";

  // Theme the whole UI with this track's accent colour
  document.documentElement.style.setProperty("--accent", t.color);

  renderPlaylist();
}

// ── Progress ───────────────────────────────────────────────────────────────

/** Refresh the progress bar and current-time display. */
function updateProgress() {
  const total = tracks[currentIndex].duration;
  const pct = (elapsed / total) * 100;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("currentTime").textContent = formatTime(elapsed);
}

/** Handle a click on the progress bar to seek to that position. */
function seekTo(event) {
  const bar = document.getElementById("progressBar");
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(
    0,
    Math.min(1, (event.clientX - rect.left) / rect.width),
  );
  elapsed = Math.floor(pct * tracks[currentIndex].duration);
  updateProgress();
  if (isPlaying) {
    clearInterval(timer);
    startTimer();
  }
}

// ── Timer ──────────────────────────────────────────────────────────────────

/** Start the 1-second tick that advances the simulated playhead. */
function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    elapsed++;

    const total = tracks[currentIndex].duration;

    if (elapsed >= total) {
      // Track finished
      elapsed = total;
      updateProgress();
      clearInterval(timer);

      if (isRepeat) {
        // Loop current track
        elapsed = 0;
        startTimer();
      } else if (isAutoplay || isShuffled) {
        nextTrack();
      } else {
        // Stop playback
        isPlaying = false;
        updatePlayBtn();
        stopTone();
        renderPlaylist();
      }
      return;
    }

    updateProgress();
  }, 1000);
}

// ── Playback Controls ──────────────────────────────────────────────────────

/** Toggle between play and pause. */
function togglePlay() {
  isPlaying = !isPlaying;
  updatePlayBtn();

  if (isPlaying) {
    playTone();
    startTimer();
  } else {
    stopTone();
    clearInterval(timer);
  }

  renderPlaylist();
}

/** Sync the play button icon and album-art spin animation. */
function updatePlayBtn() {
  document.getElementById("playBtn").textContent = isPlaying ? "⏸" : "▶";

  const artInner = document.getElementById("artEmoji");
  if (isPlaying) {
    artInner.classList.add("spin");
  } else {
    artInner.classList.remove("spin");
  }
}

/** Skip to the next track (or a random one if shuffle is on). */
function nextTrack() {
  clearInterval(timer);

  let next;
  if (isShuffled) {
    // Pick a random index that is not the current one
    do {
      next = Math.floor(Math.random() * tracks.length);
    } while (next === currentIndex && tracks.length > 1);
  } else {
    next = (currentIndex + 1) % tracks.length;
  }

  loadTrack(next);

  if (isPlaying) {
    playTone();
    startTimer();
  }
}

/**
 * Go to the previous track.
 * If more than 3 seconds have elapsed, restart the current track instead.
 */
function prevTrack() {
  clearInterval(timer);

  if (elapsed > 3) {
    elapsed = 0;
    updateProgress();
    if (isPlaying) startTimer();
    return;
  }

  const prev = (currentIndex - 1 + tracks.length) % tracks.length;
  loadTrack(prev);

  if (isPlaying) {
    playTone();
    startTimer();
  }
}

// ── Volume ─────────────────────────────────────────────────────────────────

/**
 * Set the player volume.
 * @param {number|string} val - Value between 0 and 100.
 */
function setVolume(val) {
  volume = parseInt(val, 10);

  // Update percentage label
  document.getElementById("volPct").textContent = volume + "%";

  // Update icon based on level
  let icon = "🔊";
  if (volume === 0) icon = "🔇";
  else if (volume < 40) icon = "🔉";
  document.getElementById("volIcon").textContent = icon;

  // Apply to Web Audio gain
  if (gainNode && audioCtx) {
    gainNode.gain.setTargetAtTime(
      (volume / 100) * 0.08,
      audioCtx.currentTime,
      0.05,
    );
  }
}

// ── Toggles ────────────────────────────────────────────────────────────────

/** Toggle shuffle mode on/off. */
function toggleShuffle() {
  isShuffled = !isShuffled;
  document.getElementById("shuffleBtn").classList.toggle("active", isShuffled);
}

/** Toggle repeat (loop current track) on/off. */
function toggleRepeat() {
  isRepeat = !isRepeat;
  document.getElementById("repeatBtn").classList.toggle("active", isRepeat);
}

/** Toggle autoplay (auto-advance to next track) on/off. */
function toggleAutoplay() {
  isAutoplay = !isAutoplay;
  document.getElementById("autoplaySwitch").classList.toggle("on", isAutoplay);
}

// ── Playlist Rendering ─────────────────────────────────────────────────────

/** Build and insert the playlist track items into the DOM. */
function renderPlaylist() {
  const container = document.getElementById("playlist");
  container.innerHTML = "";

  tracks.forEach((t, i) => {
    const div = document.createElement("div");

    // Build class list
    let cls = "track-item";
    if (i === currentIndex) cls += " active";
    if (i === currentIndex && !isPlaying) cls += " paused";
    div.className = cls;

    // Click to load & play
    div.addEventListener("click", () => {
      if (i === currentIndex) {
        // Toggle play/pause on the same track
        togglePlay();
      } else {
        clearInterval(timer);
        loadTrack(i);
        if (!isPlaying) {
          isPlaying = true;
          updatePlayBtn();
        }
        playTone();
        startTimer();
        renderPlaylist();
      }
    });

    div.innerHTML = `
      <div class="track-num">
        <span class="track-num-text">${i + 1}</span>
        <div class="playing-bars">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>
      </div>
      <div class="track-emoji">${t.emoji}</div>
      <div class="track-info">
        <div class="track-name">${t.title}</div>
        <div class="track-artist-name">${t.artist}</div>
      </div>
      <div class="track-dur">${formatTime(t.duration)}</div>
    `;

    container.appendChild(div);
  });
}

// ── Initialise ─────────────────────────────────────────────────────────────
loadTrack(0);
