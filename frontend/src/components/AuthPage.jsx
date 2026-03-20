import { useState } from "react";
import { login, register } from "../api";

function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) return setError("Please fill in all fields");
    setLoading(true);
    try {
      const fn = mode === "login" ? login : register;
      const res = await fn(email, password);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("email", res.data.email);
      onAuth(res.data.email);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="auth-shell">
      {/* Background grid */}
      <div className="auth-grid" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#6366f1"/>
              <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#6366f1" opacity="0.5"/>
              <rect x="2" y="11" width="7" height="7" rx="1.5" fill="#6366f1" opacity="0.5"/>
              <rect x="11" y="11" width="7" height="7" rx="1.5" fill="#6366f1" opacity="0.3"/>
            </svg>
          </div>
          <span className="auth-logo-text">LearnPath</span>
        </div>

        <h1 className="auth-title">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Sign in to continue your learning journey"
            : "Start tracking your progress today"}
        </p>

        {/* Form */}
        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            className="auth-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              mode === "login" ? "Sign in" : "Create account"
            )}
          </button>
        </div>

        {/* Toggle */}
        <p className="auth-toggle">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          <button
            className="auth-toggle-btn"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;