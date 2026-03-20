import { useEffect, useState } from "react";
import { getCourses, getProgress, updateProgress } from "./api";
import Sidebar from "./components/Sidebar";
import Player from "./components/Player";

function App() {
  const [courses, setCourses] = useState([]);
  const [current, setCurrent] = useState(null);
  const [progress, setProgress] = useState({ done: 0, revised: 0 });

  useEffect(() => {
    getCourses().then(res => {
      setCourses(res.data);
      setCurrent(res.data[0]?.videos[0]);
    });
  }, []);

  useEffect(() => {
    if (current) {
      getProgress(current.id).then(res => {
        setProgress(res.data);
      });
    }
  }, [current]);

  const toggle = (field) => {
    const updated = { ...progress, [field]: progress[field] ? 0 : 1 };
    setProgress(updated);
    updateProgress({ videoId: current.id, ...updated });
  };

  return (
    <div className="app-shell">
      <Sidebar courses={courses} setCurrent={setCurrent} current={current} />
      <Player current={current} progress={progress} toggle={toggle} />
    </div>
  );
}

export default App;
