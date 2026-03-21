import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;

function playChime(type = "focus") {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const notes = type === "focus"
    ? [523.25, 659.25, 783.99, 1046.50]
    : [1046.50, 783.99, 659.25, 523.25];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
    osc.start(ctx.currentTime + i * 0.18);
    osc.stop(ctx.currentTime + i * 0.18 + 0.5);
  });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Load YouTube IFrame API once
function loadYTAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (window._ytAPIPromise) return window._ytAPIPromise;
  
  window._ytAPIPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  
  return window._ytAPIPromise;
}

export default function Pomodoro() {
  const [focusMin, setFocusMin] = useState(DEFAULT_FOCUS);
  const [breakMin, setBreakMin] = useState(DEFAULT_BREAK);
  const [mode, setMode] = useState("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS * 60);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [flash, setFlash] = useState(false);

  // White noise
  const [noiseUrl, setNoiseUrl] = useState("");
  const [noiseInput, setNoiseInput] = useState("");
  const [noiseOpen, setNoiseOpen] = useState(false);
  const [noisePlaying, setNoisePlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const noiseVideoId = extractYouTubeId(noiseUrl);

  const intervalRef = useRef(null);
  const totalSeconds = mode === "focus" ? focusMin * 60 : breakMin * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const circumference = 2 * Math.PI * 54;

  const switchMode = useCallback((newMode) => {
    setRunning(false);
    setMode(newMode);
    setSecondsLeft((newMode === "focus" ? focusMin : breakMin) * 60);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  }, [focusMin, breakMin]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === "focus") { playChime("focus"); setSessions(n => n + 1); switchMode("break"); }
            else { playChime("break"); switchMode("focus"); }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, switchMode]);

  // Init YT player when video ID is set
  useEffect(() => {
    if (!noiseVideoId) return;

    loadYTAPI().then(() => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: noiseVideoId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: noiseVideoId,
          controls: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volume);
            e.target.playVideo();
            setNoisePlaying(true);
          },
        },
      });
    });

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [noiseVideoId]);

  // Sync volume changes to player
  useEffect(() => {
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  // Sync play/pause to player
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (noisePlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch {}
  }, [noisePlaying]);

  const applySettings = (newFocus, newBreak) => {
    setFocusMin(newFocus);
    setBreakMin(newBreak);
    setRunning(false);
    setMode("focus");
    setSecondsLeft(newFocus * 60);
    setEditing(false);
  };

  const applyNoise = () => {
    const id = extractYouTubeId(noiseInput);
    if (!id) return;
    setNoiseUrl(noiseInput);
    setNoiseOpen(false);
  };

  const clearNoise = () => {
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
    setNoiseUrl("");
    setNoiseInput("");
    setNoisePlaying(false);
  };

  const dashOffset = circumference * (1 - progress);
  const isLow = secondsLeft <= 60 && running;

  return (
    <div className={`pomo-panel ${flash ? "pomo-flash" : ""}`}>

      {/* Mode tabs */}
      <div className="pomo-tabs">
        <button className={`pomo-tab ${mode === "focus" ? "active-focus" : ""}`} onClick={() => !running && switchMode("focus")}>Focus</button>
        <button className={`pomo-tab ${mode === "break" ? "active-break" : ""}`} onClick={() => !running && switchMode("break")}>Break</button>
      </div>

      {/* Ring */}
      <div className="pomo-ring-wrap">
        <svg className="pomo-svg" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={mode === "focus" ? (isLow ? "#f87171" : "#6366f1") : "#22d3a5"}
            strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease" }}
          />
        </svg>
        <div className="pomo-time-wrap">
          <span className={`pomo-time ${isLow ? "pomo-time-low" : ""}`}>{formatTime(secondsLeft)}</span>
          <span className="pomo-mode-label">{mode === "focus" ? "Focus" : "Break"}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="pomo-controls">
        <button className="pomo-ctrl-btn" onClick={() => { setRunning(false); setSecondsLeft(mode === "focus" ? focusMin * 60 : breakMin * 60); }} title="Reset">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 6.5A4.5 4.5 0 1 1 6.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 3.5V6.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="pomo-play-btn" onClick={() => setRunning(r => !r)}>
          {running ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/>
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2.5L13 8L4 13.5V2.5Z" fill="currentColor"/>
            </svg>
          )}
        </button>
        <button className="pomo-ctrl-btn" onClick={() => { setRunning(false); setEditing(e => !e); setNoiseOpen(false); }} title="Settings">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M6.5 1v1.5M6.5 10.5V12M1 6.5h1.5M10.5 6.5H12M2.93 2.93l1.06 1.06M9.01 9.01l1.06 1.06M2.93 10.07l1.06-1.06M9.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Sessions */}
      <div className="pomo-sessions">
        {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
          <div key={i} className="pomo-session-dot" />
        ))}
        {sessions === 0 && <span className="pomo-sessions-empty">No sessions yet</span>}
      </div>

      <div className="pomo-divider" />

      {/* White Noise */}
      <div className="pomo-noise-section">
        <div className="pomo-noise-header">
          <div className="pomo-noise-title">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 4.5h2l2-3 2 7 2-5 1 1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>White Noise</span>
          </div>
          <div className="pomo-noise-actions">
            {noiseVideoId && (
              <button
                className={`pomo-noise-toggle ${noisePlaying ? "playing" : ""}`}
                onClick={() => setNoisePlaying(p => !p)}
                title={noisePlaying ? "Pause" : "Play"}
              >
                {noisePlaying ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <rect x="1.5" y="1" width="2.5" height="8" rx="0.8" fill="currentColor"/>
                    <rect x="6" y="1" width="2.5" height="8" rx="0.8" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2.5 1.5L8.5 5L2.5 8.5V1.5Z" fill="currentColor"/>
                  </svg>
                )}
              </button>
            )}
            {noiseVideoId && (
              <button className="pomo-noise-clear" onClick={clearNoise} title="Remove">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            <button className="pomo-noise-add" onClick={() => { setNoiseOpen(o => !o); setEditing(false); }} title="Add YouTube URL">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Status */}
        {noiseVideoId && (
          <div className={`pomo-noise-status ${noisePlaying ? "status-playing" : "status-paused"}`}>
            <div className={`pomo-noise-dot ${noisePlaying ? "dot-playing" : ""}`} />
            <span>{noisePlaying ? "Playing" : "Paused"}</span>
          </div>
        )}

        {/* Volume slider */}
        {noiseVideoId && (
          <div className="pomo-volume-row">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 4h2l3-3v10L3 8H1V4z" fill="currentColor" opacity="0.6"/>
              {volume > 0 && <path d="M8 3.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6"/>}
              {volume > 50 && <path d="M9.5 2a5.5 5.5 0 0 1 0 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4"/>}
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="pomo-volume-slider"
            />
            <span className="pomo-volume-val">{volume}</span>
          </div>
        )}

        {!noiseVideoId && !noiseOpen && (
          <p className="pomo-noise-empty">Paste a YouTube URL to play white noise while you study</p>
        )}

        {/* URL input */}
        {noiseOpen && (
          <div className="pomo-noise-input-wrap">
            <input
              className="pomo-noise-input"
              type="text"
              placeholder="youtube.com/watch?v=..."
              value={noiseInput}
              onChange={e => setNoiseInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyNoise()}
              autoFocus
            />
            <div className="pomo-noise-btns">
              <button className="pomo-settings-cancel" onClick={() => setNoiseOpen(false)}>Cancel</button>
              <button className="pomo-settings-apply" onClick={applyNoise}>Play</button>
            </div>
          </div>
        )}

        {/* YT Player container — hidden visually */}
        <div
          ref={containerRef}
          style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, pointerEvents: "none", top: 0, left: 0 }}
        />
      </div>

      {editing && (
        <SettingsPanel focusMin={focusMin} breakMin={breakMin} onApply={applySettings} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function SettingsPanel({ focusMin, breakMin, onApply, onClose }) {
  const [f, setF] = useState(focusMin);
  const [b, setB] = useState(breakMin);
  return (
    <div className="pomo-settings-panel">
      <div className="pomo-settings-row">
        <label className="pomo-settings-label">Focus</label>
        <div className="pomo-stepper">
          <button onClick={() => setF(v => Math.max(1, v - 1))}>−</button>
          <span>{f}m</span>
          <button onClick={() => setF(v => Math.min(90, v + 1))}>+</button>
        </div>
      </div>
      <div className="pomo-settings-row">
        <label className="pomo-settings-label">Break</label>
        <div className="pomo-stepper">
          <button onClick={() => setB(v => Math.max(1, v - 1))}>−</button>
          <span>{b}m</span>
          <button onClick={() => setB(v => Math.min(30, v + 1))}>+</button>
        </div>
      </div>
      <div className="pomo-settings-actions">
        <button className="pomo-settings-cancel" onClick={onClose}>Cancel</button>
        <button className="pomo-settings-apply" onClick={() => onApply(f, b)}>Apply</button>
      </div>
    </div>
  );
}