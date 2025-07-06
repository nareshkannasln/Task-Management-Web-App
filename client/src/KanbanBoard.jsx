import React, {
  useState,
  useEffect,
  useContext,
  useReducer,
  useRef,
  createContext,
  useMemo,
} from "react";
import "./KanbanBoard.css";

// ✅ Context
const KanbanContext = createContext();

const initialState = {
  todo: [],
  inProgress: [],
  done: [],
};

// ✅ Reducer
function kanbanReducer(state, action) {
  switch (action.type) {
    case "LOAD_TASKS":
      return action.payload;

    case "MOVE_CARD": {
      const { card, from, to, targetId } = action.payload;
      const newSource = state[from].filter((c) => c.id !== card.id);
      let newTarget = state[to].filter((c) => c.id !== card.id);
      const targetIndex = newTarget.findIndex((c) => c.id === targetId);

      if (targetIndex === -1 || from !== to) {
        newTarget.push(card);
      } else {
        newTarget.splice(targetIndex, 0, card);
      }

      return { ...state, [from]: newSource, [to]: newTarget };
    }

    case "ADD_TASK": {
      const newTask = action.payload.newTask;
      return { ...state, todo: [...state.todo, newTask] };
    }

    case "DELETE_TASK": {
      const { cardId, from } = action.payload;
      return { ...state, [from]: state[from].filter((card) => card.id !== cardId) };
    }

    case "EDIT_CARD": {
      const { cardId, from, newText } = action.payload;
      return {
        ...state,
        [from]: state[from].map((card) =>
          card.id === cardId ? { ...card, text: newText } : card
        ),
      };
    }

    default:
      return state;
  }
}

// ✅ Provider
function KanbanProvider({ children, username }) {
  const [state, dispatch] = useReducer(kanbanReducer, initialState);
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [hoverTargetId, setHoverTargetId] = useState(null);

  useEffect(() => {
    async function fetchTasks() {
      const res = await fetch(`http://localhost:3001/tasks?username=${username}`);
      const data = await res.json();

      const grouped = { todo: [], inProgress: [], done: [] };
      data.forEach((task) => {
        grouped[task.status].push({ id: task.id.toString(), text: task.text });
      });

      dispatch({ type: "LOAD_TASKS", payload: grouped });
    }
    fetchTasks();
  }, [username]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      draggedCardId,
      setDraggedCardId,
      hoverTargetId,
      setHoverTargetId,
      username,
    }),
    [state, draggedCardId, hoverTargetId]
  );

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>;
}

// ✅ Task Input
function TaskInput() {
  const { dispatch, username } = useContext(KanbanContext);
  const [text, setText] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const res = await fetch("http://localhost:3001/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, text }),
    });

    if (res.ok) {
      const newTaskId = await res.text();
      dispatch({ type: "ADD_TASK", payload: { newTask: { id: newTaskId, text } } });
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <input
        type="text"
        className="task-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add new task"
      />
      <button type="submit" className="add-btn">Add</button>
    </form>
  );
}

