import { useEffect, useState } from "react";
import { getCourses, getProgress, updateProgress } from "./api";
import Sidebar from "./components/Sidebar";
import Player from "./components/Player";
import AuthPage from "./components/AuthPage";
import Pomodoro from "./components/Pomodoro";

function App() {
  const [courses, setCourses] = useState([]);
  const [current, setCurrent] = useState(null);
  const [progress, setProgress] = useState({ done: 0, revised: 0 });
  const [progressMap, setProgressMap] = useState({});
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("email"));

  const isAuthed = !!localStorage.getItem("token");

  useEffect(() => {
    if (!isAuthed) return;
    getCourses()
      .then(async (res) => {
        const loadedCourses = res.data;
        setCourses(loadedCourses);
        setCurrent(loadedCourses[0]?.videos[0]);

        const map = {};
        for (const course of loadedCourses) {
          for (const video of course.videos) {
            const r = await getProgress(video.id);
            map[video.id] = r.data;
          }
        }
        setProgressMap(map);
      })
      .catch(() => handleLogout());
  }, [userEmail]);

  useEffect(() => {
    if (!current) return;
    setProgress({ done: 0, revised: 0 });

    if (progressMap[current.id] !== undefined) {
      setProgress(progressMap[current.id]);
    } else {
      getProgress(current.id).then(res => {
        setProgress(res.data);
        setProgressMap(prev => ({ ...prev, [current.id]: res.data }));
      });
    }
  }, [current?.id]);

  const toggle = (field) => {
    const updated = { ...progress, [field]: progress[field] ? 0 : 1 };
    setProgress(updated);
    setProgressMap(prev => ({ ...prev, [current.id]: updated }));
    updateProgress({ videoId: current.id, done: updated.done, revised: updated.revised });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setUserEmail(null);
    setCourses([]);
    setCurrent(null);
    setProgressMap({});
  };

  const handleAuth = (email) => setUserEmail(email);

  if (!isAuthed || !userEmail) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        courses={courses}
        setCurrent={setCurrent}
        current={current}
        progressMap={progressMap}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      <div className="main-area">
        <Player current={current} progress={progress} toggle={toggle} />
        <Pomodoro />
      </div>
    </div>
  );
}

export default App;
