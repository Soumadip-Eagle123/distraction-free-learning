import { useEffect, useRef, useState } from "react";
import { saveWatchPosition } from "../api";

// Load YouTube IFrame API once globally
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

function formatWatched(seconds) {
  if (!seconds || seconds < 5) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function Player({ current, progress, toggle }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const currentIdRef = useRef(null);
  const [resumed, setResumed] = useState(false);

  const watchedAt = progress?.watched_seconds || 0;

  // Build/rebuild YT player whenever video changes
  useEffect(() => {
    if (!current) return;
    setResumed(false);
    currentIdRef.current = current.id;

    loadYTAPI().then(() => {
      // Destroy old player
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      clearInterval(pollRef.current);

      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: current.id,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          color: "white",
          start: Math.floor(progress?.watched_seconds || 0),
        },
        events: {
          onReady: (e) => {
            const savedAt = progress?.watched_seconds || 0;
            if (savedAt > 5) {
              e.target.seekTo(savedAt, true);
              setResumed(true);
              setTimeout(() => setResumed(false), 3000);
            }
            // Poll every 5s to save position
            pollRef.current = setInterval(() => {
              try {
                const state = e.target.getPlayerState();
                // 1 = playing
                if (state === 1) {
                  const t = Math.floor(e.target.getCurrentTime());
                  if (t > 0 && currentIdRef.current) {
                    saveWatchPosition(currentIdRef.current, t);
                  }
                }
              } catch {}
            }, 30000);
          },
          onStateChange: (e) => {
            // Save on pause (2) or ended (0)
            if (e.data === 2 || e.data === 0) {
              try {
                const t = Math.floor(e.target.getCurrentTime());
                if (t > 0 && currentIdRef.current) {
                  saveWatchPosition(currentIdRef.current, t);
                }
              } catch {}
            }
          },
        },
      });
    });

    return () => {
      clearInterval(pollRef.current);
    };
  }, [current?.id]);

  // Save position when component unmounts (tab close / navigate away)
  useEffect(() => {
    const handleUnload = () => {
      try {
        if (playerRef.current && currentIdRef.current) {
          const t = Math.floor(playerRef.current.getCurrentTime());
          if (t > 0) saveWatchPosition(currentIdRef.current, t);
        }
      } catch {}
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  if (!current) return (
    <div className="player-empty">
      <div className="empty-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="#2a2a3e" strokeWidth="2"/>
          <path d="M19 16L33 24L19 32V16Z" fill="#2a2a3e"/>
        </svg>
      </div>
      <p className="empty-text">Select a video to begin</p>
    </div>
  );

  return (
    <div className="player-area">
      <div className="player-wrapper">

        {/* Resume toast */}
        {resumed && (
          <div className="resume-toast">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 6.5A4.5 4.5 0 1 0 6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 4.5L6.5 2 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Resumed from {formatWatched(watchedAt)}
          </div>
        )}

        {/* Video Frame */}
        <div className="video-frame">
          <div className="frame-glow" />
          {/* YT player mounts here */}
          <div ref={containerRef} style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden" }} />
        </div>

        {/* Controls Bar */}
        <div className="controls-bar">
          <div className="controls-left">
            <div className="now-playing-dot" />
            <span className="now-playing-text">Now Playing</span>
            {watchedAt > 5 && (
              <span className="watch-position">· {formatWatched(watchedAt)} saved</span>
            )}
          </div>
          <div className="controls-right">
            <button
              className={`ctrl-btn ${progress.done ? 'active' : ''}`}
              onClick={() => toggle("done")}
            >
              <div className={`ctrl-checkbox ${progress.done ? 'checked' : ''}`}>
                {progress.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span>Mark as Done</span>
            </button>

            <button
              className={`ctrl-btn ${progress.revised ? 'active-revised' : ''}`}
              onClick={() => toggle("revised")}
            >
              <div className={`ctrl-checkbox revised ${progress.revised ? 'checked-revised' : ''}`}>
                {progress.revised && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 2V8M2 5H8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <span>Revised</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;