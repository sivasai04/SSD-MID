import React, { useEffect, useState } from "react";
import { getMySessions, createSession, endSession } from "../api/sessionApi";
import { useAuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function DashboardInstructor() {
  const { user, logout } = useAuthContext();
  const [sessions, setSessions] = useState([]);
  const [courseName, setCourseName] = useState(user?.courses?.[0]?.courseName || "");

  useEffect(() => {
    (async () => {
      try {
        const data = await getMySessions();
        setSessions(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!courseName) return alert("Course name required");
    const s = await createSession({ courseName });
    setSessions(prev => [s, ...prev]);
  };

  const handleEnd = async (sessionId) => {
    await endSession(sessionId);
    setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, status: "completed" } : s));
  };

  return (
    <div style={{padding:20}}>
      <header style={{display:"flex", justifyContent:"space-between"}}>
        <div>
          <h2>Instructor Dashboard</h2>
          <div>{user?.name} ({user?.id})</div>
        </div>
        <div>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <section style={{marginTop:20}}>
        <h3>Create Session</h3>
        <div>
          <label>Course Name</label><br />
          <input value={courseName} onChange={e => setCourseName(e.target.value)} />
          <button onClick={handleCreate} style={{marginLeft:8}}>Create</button>
        </div>
      </section>

      <section style={{marginTop:20}}>
        <h3>Your sessions</h3>
        <ul>
          {sessions.map(s => (
            <li key={s.sessionId} style={{marginBottom:8}}>
              <strong>{s.courseName}</strong> — {s.status} — {new Date(s.startAt).toLocaleString()}
              {"  "}
              <Link to={`/session/${s.sessionId}`}>Open</Link>
              {"  "}
              {s.status === "live" && <button onClick={() => handleEnd(s.sessionId)}>End</button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
