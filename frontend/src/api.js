import axios from "axios";

const API = "https://distraction-free-learning-production.up.railway.app";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` }
});

export const register = (email, password) =>
  axios.post(`${API}/auth/register`, { email, password });

export const login = (email, password) =>
  axios.post(`${API}/auth/login`, { email, password });

export const getCourses = () =>
  axios.get(`${API}/courses`, authHeaders());

export const getProgress = (id) =>
  axios.get(`${API}/progress/${id}`, authHeaders());

export const updateProgress = (data) =>
  axios.post(`${API}/progress`, data, authHeaders());