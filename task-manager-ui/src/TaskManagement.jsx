import { useEffect, useRef, useState } from "react";
import { smartApiRequest } from "./api";
import {
  ConfettiBurst,
  EmptyStateDoodle,
  StatusAnimatedIcon,
} from "./components/AnimatedIcons";
import { TiltCard } from "./components/TiltCard";

const STATUS_META = {
  pending: {
    label: "Pending",
    color: "#f59e0b",
    // Theme-aware AA tokens: text on tinted pills, solid chip fill, bar fill
    text: "var(--status-pending-fg)",
    solid: "var(--status-pending-solid)",
    fill: "var(--status-pending-fill)",
    bg: "var(--status-pending-bg)",
    border: "var(--status-pending-border)",
    progress: 18,
  },
  "in-progress": {
    label: "In-Progress",
    color: "#3b82f6",
    text: "var(--status-progress-fg)",
    solid: "var(--status-progress-solid)",
    fill: "var(--status-progress-fill)",
    bg: "var(--status-progress-bg)",
    border: "var(--status-progress-border)",
    progress: 58,
  },
  completed: {
    label: "Completed",
    color: "#10b981",
    text: "var(--status-completed-fg)",
    solid: "var(--status-completed-solid)",
    fill: "var(--status-completed-fill)",
    bg: "var(--status-completed-bg)",
    border: "var(--status-completed-border)",
    progress: 100,
  },
};

const QUICK_TEMPLATES = [
  {
    title: "Refine Microinteraction Spring Curves",
    description:
      "Tune cubic-bezier transitions on hover cards, status toggles, and modal entrances for 60fps responsiveness.",
    status: "in-progress",
  },
  {
    title: "Ship Self-Drawing SVG Analytics Report",
    description:
      "Export team velocity metrics and radial completion charts for the weekly product design sync.",
    status: "pending",
  },
  {
    title: "Complete Accessibility & Reduced Motion Audit",
    description:
      "Verify contrast ratios across Dark Glass and Light Claymorphic themes and test motion-pause controls.",
    status: "completed",
  },
];

