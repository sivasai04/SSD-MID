///////////////////////////-------------------------updated code--------------------////////////////////////
// // src/pages/DashboardParticipant.jsx
// import React, { useEffect, useState } from "react";
// import { getMySessions } from "../api/sessionApi";
// import { useAuthContext } from "../context/AuthContext";
// import { Link } from "react-router-dom";
// import "./Dashboard.css"; // Import the shared CSS

// export default function DashboardParticipant() {
//   const { user, logout } = useAuthContext();
//   const [sessions, setSessions] = useState([]);

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

//   return (
//     <div className="dashboard-container">
//       <header className="dashboard-header">
//         <div className="user-info">
//           <h2>Stundent Dashboard</h2>
//           <span>{user?.name} ({user?.id})</span>
//         </div>
//         <button onClick={logout} className="logout-btn">Logout</button>
//       </header>

//       <main className="dashboard-content">
//         <section className="session-list-section">
//           <h3>Your Sessions</h3>
//           {sessions.length === 0 ? (
//             <p>No sessions available</p>
//           ) : (
//             <ul className="session-list">
//               {sessions.map(s => (
//                 <li key={s.sessionId} className="session-item">
//                   <div className="session-details">
//                     <span className="session-course">{s.courseName}</span>
//                     <span className={`session-status status-${s.status.toLowerCase()}`}>{s.status}</span>
//                     <span className="session-time">{new Date(s.startAt).toLocaleString()}</span>
//                   </div>
//                   <div className="session-actions">
//                     <Link to={`/session/${s.sessionId}`} className="btn-primary">Open</Link>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </section>
//       </main>
//     </div>
//   );
// }









////////////////////////////////------------------- newly updated code -----------------//////////////////////

// src/pages/DashboardParticipant.jsx
import React, { useEffect, useState, useMemo } from "react";
import { getMySessions } from "../api/sessionApi";
import { useAuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "./Dashboard.css"; // Uses the same shared CSS file

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

  // --- NEW: Separate live sessions from others ---
  const liveSessions = useMemo(() => sessions.filter(s => s.status === "live"), [sessions]);
  const otherSessions = useMemo(() => sessions.filter(s => s.status !== "live"), [sessions]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <h2>Student Dashboard</h2>
          <span>{user?.name} ({user?.id})</span>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <main className="dashboard-content">
        
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
                  <Link to={`/session/${s.sessionId}`} className="btn-primary">Join Now</Link>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* --- NEW: Grid of sticky notes for other sessions --- */}
        <section className="session-list-section">
          <h3>Your Other Sessions</h3>
          {otherSessions.length === 0 && liveSessions.length === 0 ? (
            <p>No sessions available</p>
          ) : otherSessions.length === 0 ? (
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


//////////////--------------------- newly updated code---------------//////////////////////