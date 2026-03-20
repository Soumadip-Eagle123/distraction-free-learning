import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;

// Generate a pleasant bell/chime sound using Web Audio API
function playChime(type = "focus") {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const notes = type === "focus"
    ? [523.25, 659.25, 783.99, 1046.50] // C5 E5 G5 C6 — bright, done!
    : [1046.50, 783.99, 659.25, 523.25]; // reverse — gentle, break over

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

export default function Pomodoro() {
  const [focusMin, setFocusMin] = useState(DEFAULT_FOCUS);
  const [breakMin, setBreakMin] = useState(DEFAULT_BREAK);
  const [mode, setMode] = useState("focus"); // "focus" | "break"
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS * 60);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [flash, setFlash] = useState(false);

  const intervalRef = useRef(null);
  const totalSeconds = mode === "focus" ? focusMin * 60 : breakMin * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const circumference = 2 * Math.PI * 54; // radius=54

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
            if (mode === "focus") {
              playChime("focus");
              setSessions(n => n + 1);
              switchMode("break");
            } else {
              playChime("break");
              switchMode("focus");
            }
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

  const toggle = () => setRunning(r => !r);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(mode === "focus" ? focusMin * 60 : breakMin * 60);
  };

  const applySettings = (newFocus, newBreak) => {
    setFocusMin(newFocus);
    setBreakMin(newBreak);
    setRunning(false);
    setMode("focus");
    setSecondsLeft(newFocus * 60);
    setEditing(false);
  };

  const dashOffset = circumference * (1 - progress);
  const isLow = secondsLeft <= 60 && running;

  return (
    <div className={`pomo-panel ${flash ? "pomo-flash" : ""}`}>
      {/* Mode tabs */}
      <div className="pomo-tabs">
        <button
          className={`pomo-tab ${mode === "focus" ? "active-focus" : ""}`}
          onClick={() => !running && switchMode("focus")}
        >
          Focus
        </button>
        <button
          className={`pomo-tab ${mode === "break" ? "active-break" : ""}`}
          onClick={() => !running && switchMode("break")}
        >
          Break
        </button>
      </div>

      {/* Ring timer */}
      <div className="pomo-ring-wrap">
        <svg className="pomo-svg" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="5"
          />
          {/* Progress */}
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={mode === "focus"
              ? (isLow ? "#f87171" : "#6366f1")
              : "#22d3a5"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
              transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease"
            }}
          />
        </svg>

        <div className="pomo-time-wrap">
          <span className={`pomo-time ${isLow ? "pomo-time-low" : ""}`}>
            {formatTime(secondsLeft)}
          </span>
          <span className="pomo-mode-label">
            {mode === "focus" ? "Focus" : "Break"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="pomo-controls">
        <button className="pomo-ctrl-btn pomo-reset" onClick={reset} title="Reset">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 6.5A4.5 4.5 0 1 1 6.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 3.5V6.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button className="pomo-play-btn" onClick={toggle}>
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

        <button className="pomo-ctrl-btn pomo-settings" onClick={() => { setRunning(false); setEditing(e => !e); }} title="Settings">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M6.5 1v1.5M6.5 10.5V12M1 6.5h1.5M10.5 6.5H12M2.93 2.93l1.06 1.06M9.01 9.01l1.06 1.06M2.93 10.07l1.06-1.06M9.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Sessions count */}
      <div className="pomo-sessions">
        {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
          <div key={i} className="pomo-session-dot" />
        ))}
        {sessions === 0 && <span className="pomo-sessions-empty">No sessions yet</span>}
      </div>

      {/* Settings panel */}
      {editing && (
        <SettingsPanel
          focusMin={focusMin}
          breakMin={breakMin}
          onApply={applySettings}
          onClose={() => setEditing(false)}
        />
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