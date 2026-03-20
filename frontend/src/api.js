import axios from "axios";

const API = "http://localhost:5000";

export const getCourses = () => axios.get(`${API}/courses`);
export const getProgress = (id) => axios.get(`${API}/progress/${id}`);
export const updateProgress = (data) =>
  axios.post(`${API}/progress`, data);