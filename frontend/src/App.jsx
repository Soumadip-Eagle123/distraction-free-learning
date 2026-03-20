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
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("email"));

  const isAuthed = !!localStorage.getItem("token");

  useEffect(() => {
    if (!isAuthed) return;
    getCourses()
      .then(res => {
        setCourses(res.data);
        setCurrent(res.data[0]?.videos[0]);
      })
      .catch(() => handleLogout());
  }, [userEmail]);

  useEffect(() => {
    if (current) {
      getProgress(current.id).then(res => setProgress(res.data));
    }
  }, [current]);

  const toggle = (field) => {
    const updated = { ...progress, [field]: progress[field] ? 0 : 1 };
    setProgress(updated);
    updateProgress({ videoId: current.id, ...updated });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setUserEmail(null);
    setCourses([]);
    setCurrent(null);
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
