function Player({ current, progress, toggle }) {
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
        <div className="video-frame">
          <div className="frame-glow" />
          <iframe
            key={current.id}
            width="100%"
            height="100%"
            src={`https://www.youtube-nocookie.com/embed/${current.id}?rel=0&modestbranding=1&color=white`}
            allowFullScreen
            style={{ border: "none", borderRadius: "12px", display: "block" }}
          />
        </div>

        <div className="controls-bar">
          <div className="controls-left">
            <div className="now-playing-dot" />
            <span className="now-playing-text">Now Playing</span>
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