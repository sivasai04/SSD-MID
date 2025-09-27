
// // src/pages/DashboardInstructor.jsx
// import React, { useEffect, useState } from "react";
// import { getMySessions, createSession, endSession } from "../api/sessionApi";
// import { useAuthContext } from "../context/AuthContext";
// import { Link } from "react-router-dom";
// import "./Dashboard.css"; // Import the shared CSS

// export default function DashboardInstructor() {
//   const { user, logout } = useAuthContext();
//   const [sessions, setSessions] = useState([]);
//   const [courseName, setCourseName] = useState(user?.courses?.[0]?.courseName || "");

//   useEffect(() => {
//     (async () => {
//       try {
//         const data = await getMySessions();
//         setSessions(data);
//       } catch (e) {
//         console.error(e);
//       }
//     })();
//   }, []);

//   const handleCreate = async () => {
//     if (!courseName) return alert("Course name required");
//     const s = await createSession({ courseName });
//     setSessions(prev => [s, ...prev]);
//   };

//   const handleEnd = async (sessionId) => {
//     await endSession(sessionId);
//     setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, status: "completed" } : s));
//   };

//   return (
//     <div className="dashboard-container">
//       <header className="dashboard-header">
//         <div className="user-info">
//           <h2>Instructor Dashboard</h2>
//           <span>{user?.name} ({user?.id})</span>
//         </div>
//         <button onClick={logout} className="logout-btn">Logout</button>
//       </header>

//       <main className="dashboard-content">
//         <section className="create-session-section">
//           <h3>Create Session</h3>
//           <div className="create-session-form">
//             <input
//               type="text"
//               placeholder="Course Name"
//               value={courseName}
//               onChange={e => setCourseName(e.target.value)}
//             />
//             <button onClick={handleCreate} className="btn-primary">Create</button>
//           </div>
//         </section>

//         <section className="session-list-section">
//           <h3>Your Sessions</h3>
//           <ul className="session-list">
//             {sessions.map(s => (
//               <li key={s.sessionId} className="session-item">
//                 <div className="session-details">
//                   <span className="session-course">{s.courseName}</span>
//                   <span className={`session-status status-${s.status.toLowerCase()}`}>{s.status}</span>
//                   <span className="session-time">{new Date(s.startAt).toLocaleString()}</span>
//                 </div>
//                 <div className="session-actions">
//                   <Link to={`/session/${s.sessionId}`} className="btn-secondary">Open</Link>
//                   {s.status === "live" && <button onClick={() => handleEnd(s.sessionId)} className="btn-danger">End</button>}
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </section>
//       </main>
//     </div>
//   );
// }






///...............................new code

// src/pages/DashboardInstructor.jsx
import React, { useEffect, useState, useMemo } from "react";
import { getMySessions, createSession, endSession } from "../api/sessionApi";
import { useAuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "./Dashboard.css"; // Using the same stylesheet

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

  // --- NEW: Separate live sessions from others using useMemo for efficiency ---
  const liveSessions = useMemo(() => sessions.filter(s => s.status === "live"), [sessions]);
  const otherSessions = useMemo(() => sessions.filter(s => s.status !== "live"), [sessions]);

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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <h2>Instructor Dashboard</h2>
          <span>{user?.name} ({user?.id})</span>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <main className="dashboard-content">
        <section className="create-session-section">
          <h3>Create New Session</h3>
          <div className="create-session-form">
            <input
              type="text"
              placeholder="Course Name"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
            />
            <button onClick={handleCreate} className="btn-primary">Create</button>
          </div>
        </section>

        {/* --- NEW: Highlighted section for Live Sessions --- */}
        {liveSessions.length > 0 && (
          <section className="live-session-highlight">
            <h3>🔴 Live Session In Progress</h3>
            {liveSessions.map(s => (
              <div key={s.sessionId} className="live-session-item">
                <div className="session-details">
                  <span className="session-course">{s.courseName}</span>
                  <span className="session-time">Started: {new Date(s.startAt).toLocaleString()}</span>
                </div>
                <div className="session-actions">
                  <Link to={`/session/${s.sessionId}`} className="btn-primary">Manage Session</Link>
                  <button onClick={() => handleEnd(s.sessionId)} className="btn-danger">End</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* --- NEW: Grid of sticky notes for other sessions --- */}
        <section className="session-list-section">
          <h3>Past & Scheduled Sessions</h3>
          {otherSessions.length === 0 ? (
            <p>No other sessions found.</p>
          ) : (
            <div className="session-grid">
              {otherSessions.map(s => (
                <div key={s.sessionId} className="session-note">
                  <div className="session-details">
                    <span className="session-course">{s.courseName}</span>
                    <span className={`session-status status-${s.status.toLowerCase()}`}>{s.status}</span>
                    <span className="session-time">{new Date(s.startAt).toLocaleString()}</span>
                  </div>
                  <div className="session-actions">
                    <Link to={`/session/${s.sessionId}`} className="btn-secondary">View Details</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

///..........................new code