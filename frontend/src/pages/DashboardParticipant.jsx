import React, { useEffect, useState } from "react";
import { getMySessions } from "../api/sessionApi";
import { useAuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function DashboardParticipant() {
  const { user, logout } = useAuthContext();
  const [sessions, setSessions] = useState([]);

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

  return (
    <div style={{padding:20}}>
      <header style={{display:"flex", justifyContent:"space-between"}}>
        <div>
          <h2>Participant Dashboard</h2>
          <div>{user?.name} ({user?.id})</div>
        </div>
        <div>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <section style={{marginTop:20}}>
        <h3>Your sessions (enrolled courses / TAs)</h3>
        {sessions.length === 0 && <div>No sessions available</div>}
        <ul>
          {sessions.map(s => (
            <li key={s.sessionId} style={{marginBottom:8}}>
              <strong>{s.courseName}</strong> — {s.status} — {new Date(s.startAt).toLocaleString()}
              {"  "}
              <Link to={`/session/${s.sessionId}`}>Open</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
