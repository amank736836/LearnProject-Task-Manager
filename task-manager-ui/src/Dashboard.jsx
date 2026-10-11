import { useEffect, useState } from "react";
import { smartApiRequest } from "./api";
import { StatusAnimatedIcon } from "./components/AnimatedIcons";
import { TiltCard } from "./components/TiltCard";

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    color: "#10b981",
    text: "var(--status-completed-fg)",
  },
  "in-progress": {
    label: "In-Progress",
    color: "#3b82f6",
    text: "var(--status-progress-fg)",
  },
  pending: {
    label: "Pending",
    color: "#f59e0b",
    text: "var(--status-pending-fg)",
  },
};

/**
 * Interactive Self-Drawing SVG Radial Donut Chart
 */
const AnimatedSvgDonut = ({ tasksByStatus = {}, total = 0 }) => {
  const [hoveredKey, setHoveredKey] = useState(null);
  const radius = 66;
  const circumference = 2 * Math.PI * radius;

  const segments = ["completed", "in-progress", "pending"].map((key) => {
    const count = tasksByStatus[key] || 0;
    const ratio = total > 0 ? count / total : 0;
    return {
      key,
      label: STATUS_CONFIG[key].label,
      color: STATUS_CONFIG[key].color,
      text: STATUS_CONFIG[key].text,
      count,
      ratio,
      pct: Math.round(ratio * 100),
    };
  });

  let cumulativeRatio = 0;
  const completedPct =
    total > 0 ? Math.round(((tasksByStatus.completed || 0) / total) * 100) : 0;

  const activeSegment = segments.find((s) => s.key === hoveredKey);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-around",
        gap: "24px",
      }}
    >
      <div style={{ position: "relative", width: "184px", height: "184px" }}>
        <svg
          width="184"
          height="184"
          viewBox="0 0 184 184"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx="92"
            cy="92"
            r={radius}
            fill="transparent"
            stroke="rgba(148, 163, 184, 0.14)"
            strokeWidth="18"
          />
          {segments.map((seg) => {
            const strokeLen = seg.ratio * circumference;
            const dashArray = `${strokeLen} ${circumference}`;
            const dashOffset = -cumulativeRatio * circumference;
            cumulativeRatio += seg.ratio;

            if (seg.count === 0) return null;

            const isHovered = hoveredKey === seg.key;
            return (
              <circle
                key={seg.key}
                cx="92"
                cy="92"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? "22" : "18"}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap=" butt"
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{
                  cursor: "pointer",
                  transition:
                    "stroke-width 0.25s ease, stroke-dasharray 0.8s ease",
                }}
              />
            );
          })}
        </svg>

        {/* Center Metric Display */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            className="font-display"
            style={{
              fontSize: "1.95rem",
              fontWeight: 800,
              color: activeSegment ? activeSegment.text : "var(--text-primary)",
              lineHeight: 1.1,
            }}
          >
            {activeSegment ? `${activeSegment.pct}%` : `${completedPct}%`}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
              marginTop: "2px",
            }}
          >
            {activeSegment ? activeSegment.label : "Completed"}
          </span>
        </div>
      </div>

      {/* Interactive Legend */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flex: "1 1 180px",
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.key}
            onMouseEnter={() => setHoveredKey(seg.key)}
            onMouseLeave={() => setHoveredKey(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "12px",
              background:
                hoveredKey === seg.key
                  ? "rgba(99, 102, 241, 0.14)"
                  : "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <StatusAnimatedIcon status={seg.key} size={18} />
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  color: "var(--text-primary)",
                }}
              >
                {seg.label}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="font-mono-code"
                style={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color: seg.text,
                }}
              >
                {seg.count}
              </span>
              <span
                className="font-mono-code"
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                ({seg.pct}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Dashboard = ({
  token,
  user,
  showMessage,
  enableTilt = true,
}) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await smartApiRequest(`/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setStats(res.data);
      } else {
        showMessage(
          res.data?.message || "Failed to fetch dashboard stats.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      showMessage("An error occurred while fetching dashboard stats.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [token]);

  if (loading || !stats) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
          gap: "20px",
        }}
      >
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="surface-card"
            style={{ padding: "24px", height: "140px" }}
          >
            <div
              className="skeleton-shimmer"
              style={{ width: "50%", height: "18px", marginBottom: "16px" }}
            />
            <div
              className="skeleton-shimmer"
              style={{ width: "65%", height: "42px" }}
            />
          </div>
        ))}
      </div>
    );
  }

  const total = stats.totalTasks || 0;
  const completedCount = stats.tasksByStatus?.completed || 0;
  const inProgressCount = stats.tasksByStatus?.["in-progress"] || 0;
  const pendingCount = stats.tasksByStatus?.pending || 0;
  const completionRate =
    total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="page-transition-enter">
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2
            className="font-display"
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 4px 0",
            }}
          >
            Analytics &amp; Velocity Hub
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              margin: 0,
            }}
          >
            Real-time SVG visual telemetry for{" "}
            {user?.role === "manager"
              ? "global team operations"
              : "your personal task pipeline"}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardStats}
          className="btn-secondary-animated"
          style={{ padding: "8px 14px", fontSize: "0.82rem" }}
        >
          ↻ Refresh Telemetry
        </button>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
          gap: "18px",
          marginBottom: "26px",
        }}
      >
        {[
          {
            title: "Total Tasks",
            value: total,
            subtitle: "Tracked in workspace",
            color: "var(--accent-on-tint)",
            status: "in-progress",
          },
          {
            title: "Completion Rate",
            value: `${completionRate}%`,
            subtitle: `${completedCount} tasks delivered`,
            color: "var(--status-completed-fg)",
            status: "completed",
          },
          {
            title: "In-Progress",
            value: inProgressCount,
            subtitle: "Active execution",
            color: "var(--status-progress-fg)",
            status: "in-progress",
          },
          {
            title: "Pending Queue",
            value: pendingCount,
            subtitle: "Awaiting kickoff",
            color: "var(--status-pending-fg)",
            status: "pending",
          },
        ].map((kpi, idx) => (
          <TiltCard
            key={kpi.title}
            enableTilt={enableTilt}
            className="stagger-item"
            style={{
              animationDelay: `${idx * 0.06}s`,
              padding: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {kpi.title}
              </span>
              <StatusAnimatedIcon status={kpi.status} size={20} />
            </div>
            <div
              className="font-display"
              style={{
                fontSize: "2.35rem",
                fontWeight: 800,
                color: kpi.color,
                lineHeight: 1.1,
                marginBottom: "6px",
              }}
            >
              {kpi.value}
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
              }}
            >
              {kpi.subtitle}
            </div>
          </TiltCard>
        ))}
      </div>

      {/* Middle 2-Column Charts Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: "22px",
          marginBottom: "28px",
        }}
      >
        {/* Left: Interactive SVG Radial Donut Chart */}
        <TiltCard enableTilt={enableTilt} intensity={3} style={{ padding: "24px" }}>
          <h3
            className="font-display"
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 18px 0",
            }}
          >
            Tasks by Status Distribution
          </h3>
          <AnimatedSvgDonut
            tasksByStatus={stats.tasksByStatus || {}}
            total={total}
          />
        </TiltCard>

        {/* Right: Self-Drawing SVG Velocity Wave & Liquid Progress Breakdown */}
        <TiltCard enableTilt={enableTilt} intensity={3} style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <h3
              className="font-display"
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Workflow Momentum Curve
            </h3>
            <span
              className="font-mono-code"
              style={{
                fontSize: "0.75rem",
                color: "var(--status-completed-fg)",
                padding: "3px 9px",
                borderRadius: "9999px",
                background: "var(--status-completed-bg)",
                whiteSpace: "nowrap",
              }}
            >
              LIVE SVG TELEMETRY
            </span>
          </div>

          {/* Self-Drawing SVG Area Chart */}
          <svg
            viewBox="0 0 360 115"
            fill="none"
            style={{ width: "100%", height: "115px", marginBottom: "16px" }}
          >
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(99, 102, 241, 0.42)" />
                <stop offset="100%" stopColor="rgba(99, 102, 241, 0.0)" />
              </linearGradient>
              <linearGradient id="waveLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d="M10 92 C 65 85, 95 42, 145 58 C 195 74, 225 26, 280 36 C 315 42, 335 16, 352 14 L 352 108 L 10 108 Z"
              fill="url(#areaFill)"
            />
            <path
              d="M10 92 C 65 85, 95 42, 145 58 C 195 74, 225 26, 280 36 C 315 42, 335 16, 352 14"
              stroke="url(#waveLine)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="svg-self-draw"
            />
            <circle cx="145" cy="58" r="4.5" fill="#a855f7" />
            <circle cx="280" cy="36" r="4.5" fill="#6366f1" />
            <circle cx="352" cy="14" r="5.5" fill="#10b981">
              <animate
                attributeName="r"
                values="4;7;4"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>

          {/* Liquid Progress Bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries({
              completed: completedCount,
              "in-progress": inProgressCount,
              pending: pendingCount,
            }).map(([statusKey, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const cfg = STATUS_CONFIG[statusKey];
              return (
                <div key={statusKey}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        textTransform: "capitalize",
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      {statusKey}
                    </span>
                    <span
                      className="font-mono-code"
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 700,
                      }}
                    >
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div
                    className="liquid-progress-bar"
                    style={{
                      height: "8px",
                      background: "rgba(148, 163, 184, 0.16)",
                    }}
                  >
                    <div
                      className="liquid-progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: cfg.text,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </TiltCard>
      </div>

      {/* Manager View: All Users Team Matrix */}
      {user?.role === "manager" && stats.allUsersStats && (
        <div className="surface-card" style={{ padding: "26px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div>
              <h3
                className="font-display"
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: "0 0 4px 0",
                }}
              >
                All Users Statistics (Manager View)
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.86rem",
                  margin: 0,
                }}
              >
                Per-member workload distribution and completion ratios across the
                organization
              </p>
            </div>
            <span
              className="font-mono-code"
              style={{
                padding: "5px 12px",
                borderRadius: "9999px",
                fontSize: "0.76rem",
                fontWeight: 700,
                background: "rgba(99, 102, 241, 0.16)",
                color: "var(--accent-on-tint)",
                whiteSpace: "nowrap",
              }}
            >
              {Object.keys(stats.allUsersStats).length} Active Members
            </span>
          </div>

          {Object.entries(stats.allUsersStats).length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(245px, 100%), 1fr))",
                gap: "16px",
              }}
            >
              {Object.entries(stats.allUsersStats).map(
                ([username, userStats], idx) => {
                  const uTotal = userStats.totalTasks || 0;
                  const uDone = userStats.tasksByStatus?.completed || 0;
                  const uProg = userStats.tasksByStatus?.["in-progress"] || 0;
                  const uPend = userStats.tasksByStatus?.pending || 0;
                  const uPct =
                    uTotal > 0 ? Math.round((uDone / uTotal) * 100) : 0;

                  return (
                    <TiltCard
                      key={username}
                      enableTilt={enableTilt}
                      className="stagger-item"
                      style={{
                        animationDelay: `${idx * 0.06}s`,
                        padding: "18px",
                        background: "var(--bg-input)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              background:
                                "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.92rem",
                              textTransform: "uppercase",
                            }}
                          >
                            {username.slice(0, 2)}
                          </div>
                          <div>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: "0.98rem",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                              }}
                            >
                              @{username}
                            </h4>
                            <span
                              style={{
                                fontSize: "0.74rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              Total Tasks: <strong>{uTotal}</strong>
                            </span>
                          </div>
                        </div>

                        <span
                          className="font-mono-code"
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: "var(--status-completed-fg)",
                          }}
                        >
                          {uPct}%
                        </span>
                      </div>

                      {/* Stacked Multi-Color Progress Bar */}
                      <div
                        style={{
                          display: "flex",
                          height: "7px",
                          borderRadius: "9999px",
                          overflow: "hidden",
                          background: "rgba(148, 163, 184, 0.16)",
                          marginBottom: "12px",
                        }}
                      >
                        {uTotal > 0 && (
                          <>
                            <div
                              style={{
                                width: `${(uDone / uTotal) * 100}%`,
                                background: "var(--status-completed-fill)",
                              }}
                            />
                            <div
                              style={{
                                width: `${(uProg / uTotal) * 100}%`,
                                background: "var(--status-progress-fill)",
                              }}
                            />
                            <div
                              style={{
                                width: `${(uPend / uTotal) * 100}%`,
                                background: "var(--status-pending-fill)",
                              }}
                            />
                          </>
                        )}
                      </div>

                      <ul
                        style={{
                          listStyle: "none",
                          padding: 0,
                          margin: 0,
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.76rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <li>
                          Done:{" "}
                          <strong style={{ color: "var(--status-completed-fg)" }}>
                            {uDone}
                          </strong>
                        </li>
                        <li>
                          Active:{" "}
                          <strong style={{ color: "var(--status-progress-fg)" }}>
                            {uProg}
                          </strong>
                        </li>
                        <li>
                          Pending:{" "}
                          <strong style={{ color: "var(--status-pending-fg)" }}>
                            {uPend}
                          </strong>
                        </li>
                      </ul>
                    </TiltCard>
                  );
                }
              )}
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              No user statistics available yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