// ✅ Card
function Card({ card, from, setShareModelData }) {
  const {
    dispatch,
    draggedCardId,
    setDraggedCardId,
    hoverTargetId,
    setHoverTargetId,
  } = useContext(KanbanContext);

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(card.text);
  const inputRef = useRef(null);

  const handleDragStart = (e) => {
    if (!isEditing) {
      setDraggedCardId(card.id);
      e.dataTransfer.setData("card", JSON.stringify({ card, from }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (draggedCardId !== card.id) setHoverTargetId(card.id);
  };

  const handleDragLeave = () => {
    if (hoverTargetId !== card.id) setHoverTargetId(null);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleEditSubmit = async () => {
    const trimmed = editedText.trim();
    if (trimmed && trimmed !== card.text) {
      await fetch(`http://localhost:3001/tasks/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, status: from }),
      });
      dispatch({ type: "EDIT_CARD", payload: { cardId: card.id, from, newText: trimmed } });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleEditSubmit();
    else if (e.key === "Escape") {
      setEditedText(card.text);
      setIsEditing(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("card"));
    await fetch(`http://localhost:3001/tasks/${data.card.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: data.card.text, status: from }),
    });
    dispatch({ type: "MOVE_CARD", payload: { card: data.card, from: data.from, to: from, targetId: card.id } });
    setDraggedCardId(null);
    setHoverTargetId(null);
  };

  return (
    <div
      className={`card ${hoverTargetId === card.id ? "drop-indicator" : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isEditing ? (
        <input
          type="text"
          ref={inputRef}
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onBlur={handleEditSubmit}
          onKeyDown={handleKeyDown}
          className="edit-input"
        />
      ) : (
        <div className="card-content">
          <span>{card.text}</span>
          <button className="share-btn" onClick={() => setShareModelData({ card, from })}>
            🔗
          </button>
        </div>
      )}
    </div>
  );
}

// ✅ Column
function Column({ title, columnKey, className, setShareModelData }) {
  const { state, dispatch, setHoverTargetId, setDraggedCardId } = useContext(KanbanContext);
  const dropRef = useRef(null);

  useEffect(() => {
    const handleDrop = async (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("card"));
      await fetch(`http://localhost:3001/tasks/${data.card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.card.text, status: columnKey }),
      });
      dispatch({ type: "MOVE_CARD", payload: { card: data.card, from: data.from, to: columnKey } });
      setHoverTargetId(null);
      setDraggedCardId(null);
    };

    dropRef.current.addEventListener("dragover", (e) => e.preventDefault());
    dropRef.current.addEventListener("drop", handleDrop);
    return () => dropRef.current?.removeEventListener("drop", handleDrop);
  }, [dispatch, columnKey]);

  return (
    <div className={`column ${className}`} ref={dropRef}>
      <h2>{title}</h2>
      {state[columnKey].map((card) => (
        <Card key={card.id} card={card} from={columnKey} setShareModelData={setShareModelData} />
      ))}
    </div>
  );
}

// ✅ Trash
function TrashDropZone({ onCardDrop }) {
  const dropRef = useRef(null);
  useEffect(() => {
    const handleDrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("card"));
      onCardDrop({ card: data.card, from: data.from });
    };
    dropRef.current.addEventListener("dragover", (e) => e.preventDefault());
    dropRef.current.addEventListener("drop", handleDrop);
    return () => dropRef.current?.removeEventListener("drop", handleDrop);
  }, [onCardDrop]);

  return <div className="trash-drop-zone" ref={dropRef}><h2>🗑️ DUST BIN</h2></div>;
}

// ✅ Kanban Board
function KanbanBoard() {
  const { dispatch } = useContext(KanbanContext);
  const [modelData, setModelData] = useState(null);
  const [shareModelData, setShareModelData] = useState(null);
  const [shareMessage, setShareMessage] = useState("");

  const handleConfirmDelete = async () => {
    if (modelData) {
      await fetch(`http://localhost:3001/tasks/${modelData.card.id}`, { method: "DELETE" });
      dispatch({ type: "DELETE_TASK", payload: { cardId: modelData.card.id, from: modelData.from } });
      setModelData(null);
    }
  };

  const showShareMessage = (msg) => {
    setShareMessage(msg);
    setTimeout(() => setShareMessage(""), 3000);
  };

  return (
    <div className="board-container">
      <TaskInput />
      <div className="board">
        <Column title="📝 To-Do" columnKey="todo" className="column-red" setShareModelData={setShareModelData} />
        <Column title="⏳ In Progress" columnKey="inProgress" className="column-yellow" setShareModelData={setShareModelData} />
        <Column title="✅ Done" columnKey="done" className="column-green" setShareModelData={setShareModelData} />
        <TrashDropZone onCardDrop={setModelData} />
      </div>

      {modelData && (
        <div className="model-overlay">
          <div className="model">
            <p>Are you sure you want to delete: <strong>{modelData.card.text}</strong>?</p>
            <div className="model-buttons">
              <button className="delete-btn" onClick={handleConfirmDelete}>Yes, Delete</button>
              <button className="cancel-btn" onClick={() => setModelData(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {shareModelData && (
        <div className="model-overlay">
          <div className="model">
            <p>Share this task: <strong>{shareModelData.card.text}</strong><br />with username:</p>
            <input
              type="text"
              placeholder="Enter username"
              value={shareModelData.toUsername || ""}
              onChange={(e) => setShareModelData({ ...shareModelData, toUsername: e.target.value })}
              style={{ padding: "8px", marginTop: "10px", borderRadius: "4px", width: "100%" }}
            />
            <div className="model-buttons">
              <button
                className="delete-btn"
                onClick={async () => {
                  if (shareModelData.toUsername) {
                    const res = await fetch(
                      `http://localhost:3001/tasks/${shareModelData.card.id}/share`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ toUsername: shareModelData.toUsername }),
                      }
                    );
                    if (res.ok) showShareMessage("✅ Task shared successfully!");
                    else showShareMessage("❌ " + (await res.text()));
                    setShareModelData(null);
                  }
                }}
              >
                Share
              </button>
              <button className="cancel-btn" onClick={() => setShareModelData(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {shareMessage && <div className="share-toast">{shareMessage}</div>}
    </div>
  );
}

// ✅ Wrapper
function KanbanBoardWrapper({ username }) {
  return (
    <KanbanProvider username={username}>
      <KanbanBoard />
    </KanbanProvider>
  );
}

export default KanbanBoardWrapper;
