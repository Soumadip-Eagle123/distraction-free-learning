import { useEffect, useState } from "react";
import { getProgress } from "../api";

function Sidebar({ courses, setCurrent, current }) {
  const [progressMap, setProgressMap] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const fetchProgress = async () => {
      let map = {};
      for (let course of courses) {
        for (let video of course.videos) {
          const res = await getProgress(video.id);
          map[video.id] = res.data;
        }
      }
      setProgressMap(map);
    };
    if (courses.length) {
      fetchProgress();
      const initial = {};
      courses.forEach((c, i) => { initial[i] = i === 0; });
      setExpanded(initial);
    }
  }, [courses]);

  const toggleExpand = (i) => {
    setExpanded(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const getCourseStats = (course) => {
    const total = course.videos.length;
    const done = course.videos.filter(v => progressMap[v.id]?.done).length;
    const revised = course.videos.filter(v => progressMap[v.id]?.revised).length;
    return { total, done, revised, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  const totalVideos = courses.reduce((acc, c) => acc + c.videos.length, 0);
  const totalDone = Object.values(progressMap).filter(p => p?.done).length;
  const overallPct = totalVideos ? Math.round((totalDone / totalVideos) * 100) : 0;

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo-mark">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#6366f1"/>
            <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#6366f1" opacity="0.5"/>
            <rect x="2" y="11" width="7" height="7" rx="1.5" fill="#6366f1" opacity="0.5"/>
            <rect x="11" y="11" width="7" height="7" rx="1.5" fill="#6366f1" opacity="0.3"/>
          </svg>
        </div>
        <span className="logo-text">LearnPath</span>
      </div>

      {/* Overall Progress */}
      <div className="overall-progress">
        <div className="overall-row">
          <span className="overall-label">Overall Progress</span>
          <span className="overall-pct">{overallPct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="overall-stats">
          <span>{totalDone} of {totalVideos} completed</span>
        </div>
      </div>

      {/* Course List */}
      <div className="course-list">
        {courses.map((course, i) => {
          const stats = getCourseStats(course);
          const isOpen = expanded[i];

          return (
            <div key={i} className="course-section">
              <div className="course-header" onClick={() => toggleExpand(i)}>
                <div className="course-header-left">
                  <div className={`chevron ${isOpen ? 'open' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="course-name">{course.name}</span>
                </div>
                <div className="course-badge">
                  <span className="badge-text">{stats.done}/{stats.total}</span>
                </div>
              </div>

              {/* Course mini progress bar */}
              <div className="course-mini-track">
                <div className="course-mini-fill" style={{ width: `${stats.pct}%` }} />
              </div>

              {/* Video List */}
              {isOpen && (
                <div className="video-list">
                  {course.videos.map((video, idx) => {
                    const isActive = current?.id === video.id;
                    const p = progressMap[video.id];
                    const isDone = p?.done;
                    const isRevised = p?.revised;

                    return (
                      <div
                        key={video.id}
                        onClick={() => setCurrent(video)}
                        className={`video-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                      >
                        <div className="video-status">
                          {isDone ? (
                            <div className="status-dot done-dot">
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          ) : isActive ? (
                            <div className="status-dot active-dot">
                              <div className="pulse-ring" />
                            </div>
                          ) : (
                            <div className="status-dot empty-dot" />
                          )}
                        </div>
                        <span className="video-label">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {isRevised && (
                          <span className="revised-tag">R</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Sidebar;