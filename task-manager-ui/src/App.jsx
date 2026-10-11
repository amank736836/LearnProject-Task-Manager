import { useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Dashboard } from "./Dashboard";
import { TaskManagement } from "./TaskManagement";
import { AuthForm } from "./AuthForm";
import {
  API_BASE_URL as BASE_URL,
  createDemoSession,
  resetLocalDemoDB,
} from "./api";
import {
  AnimatedLogo,
  ThemeMorphIcon,
} from "./components/AnimatedIcons";

export const API_BASE_URL = BASE_URL;

const App = () => {
  const historySeeded = useRef(false);
  // Set while a popstate-driven view change is being applied, so the sync
  // effect below does not push a duplicate entry and destroy Forward history.
  const popStateDriven = useRef(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pulsetask_user") || "null");
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [view, setView] = useState("login");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Dual Theme State: 'dark' (Cosmic Glassmorphic & Aurora) | 'light' (Tactile Claymorphic)
  const [theme, setTheme] = useState(
    () => localStorage.getItem("pulsetask_theme") || "dark"
  );
  // Motion FX Studio Controls
  const [enableTilt, setEnableTilt] = useState(true);
  const [pauseAmbient, setPauseAmbient] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme =
      theme === "light" ? "light" : "dark";
    localStorage.setItem("pulsetask_theme", theme);
  }, [theme]);

  // Keep the browser history entry in sync with the active view so the
  // Back / Forward buttons move between Login, My Tasks and Dashboard
  // instead of dropping the user out of the app.
  useEffect(() => {
    if (popStateDriven.current) {
      popStateDriven.current = false;
      return;
    }
    const state = { pulsetaskView: view };
    if (!historySeeded.current) {
      historySeeded.current = true;
      window.history.replaceState(state, "");
      return;
    }
    window.history.pushState(state, "");
  }, [view]);

  useEffect(() => {
    const handlePopState = (event) => {
      const next = event.state?.pulsetaskView;
      if (!next) return;
      const authed = Boolean(localStorage.getItem("token"));
      const target =
        authed && (next === "login" || next === "register") ? "tasks" : next;
      popStateDriven.current = true;
      setView(target);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      if (!user) {
        try {
          const cached = JSON.parse(
            localStorage.getItem("pulsetask_user") || "null"
          );
          if (cached) setUser(cached);
          else {
            const fallback = createDemoSession("manager");
            setUser(fallback.user);
          }
        } catch {
          // ignore
        }
      }
      setView((prev) =>
        prev === "login" || prev === "register" ? "tasks" : prev
      );
    }
  }, [token]);

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4500);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("pulsetask_user");
    setToken("");
    setIsLoggedIn(false);
    setUser(null);
    setView("login");
    showMessage("Logged out of workspace successfully!", "success");
  };

  const handleSwitchDemoRole = () => {
    const nextRole = user?.role === "manager" ? "user" : "manager";
    const session = createDemoSession(nextRole);
    setUser(session.user);
    setToken(session.token);
    localStorage.setItem("token", session.token);
    localStorage.setItem("pulsetask_user", JSON.stringify(session.user));
    showMessage(
      `Switched active role to ${nextRole.toUpperCase()} (@${session.user.username})`,
      "success"
    );
  };

  const handleResetDemo = () => {
    resetLocalDemoDB();
    const session = createDemoSession(user?.role || "manager");
    setUser(session.user);
    setToken(session.token);
    localStorage.setItem("token", session.token);
    localStorage.setItem("pulsetask_user", JSON.stringify(session.user));
    showMessage("Demo workspace restored with 9 sample tasks!", "info");
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div
      className={pauseAmbient ? "motion-paused" : ""}
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px 56px",
      }}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {/* Ambient Background Motion & Aurora Liquid Canvas (SVGator #6, #17, #20) */}
      <div className="ambient-canvas" aria-hidden="true">
        <div className="ambient-grid" />
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* Main Workspace Shell */}
      <div
        className="surface-shell"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "1140px",
          padding: "clamp(20px, 3.5vw, 36px)",
        }}
      >
        {/* Top Brand & Motion FX Header */}
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            paddingBottom: "22px",
            marginBottom: "26px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {/* Left Brand Mark + Kinetic Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <AnimatedLogo size={44} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1
                  className="font-display"
                  style={{
                    fontSize: "clamp(1.45rem, 2.5vw, 1.9rem)",
                    fontWeight: 800,
                    margin: 0,
                    color: "var(--text-primary)",
                  }}
                >
                  Task <span className="kinetic-gradient-text">Manager</span>
                </h1>
                <span
                  className="font-mono-code"
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: "9999px",
                    background: "rgba(99, 102, 241, 0.16)",
                    color: "var(--accent-on-tint)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  MOTION UI
                </span>
              </div>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                }}
              >
                {theme === "dark"
                  ? "Dark Cosmic Glassmorphic & Aurora Theme"
                  : "Light Tactile Claymorphic & Soft Neumorphic Theme"}
              </p>
            </div>
          </div>

          {/* Right Controls: Motion FX Toggles & Dual Theme Morph Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* 3D Tilt Toggle */}
            <button
              type="button"
              onClick={() => setEnableTilt((prev) => !prev)}
              className="btn-secondary-animated"
              aria-pressed={enableTilt}
              title="Toggle 3D Perspective Card Tilt"
              style={{
                padding: "8px 12px",
                fontSize: "0.76rem",
                borderColor: enableTilt ? "var(--border-highlight)" : undefined,
              }}
            >
              <span>{enableTilt ? "◈ 3D Tilt: ON" : "◇ 3D Tilt: OFF"}</span>
            </button>

            {/* Ambient Motion Play/Pause */}
            <button
              type="button"
              onClick={() => setPauseAmbient((prev) => !prev)}
              className="btn-secondary-animated"
              aria-pressed={pauseAmbient}
              title="Pause or Resume Ambient Background Motion"
              style={{
                padding: "8px 12px",
                fontSize: "0.76rem",
              }}
            >
              <span>{pauseAmbient ? "▶ Resume FX" : "⏸ Ambient FX"}</span>
            </button>

            {/* Dual Theme Switcher (Dark Glass <-> Light Clay) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-secondary-animated"
              aria-label={
                theme === "dark"
                  ? "Switch theme to Light Clay"
                  : "Switch theme to Dark Glass"
              }
              style={{
                padding: "8px 14px",
                fontSize: "0.78rem",
                fontWeight: 700,
              }}
            >
              <ThemeMorphIcon theme={theme} />
              <span>{theme === "dark" ? "Light Clay" : "Dark Glass"}</span>
            </button>
          </div>
        </header>

        {/* Animated Toast Notification Banner */}
        {message && (
          <div
            role="alert"
            className="page-transition-enter"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "13px 18px",
              borderRadius: "14px",
              marginBottom: "22px",
              background:
                messageType === "error"
                  ? "var(--feedback-error-bg)"
                  : messageType === "success"
                  ? "var(--feedback-success-bg)"
                  : "var(--feedback-info-bg)",
              border:
                messageType === "error"
                  ? "1px solid var(--feedback-error-border)"
                  : messageType === "success"
                  ? "1px solid var(--feedback-success-border)"
                  : "1px solid var(--feedback-info-border)",
              color:
                messageType === "error"
                  ? "var(--feedback-error-fg)"
                  : messageType === "success"
                  ? "var(--feedback-success-fg)"
                  : "var(--feedback-info-fg)",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span aria-hidden="true">
                {messageType === "error"
                  ? "⚠"
                  : messageType === "success"
                  ? "✦"
                  : "ℹ"}
              </span>
              <span>{message}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="mini-action"
              aria-label="Dismiss notification"
              style={{
                background: "none",
                border: "none",
                color: "currentColor",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.95rem",
                borderRadius: "8px",
              }}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        )}

        {/* Main content landmark (WCAG 1.3.1 / 2.4.1) */}
        <main id="main-content">
        {/* Navigation Bar (Authenticated vs Guest) */}
        {isLoggedIn ? (
          <>
            <nav
              aria-label="Workspace views and account"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                marginBottom: "28px",
                padding: "10px 14px",
                borderRadius: "18px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {/* Primary View Switcher */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setView("tasks")}
                  className={
                    view === "tasks"
                      ? "btn-primary-animated"
                      : "btn-secondary-animated"
                  }
                  style={{
                    padding: "9px 20px",
                    borderRadius: "12px",
                  }}
                >
                  My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  className={
                    view === "dashboard"
                      ? "btn-primary-animated"
                      : "btn-secondary-animated"
                  }
                  style={{
                    padding: "9px 20px",
                    borderRadius: "12px",
                  }}
                >
                  Dashboard
                </button>
              </div>

              {/* User Role Badge, Quick Role Toggle & Logout */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleSwitchDemoRole}
                  className="btn-secondary-animated"
                  title="Switch between User and Manager roles to preview Manager Analytics"
                  style={{
                    padding: "7px 12px",
                    fontSize: "0.76rem",
                  }}
                >
                  <span>
                    Role:{" "}
                    <strong
                      style={{
                        color:
                          user?.role === "manager"
                            ? "var(--manager-fg)"
                            : "var(--accent-primary)",
                        textTransform: "uppercase",
                      }}
                    >
                      {user?.role || "user"}
                    </strong>{" "}
                    ⇄
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="btn-secondary-animated"
                  title="Reset sample tasks"
                  style={{
                    padding: "7px 12px",
                    fontSize: "0.76rem",
                  }}
                >
                  ↺ Reset Demo
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-primary-animated"
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    borderRadius: "12px",
                    background:
                      "linear-gradient(135deg, #ef4444 0%, #e11d48 100%)",
                  }}
                >
                  Logout ({user?.username || "User"})
                </button>
              </div>
            </nav>

            {view === "tasks" && (
              <TaskManagement
                token={token}
                user={user}
                showMessage={showMessage}
                enableTilt={enableTilt}
              />
            )}
            {view === "dashboard" && (
              <Dashboard
                token={token}
                user={user}
                showMessage={showMessage}
                enableTilt={enableTilt}
              />
            )}
          </>
        ) : (
          <>
            {/* Guest Mode Switcher Pills */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginBottom: "24px",
              }}
            >
              <button
                type="button"
                onClick={() => setView("login")}
                className={
                  view === "login"
                    ? "btn-primary-animated"
                    : "btn-secondary-animated"
                }
                style={{ minWidth: "120px" }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setView("register")}
                className={
                  view === "register"
                    ? "btn-primary-animated"
                    : "btn-secondary-animated"
                }
                style={{ minWidth: "120px" }}
              >
                Register
              </button>
            </div>

            {view === "login" && (
              <AuthForm
                type="login"
                enableTilt={enableTilt}
                onSwitchType={setView}
                onAuthSuccess={(userData, userToken) => {
                  setToken(userToken);
                  setUser(userData);
                  setIsLoggedIn(true);
                  localStorage.setItem("token", userToken);
                  localStorage.setItem(
                    "pulsetask_user",
                    JSON.stringify(userData)
                  );
                  setView("tasks");
                  showMessage(
                    `Welcome back, @${userData.username}!`,
                    "success"
                  );
                }}
                showMessage={showMessage}
              />
            )}

            {view === "register" && (
              <AuthForm
                type="register"
                enableTilt={enableTilt}
                onSwitchType={setView}
                onAuthSuccess={(userData, userToken) => {
                  setToken(userToken);
                  setUser(userData);
                  setIsLoggedIn(true);
                  localStorage.setItem("token", userToken);
                  localStorage.setItem(
                    "pulsetask_user",
                    JSON.stringify(userData)
                  );
                  setView("tasks");
                  showMessage(
                    "Workspace account created! Logged in automatically.",
                    "success"
                  );
                }}
                showMessage={showMessage}
              />
            )}
          </>
        )}
        </main>
      </div>

      <Analytics />
    </div>
  );
};

export default App;
