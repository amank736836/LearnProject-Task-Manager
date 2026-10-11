import { useState } from "react";
import { createDemoSession, smartApiRequest } from "./api";
import { HeroIsometricIllustration } from "./components/AnimatedIcons";
import { TiltCard } from "./components/TiltCard";

export const AuthForm = ({
  type,
  onAuthSuccess,
  showMessage,
  onSwitchType,
  enableTilt = true,
}) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = type === "login" ? "login" : "register";
      const body =
        type === "login"
          ? { email, password }
          : { username, email, password, role };

      const res = await smartApiRequest(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        localStorage.setItem("pulsetask_user", JSON.stringify(res.data));
        onAuthSuccess(res.data, res.data.token);
      } else {
        showMessage(res.data?.message || `Failed to ${type}.`, "error");
      }
    } catch (error) {
      console.error("Auth error:", error);
      showMessage(`An error occurred during ${type}.`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = (demoRole) => {
    const session = createDemoSession(demoRole);
    localStorage.setItem("pulsetask_user", JSON.stringify(session.user));
    onAuthSuccess(session.user, session.token);
  };

  return (
    <div
      className="page-transition-enter"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(310px, 100%), 1fr))",
        gap: "28px",
        alignItems: "stretch",
      }}
    >
      {/* Left Hero Showcase Column (SVGator #4, #14, #19, #23) */}
      <TiltCard
        enableTilt={enableTilt}
        intensity={4}
        style={{
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "var(--hero-surface)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "9999px",
              background: "rgba(99, 102, 241, 0.14)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--accent-primary)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: "18px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 10px #10b981",
              }}
            />
            Interactive Motion Workspace
          </div>

          <h2
            className="font-display"
            style={{
              fontSize: "clamp(1.65rem, 2.6vw, 2.25rem)",
              fontWeight: 800,
              lineHeight: 1.18,
              margin: "0 0 12px 0",
              color: "var(--text-primary)",
            }}
          >
            Orchestrate tasks with{" "}
            <span className="kinetic-gradient-text">living web motion.</span>
          </h2>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.94rem",
              lineHeight: 1.6,
              margin: "0 0 20px 0",
            }}
          >
            Experience 3D perspective cards, self-drawing SVG analytics,
            drag-and-drop Kanban boards, and adaptive Glass &amp; Claymorphic
            surfaces.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "8px 0 16px 0",
            }}
          >
            <HeroIsometricIllustration />
          </div>
        </div>

        {/* 1-Click Instant Demo Workspace Launchers */}
        <div
          style={{
            marginTop: "12px",
            padding: "16px",
            borderRadius: "16px",
            background: "var(--bg-glass-pill)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-secondary)",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Instant 1-Click Demo Sandbox</span>
            <span
              className="font-mono-code"
              style={{ color: "#10b981", fontSize: "0.72rem" }}
            >
              9 Tasks Pre-Seeded
            </span>
          </div>
          <div
            style={{
              display: "grid",
              // minmax(0, 1fr) lets each track shrink below its min-content
              // width so long labels wrap instead of being clipped at 320px
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={() => handleQuickDemo("manager")}
              className="btn-primary-animated"
              style={{
                padding: "10px 12px",
                fontSize: "0.82rem",
                borderRadius: "12px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Demo as Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("user")}
              className="btn-secondary-animated"
              style={{
                padding: "10px 12px",
                fontSize: "0.82rem",
                borderRadius: "12px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Demo as User
            </button>
          </div>
        </div>
      </TiltCard>

      {/* Right Authentication Form Card */}
      <TiltCard
        enableTilt={enableTilt}
        intensity={3}
        style={{
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <h2
              className="font-display"
              style={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: "0 0 6px 0",
              }}
            >
              {type === "login" ? "Welcome Back" : "Create Workspace Account"}
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.88rem",
                margin: 0,
              }}
            >
              {type === "login"
                ? "Sign in with your credentials or use the instant demo buttons."
                : "Register as a User or Manager to unlock role-based analytics."}
            </p>
          </div>

          {type === "register" && (
            <div className="stagger-item" style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-secondary)",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  marginBottom: "7px",
                  letterSpacing: "0.02em",
                }}
                htmlFor="username"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                className="input-animated"
                placeholder="e.g. alex_morgan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={type === "register"}
              />
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                fontWeight: 700,
                marginBottom: "7px",
                letterSpacing: "0.02em",
              }}
              htmlFor="email"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="input-animated"
              placeholder="name@pulsetask.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                fontWeight: 700,
                marginBottom: "7px",
                letterSpacing: "0.02em",
              }}
              htmlFor="password"
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="input-animated"
                style={{ paddingRight: "44px" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
                className="mini-action"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "28px",
                  height: "28px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {type === "register" && (
            <div className="stagger-item" style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-secondary)",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  marginBottom: "8px",
                  letterSpacing: "0.02em",
                }}
                htmlFor="role"
              >
                Workspace Role
              </label>

              {/* Keep hidden select for accessibility/tests plus interactive tactile cards */}
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ display: "none" }}
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
              </select>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                {[
                  {
                    id: "user",
                    title: "User",
                    subtitle: "Personal tasks & stats",
                  },
                  {
                    id: "manager",
                    title: "Manager",
                    subtitle: "Team-wide analytics",
                  },
                ].map((opt) => {
                  const selected = role === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setRole(opt.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "14px",
                        cursor: "pointer",
                        border: selected
                          ? "1.5px solid var(--accent-primary)"
                          : "1.5px solid var(--border-subtle)",
                        background: selected
                          ? "rgba(99, 102, 241, 0.15)"
                          : "var(--bg-input)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: selected
                            ? "var(--accent-primary)"
                            : "var(--text-primary)",
                          marginBottom: "2px",
                        }}
                      >
                        {opt.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {opt.subtitle}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary-animated"
            style={{
              width: "100%",
              padding: "13px 24px",
              fontSize: "0.98rem",
              marginTop: "4px",
            }}
          >
            {isSubmitting
              ? "Authenticating..."
              : type === "login"
              ? "Sign In to Workspace"
              : "Create Account & Launch"}
          </button>

          {onSwitchType && (
            <p
              style={{
                textAlign: "center",
                marginTop: "18px",
                marginBottom: 0,
                fontSize: "0.86rem",
                color: "var(--text-secondary)",
              }}
            >
              {type === "login"
                ? "Don't have an account yet? "
                : "Already have a workspace account? "}
              <button
                type="button"
                onClick={() =>
                  onSwitchType(type === "login" ? "register" : "login")
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--link-accent)",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "6px 4px",
                  minHeight: "24px",
                  borderRadius: "6px",
                }}
              >
                {type === "login" ? "Register now" : "Sign in"}
              </button>
            </p>
          )}
        </form>
      </TiltCard>
    </div>
  );
};