export const TaskManagement = ({
  token,
  user,
  showMessage,
  enableTilt = true,
}) => {
  const [tasks, setTasks] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    "in-progress": 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [editingTask, setEditingTask] = useState(null);
  const [isComposerOpen, setIsComposerOpen] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [sortOrder, setSortOrder] = useState("createdAt:desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [displayMode, setDisplayMode] = useState("grid"); // 'grid' | 'kanban' | 'timeline'

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const deleteTriggerRef = useRef(null);
  const cancelDeleteRef = useRef(null);

  const limit = displayMode === "kanban" ? 30 : 9;

  const triggerCelebration = () => {
    setConfettiTrigger(true);
    setTimeout(() => setConfettiTrigger(false), 750);
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterStatus) queryParams.append("status", filterStatus);
      if (sortOrder) queryParams.append("sort", sortOrder);
      if (searchTerm) queryParams.append("search", searchTerm);
      queryParams.append("page", currentPage);
      queryParams.append("limit", limit);

      const res = await smartApiRequest(`/api/tasks?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const docs = res.data.docs || [];
        setTasks(docs);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.statusCounts) {
          setStatusCounts(res.data.statusCounts);
        } else {
          const fallbackCounts = docs.reduce(
            (acc, t) => {
              acc.all += 1;
              acc[t.status] = (acc[t.status] || 0) + 1;
              return acc;
            },
            { all: 0, pending: 0, "in-progress": 0, completed: 0 }
          );
          setStatusCounts(fallbackCounts);
        }
      } else {
        showMessage(res.data?.message || "Failed to fetch tasks.", "error");
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      showMessage("An error occurred while fetching tasks.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token, filterStatus, sortOrder, searchTerm, currentPage, displayMode]);

  // Accessible modal behaviour: focus in, Escape to close, restore focus,
  // and stop the page behind the dialog from scrolling (WCAG 2.4.3 / 1.4.13).
  useEffect(() => {
    if (!confirmDeleteId) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const previouslyFocused =
      deleteTriggerRef.current || document.activeElement || null;
    const focusTimer = setTimeout(() => cancelDeleteRef.current?.focus(), 40);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [confirmDeleteId]);

  const handleCreateOrUpdateTask = async (e) => {
    e.preventDefault();
    // Guard against duplicate submissions from rapid repeated clicks / Enter
    if (isSaving) return;
    setIsSaving(true);
    try {
      const method = editingTask ? "PUT" : "POST";
      const path = editingTask
        ? `/api/tasks/${editingTask._id}`
        : `/api/tasks`;

      const res = await smartApiRequest(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, status }),
      });

      if (res.ok) {
        if (status === "completed") {
          triggerCelebration();
        }
        showMessage(
          editingTask
            ? "Task updated with smooth precision!"
            : "New task created in workspace!",
          "success"
        );
        setTitle("");
        setDescription("");
        setStatus("pending");
        setEditingTask(null);
        fetchTasks();
      } else {
        showMessage(
          res.data?.message ||
            `Failed to ${editingTask ? "update" : "create"} task.`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error creating/updating task:", error);
      showMessage(
        `An error occurred while ${
          editingTask ? "updating" : "creating"
        } the task.`,
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (task, nextStatus) => {
    if (task.status === nextStatus) return;
    try {
      const res = await smartApiRequest(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        if (nextStatus === "completed") {
          triggerCelebration();
        }
        showMessage(
          `Moved "${task.title.slice(0, 28)}..." to ${STATUS_META[nextStatus]?.label}!`,
          "success"
        );
        fetchTasks();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const res = await smartApiRequest(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        showMessage("Task removed from workspace.", "success");
        setConfirmDeleteId(null);
        fetchTasks();
      } else {
        showMessage(res.data?.message || "Failed to delete task.", "error");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      showMessage("An error occurred while deleting the task.", "error");
    }
  };

  const startEdit = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setIsComposerOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setStatus("pending");
  };

  const applyTemplate = (tpl) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setStatus(tpl.status);
    setIsComposerOpen(true);
  };

  // Kanban Drag & Drop Handlers
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e, colStatus) => {
    e.preventDefault();
    if (dragOverCol !== colStatus) {
      setDragOverCol(colStatus);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDragOverCol(null);
    setDraggedTaskId(null);
    const task = tasks.find((t) => t._id === taskId);
    if (task && task.status !== targetStatus) {
      handleQuickStatusChange(task, targetStatus);
    }
  };

  return (
    <div className="page-transition-enter">
      <ConfettiBurst active={confettiTrigger} />

      {/* Top Action Header Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
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
            Workspace Tasks
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              margin: 0,
            }}
          >
            {user?.role === "manager"
              ? "Manager Oversight • Viewing & orchestrating all team tasks"
              : "Personal Workspace • Manage, filter, and track your active deliverables"}
          </p>
        </div>

        {/* Display Mode Switcher (Bento Grid / Kanban Board / Timeline) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "100%",
              padding: "4px",
              borderRadius: "14px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {[
              { id: "grid", label: "3D Grid" },
              { id: "kanban", label: "Kanban Board" },
              { id: "timeline", label: "Timeline" },
            ].map((mode) => {
              const active = displayMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setDisplayMode(mode.id)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    minHeight: "32px",
                    background: active
                      ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                      : "transparent",
                    color: active ? "#fff" : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsComposerOpen((prev) => !prev)}
            className="btn-secondary-animated"
            style={{ padding: "9px 14px", fontSize: "0.82rem" }}
          >
            {isComposerOpen ? "Hide Composer" : "+ New Task"}
          </button>
        </div>
      </div>

      {/* Collapsible Task Composer & Editor Card */}
      {isComposerOpen && (
        <TiltCard
          enableTilt={false}
          style={{
            padding: "24px",
            marginBottom: "24px",
            border: editingTask
              ? "1.5px solid var(--accent-primary)"
              : undefined,
          }}
        >
          <form onSubmit={handleCreateOrUpdateTask}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <StatusAnimatedIcon status={status} size={22} />
                <h3
                  className="font-display"
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {editingTask ? "Edit Selected Task" : "Create New Task"}
                </h3>
              </div>

              {/* Quick Inspire Templates */}
              {!editingTask && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Quick Fill:
                  </span>
                  {QUICK_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "9999px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background: "var(--bg-glass-pill)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      Spark #{i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                  htmlFor="taskTitle"
                >
                  Task Title
                </label>
                <input
                  type="text"
                  id="taskTitle"
                  className="input-animated"
                  placeholder="What milestone needs to happen?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                  htmlFor="taskStatus"
                >
                  Workflow Stage
                </label>
                <select
                  id="taskStatus"
                  className="input-animated"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-secondary)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
                htmlFor="taskDescription"
              >
                Description &amp; Acceptance Notes
              </label>
              <textarea
                id="taskDescription"
                rows="2"
                className="input-animated"
                placeholder="Add context, links, or deliverables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              {editingTask && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn-secondary-animated"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="btn-primary-animated"
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : editingTask
                  ? "Save Task Changes"
                  : "Add Task to Workspace"}
              </button>
            </div>
          </form>
        </TiltCard>
      )}

      {/* Interactive Status Filter Pills, Search & Sort Bar */}
      <div
        className="surface-card"
        style={{
          padding: "18px 20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          {/* Status Filter Segmented Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "", label: "All Tasks", count: statusCounts.all },
              {
                id: "pending",
                label: "Pending",
                count: statusCounts.pending,
                color: "#f59e0b",
              },
              {
                id: "in-progress",
                label: "In-Progress",
                count: statusCounts["in-progress"],
                color: "#3b82f6",
              },
              {
                id: "completed",
                label: "Completed",
                count: statusCounts.completed,
                color: "#10b981",
              },
            ].map((tab) => {
              const active = filterStatus === tab.id;
              return (
                <button
                  key={tab.id || "all"}
                  type="button"
                  onClick={() => {
                    setFilterStatus(tab.id);
                    setCurrentPage(1);
                  }}
                  aria-pressed={active}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 13px",
                    minHeight: "30px",
                    borderRadius: "9999px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: active
                      ? "1.5px solid var(--accent-primary)"
                      : "1px solid var(--border-subtle)",
                    background: active
                      ? "rgba(99, 102, 241, 0.16)"
                      : "var(--bg-glass-pill)",
                    color: active
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {tab.color && (
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        backgroundColor: tab.color,
                      }}
                    />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className="font-mono-code"
                    style={{
                      fontSize: "0.72rem",
                      padding: "1px 7px",
                      borderRadius: "9999px",
                      background: "rgba(148, 163, 184, 0.16)",
                    }}
                  >
                    {tab.count ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              flex: "1 1 320px",
              justifyContent: "flex-end",
            }}
          >
            {/* Keep hidden filterStatus select for compatibility */}
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{ display: "none" }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In-Progress</option>
              <option value="completed">Completed</option>
            </select>

            <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
              <input
                type="text"
                id="searchTerm"
                className="input-animated"
                aria-label="Search tasks by title or description"
                style={{ padding: "8px 40px 8px 13px", fontSize: "0.84rem" }}
                placeholder="Search title or description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="mini-action"
                  aria-label="Clear search"
                  style={{
                    position: "absolute",
                    right: "4px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "28px",
                    height: "28px",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    borderRadius: "8px",
                  }}
                >
                  <span aria-hidden="true">✕</span>
                </button>
              )}
            </div>

            <select
              id="sortOrder"
              className="input-animated"
              aria-label="Sort tasks"
              style={{
                width: "auto",
                maxWidth: "100%",
                padding: "8px 12px",
                fontSize: "0.84rem",
              }}
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="title:asc">Title (A-Z)</option>
              <option value="title:desc">Title (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeleton Screen (SVGator #24) */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
            gap: "20px",
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="surface-card"
              style={{ padding: "22px", height: "210px" }}
            >
              <div
                className="skeleton-shimmer"
                style={{ width: "38%", height: "22px", marginBottom: "16px" }}
              />
              <div
                className="skeleton-shimmer"
                style={{ width: "85%", height: "20px", marginBottom: "10px" }}
              />
              <div
                className="skeleton-shimmer"
                style={{ width: "100%", height: "46px", marginBottom: "20px" }}
              />
              <div
                className="skeleton-shimmer"
                style={{ width: "100%", height: "32px" }}
              />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        /* Empty State with Self-Drawing Doodle (SVGator #8, #21) */
        <div
          className="surface-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <EmptyStateDoodle />
          <h3
            className="font-display"
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "8px 0 0 0",
            }}
          >
            No matching tasks found
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              maxWidth: "380px",
              margin: 0,
            }}
          >
            Try clearing your search filters or use the composer above to launch
            a fresh task into your workspace.
          </p>
          {(filterStatus || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus("");
                setSearchTerm("");
              }}
              className="btn-secondary-animated"
              style={{ marginTop: "8px" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : displayMode === "kanban" ? (
        /* ==================================================================
           INTERACTIVE KANBAN BOARD VIEW (Drag & Drop + Status Microinteractions)
           ================================================================== */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(275px, 100%), 1fr))",
            gap: "18px",
            alignItems: "start",
          }}
        >
          {["pending", "in-progress", "completed"].map((colKey) => {
            const meta = STATUS_META[colKey];
            const colTasks = tasks.filter((t) => t.status === colKey);
            const isOver = dragOverCol === colKey;

            return (
              <div
                key={colKey}
                onDragOver={(e) => handleDragOver(e, colKey)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, colKey)}
                className={`surface-card kanban-dropzone ${
                  isOver ? "drag-over" : ""
                }`}
                style={{
                  padding: "16px",
                  minHeight: "420px",
                  borderTop: `3px solid ${meta.color}`,
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <StatusAnimatedIcon status={colKey} size={18} />
                    <span
                      className="font-display"
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <span
                    className="font-mono-code"
                    style={{
                      padding: "2px 9px",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: meta.bg,
                      color: meta.color,
                      border: `1px solid ${meta.border}`,
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {colTasks.map((task) => (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task._id)}
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-subtle)",
                        cursor: "grab",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "8px",
                          marginBottom: "6px",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "0.94rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: 0,
                            lineHeight: 1.35,
                          }}
                        >
                          {task.title}
                        </h4>
                      </div>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                          margin: "0 0 12px 0",
                          lineHeight: 1.45,
                        }}
                      >
                        {task.description}
                      </p>

                      {/* Quick Move Stage Buttons + Edit/Delete */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "6px",
                          rowGap: "8px",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                          }}
                        >
                          {["pending", "in-progress", "completed"].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleQuickStatusChange(task, st)}
                              title={`Move to ${STATUS_META[st].label}`}
                              aria-label={`${STATUS_META[st].label.slice(
                                0,
                                4
                              )} — move "${task.title}" to ${
                                STATUS_META[st].label
                              }`}
                              aria-pressed={task.status === st}
                              className="mini-action"
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                border: "none",
                                cursor: "pointer",
                                background:
                                  task.status === st
                                    ? STATUS_META[st].solid
                                    : "rgba(148, 163, 184, 0.14)",
                                color:
                                  task.status === st
                                    ? "#fff"
                                    : "var(--text-secondary)",
                              }}
                            >
                              {STATUS_META[st].label.slice(0, 4)}
                            </button>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => startEdit(task)}
                            aria-label={`Edit "${task.title}"`}
                            className="mini-action"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--link-accent)",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: "4px 6px",
                              borderRadius: "6px",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              deleteTriggerRef.current = document.activeElement;
                              setConfirmDeleteId(task._id);
                            }}
                            aria-label={`Delete "${task.title}"`}
                            className="mini-action"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--danger-fg)",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: "4px 6px",
                              borderRadius: "6px",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div
                      style={{
                        padding: "28px 14px",
                        borderRadius: "12px",
                        border: "1.5px dashed var(--border-subtle)",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      Drag a task card here to move to {meta.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : displayMode === "timeline" ? (
        /* ==================================================================
           SCROLLYTELLING CONNECTED TIMELINE VIEW (SVGator #2, #7)
           ================================================================== */
        <div
          style={{
            position: "relative",
            paddingLeft: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Vertical Self-Drawing Line */}
          <div
            style={{
              position: "absolute",
              left: "11px",
              top: "12px",
              bottom: "12px",
              width: "2px",
              background:
                "linear-gradient(180deg, var(--accent-primary), var(--accent-secondary), var(--accent-cyan))",
            }}
          />
          {tasks.map((task, idx) => {
            const meta = STATUS_META[task.status] || STATUS_META.pending;
            return (
              <div
                key={task._id}
                className="surface-card stagger-item"
                style={{
                  animationDelay: `${idx * 0.05}s`,
                  padding: "18px 22px",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: "-23px",
                    top: "24px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: meta.color,
                    boxShadow: `0 0 10px ${meta.color}`,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 260px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "4px",
                      }}
                    >
                      <StatusAnimatedIcon status={task.status} size={18} />
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {task.title}
                      </h4>
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: "9999px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          background: meta.bg,
                          color: meta.text,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.86rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {task.description}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => startEdit(task)}
                      className="btn-secondary-animated"
                      aria-label={`Edit "${task.title}"`}
                      style={{
                        padding: "6px 12px",
                        minHeight: "34px",
                        fontSize: "0.78rem",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTriggerRef.current = document.activeElement;
                        setConfirmDeleteId(task._id);
                      }}
                      className="btn-secondary-animated"
                      aria-label={`Delete "${task.title}"`}
                      style={{
                        padding: "6px 12px",
                        minHeight: "34px",
                        fontSize: "0.78rem",
                        color: "var(--danger-fg)",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ==================================================================
           3D PERSPECTIVE BENTO GRID VIEW (Default - SVGator #14, #26)
           ================================================================== */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(285px, 100%), 1fr))",
            gap: "20px",
          }}
        >
          {tasks.map((task, idx) => {
            const meta = STATUS_META[task.status] || STATUS_META.pending;
            const ownerName =
              typeof task.user === "object" ? task.user?.username : null;

            return (
              <TiltCard
                key={task._id}
                enableTilt={enableTilt}
                className="stagger-item"
                style={{
                  animationDelay: `${idx * 0.05}s`,
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Top Status Pill & Date */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 11px",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: meta.bg,
                        color: meta.text,
                        border: `1px solid ${meta.border}`,
                        textTransform: "capitalize",
                      }}
                    >
                      <StatusAnimatedIcon status={task.status} size={15} />
                      {task.status}
                    </span>

                    <span
                      className="font-mono-code"
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Task Title & Description */}
                  <h4
                    className="font-display"
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      margin: "0 0 8px 0",
                      lineHeight: 1.35,
                      textDecoration:
                        task.status === "completed" ? "line-through" : "none",
                      opacity: task.status === "completed" ? 0.82 : 1,
                    }}
                  >
                    {task.title}
                  </h4>

                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.875rem",
                      lineHeight: 1.55,
                      margin: "0 0 16px 0",
                    }}
                  >
                    {task.description}
                  </p>
                </div>

                <div>
                  {/* Animated Liquid Progress Bar */}
                  <div
                    style={{
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginBottom: "5px",
                      }}
                    >
                      <span>{ownerName ? `@${ownerName}` : "Workspace"}</span>
                      <span className="font-mono-code">{meta.progress}%</span>
                    </div>
                    <div
                      className="liquid-progress-bar"
                      style={{
                        height: "6px",
                        background: "rgba(148, 163, 184, 0.16)",
                      }}
                    >
                      <div
                        className="liquid-progress-fill"
                        style={{
                          width: `${meta.progress}%`,
                          background: meta.fill,
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Status Stepper & Action Buttons */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    {task.status !== "completed" ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickStatusChange(
                            task,
                            task.status === "pending"
                              ? "in-progress"
                              : "completed"
                          )
                        }
                        className="btn-secondary-animated"
                        style={{
                          padding: "7px 12px",
                          fontSize: "0.76rem",
                          minHeight: "34px",
                          color:
                            task.status === "pending"
                              ? "var(--status-progress-fg)"
                              : "var(--status-completed-fg)",
                        }}
                      >
                        {task.status === "pending"
                          ? "▶ Start Task"
                          : "✓ Complete"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(task, "pending")}
                        className="btn-secondary-animated"
                        style={{
                          padding: "7px 12px",
                          fontSize: "0.76rem",
                          minHeight: "34px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        ↺ Reopen
                      </button>
                    )}

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => startEdit(task)}
                        className="btn-secondary-animated"
                        aria-label={`Edit "${task.title}"`}
                        style={{
                          padding: "7px 12px",
                          minHeight: "34px",
                          fontSize: "0.76rem",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteTriggerRef.current = document.activeElement;
                          setConfirmDeleteId(task._id);
                        }}
                        className="btn-secondary-animated"
                        aria-label={`Delete "${task.title}"`}
                        style={{
                          padding: "7px 12px",
                          minHeight: "34px",
                          fontSize: "0.76rem",
                          color: "var(--danger-fg)",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      )}

      {/* Custom Glassmorphic Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) setConfirmDeleteId(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(2, 6, 23, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-modal-title"
            aria-describedby="delete-task-modal-desc"
            className="surface-card page-transition-enter"
            style={{
              maxWidth: "400px",
              width: "100%",
              padding: "28px",
              textAlign: "center",
            }}
          >
            <h3
              id="delete-task-modal-title"
              className="font-display"
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                margin: "0 0 8px 0",
              }}
            >
              Remove this task?
            </h3>
            <p
              id="delete-task-modal-desc"
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                margin: "0 0 22px 0",
              }}
            >
              This action will permanently remove the task from your workspace.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <button
                type="button"
                ref={cancelDeleteRef}
                onClick={() => setConfirmDeleteId(null)}
                className="btn-secondary-animated"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(confirmDeleteId)}
                className="btn-primary-animated"
                style={{
                  background:
                    "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && displayMode !== "kanban" && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            marginTop: "28px",
          }}
        >
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn-secondary-animated"
          >
            ← Previous
          </button>
          <span
            className="font-mono-code"
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: "0.88rem",
            }}
          >
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="btn-secondary-animated"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
