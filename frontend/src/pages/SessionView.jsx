// // src/pages/SessionView.jsx
// import React, { useEffect, useState, useMemo } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useAuthContext } from "../context/AuthContext";
// import { useSocket } from "../context/SocketContext";
// import { postQuestion, markAnswered } from "../api/questionApi";
// import { endSession } from "../api/sessionApi";
// import { postReply } from "../api/replyApi";
// import { markSeen } from "../api/updateApi";
// import axios from "../api/axiosInstance";
// import "./SessionView.css";

// function fetchSession(sessionId) {
//   return axios.get(`/sessions?sessionId=${sessionId}`).then(r => r.data[0]);
// }

// function buildReplyTree(replies) {
//   const map = {};
//   const roots = [];
//   replies.forEach(r => (map[r.replyId] = { ...r, children: [] }));
//   replies.forEach(r => {
//     if (r.parentReplyId) {
//       const parent = map[r.parentReplyId];
//       if (parent) parent.children.push(map[r.replyId]);
//       else roots.push(map[r.replyId]);
//     } else roots.push(map[r.replyId]);
//   });
//   return roots;
// }

// export default function SessionView() {
//   const { sessionId } = useParams();
//   const navigate = useNavigate();
//   const socket = useSocket();
//   const { user } = useAuthContext();
//   const [session, setSession] = useState(null);
//   const [questionText, setQuestionText] = useState("");
//   const [selectedQuestion, setSelectedQuestion] = useState(null);
//   const [replyText, setReplyText] = useState("");
//   const [filter, setFilter] = useState("unanswered"); // Default to unanswered

//   useEffect(() => {
//     (async () => {
//       const s = await fetchSession(sessionId);
//       setSession(s || null);
//       await markSeen(sessionId);
//     })();
//   }, [sessionId]);

//   useEffect(() => {
//     if (!socket || !sessionId) return;
//     socket.emit("joinSession", sessionId);

//     socket.on("question:created", (q) => {
//       setSession(prev => prev ? { ...prev, questions: [...prev.questions, q] } : prev);
//     });

//     socket.on("reply:created", ({ questionId, reply }) => {
//       setSession(prev => {
//         if (!prev) return prev;
//         const qs = prev.questions.map(q => q.questionId === questionId ? { ...q, replies: [...q.replies, reply], updatedAt: new Date().toISOString() } : q);
//         return { ...prev, questions: qs };
//       });
//     });

//     socket.on("question:answered", ({ questionId }) => {
//       setSession(prev => {
//         if (!prev) return prev;
//         const qs = prev.questions.map(q => q.questionId === questionId ? { ...q, status: "answered", updatedAt: new Date().toISOString() } : q);
//         return { ...prev, questions: qs };
//       });
//     });

//     return () => {
//       socket.emit("leaveSession", sessionId);
//       socket.off("question:created");
//       socket.off("reply:created");
//       socket.off("question:answered");
//     };
//   }, [socket, sessionId]);

//   const filteredQuestions = useMemo(() => {
//     if (!session?.questions) return [];
    
//     const sorted = [...session.questions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

//     if (filter === "unanswered") {
//       return sorted.filter(q => q.status === "unanswered");
//     }
//     if (filter === "answered") {
//       return sorted.filter(q => q.status === "answered");
//     }
//     return sorted; // "all"
//   }, [session?.questions, filter]);

//   if (!session) return <div className="loading-container">Loading session...</div>;

//   const isInstructor = user.role === "instructor" && user.courses.some(c => c.courseName === session.courseName && c.isInstructor);
//   const isTA = user.courses.some(c => c.courseName === session.courseName && c.isTA);
//   const isEnrolled = user.courses.some(c => c.courseName === session.courseName && c.enrolled);
//   const canPostQuestion = session.status === "live" && user.role === "student" && isEnrolled;
//   const canReplyNow = session.status === "live" ? isInstructor : (isInstructor || isTA);

//   const handlePostQuestion = async () => {
//     if (!questionText.trim()) return;
//     try {
//       await postQuestion(sessionId, questionText);
//       setQuestionText("");
//     } catch (e) {
//       alert(e.response?.data?.message || e.message);
//     }
//   };

//   const handlePostReply = async (qId, parentId = null) => {
//     if (!replyText.trim()) return;
//     try {
//       await postReply(sessionId, qId, replyText, parentId);
//       setReplyText("");
//       setSelectedQuestion(null);
//     } catch (e) {
//       alert(e.response?.data?.message || e.message);
//     }
//   };

//   const handleMarkAnswered = async (qId) => {
//     try {
//       await markAnswered(sessionId, qId);
//     } catch (e) {
//       alert(e.response?.data?.message || e.message);
//     }
//   };

//   const handleEndSession = async () => {
//     if (window.confirm("Are you sure you want to end this session?")) {
//       try {
//         await endSession(sessionId);
//         setSession(prev => ({ ...prev, status: "completed" }));
//         navigate("/instructor");
//       } catch (e) {
//         alert(e.response?.data?.message || e.message);
//       }
//     }
//   };

//   return (
//     <div className="session-container">
//       <header className="session-header">
//         <div className="session-header-info">
//           <h1>{session.courseName} — Session</h1>
//           <span className={`session-status status-${session.status.toLowerCase()}`}>{session.status}</span>
//         </div>
//         {isInstructor && session.status === "live" && (
//           <button onClick={handleEndSession} className="btn-danger">
//             End Session
//           </button>
//         )}
//       </header>

//       <main>
//         {canPostQuestion && (
//           <section className="post-question-section">
//             <textarea
//               value={questionText}
//               onChange={e => setQuestionText(e.target.value)}
//               rows={4}
//               placeholder="Ask a question..."
//             />
//             <button onClick={handlePostQuestion} className="btn-primary">Post Question</button>
//           </section>
//         )}

//         <section className="questions-list-section">
//           <div className="questions-header-controls">
//             <h2>Questions</h2>
//             <div className="filter-controls">
//               <button 
//                 className={`filter-btn ${filter === 'unanswered' ? 'active' : ''}`} 
//                 onClick={() => setFilter('unanswered')}>
//                   Unanswered
//               </button>
//               <button 
//                 className={`filter-btn ${filter === 'answered' ? 'active' : ''}`}
//                 onClick={() => setFilter('answered')}>
//                   Answered
//               </button>
//               <button 
//                 className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
//                 onClick={() => setFilter('all')}>
//                   All
//               </button>
//             </div>
//           </div>
          
//           {filteredQuestions.length === 0 && <p>No questions in this category.</p>}
          
//           <div className="questions-grid">
//             {filteredQuestions.map(q => (
//               <div key={q.questionId} className="question-card">
//                 <div className="question-header">
//                   <div className="question-main">
//                     <p className="question-text">{q.text}</p>
//                     <small className="question-meta">
//                       By {q.author.name} — <span className={`question-status status-${q.status}`}>{q.status}</span>
//                     </small>
//                   </div>
//                   {isInstructor && q.status === "unanswered" && (
//                     <button onClick={() => handleMarkAnswered(q.questionId)} className="btn-success">
//                       Mark Answered
//                     </button>
//                   )}
//                 </div>

//                 <div className="replies-section">
//                   <ReplyThread replies={buildReplyTree(q.replies)} />
//                 </div>

//                 {canReplyNow && (
//                   <div className="reply-form">
//                     <input
//                       type="text"
//                       placeholder="Write a reply or clarification..."
//                       value={selectedQuestion === q.questionId ? replyText : ""}
//                       onChange={e => {
//                         setSelectedQuestion(q.questionId);
//                         setReplyText(e.target.value);
//                       }}
//                     />
//                     <button onClick={() => handlePostReply(q.questionId)} className="btn-secondary">
//                       Reply
//                     </button>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// }

// function ReplyThread({ replies }) {
//   if (!replies || replies.length === 0) return null;
//   return (
//     <ul className="reply-thread">
//       {replies.map(r => (
//         <li key={r.replyId} className="reply-item">
//           <p className="reply-text">
//             <strong>{r.author.name}</strong>: {r.text}
//           </p>
//           <small className="reply-meta">
//             {new Date(r.createdAt).toLocaleString()}
//           </small>
//           <ReplyThread replies={r.children} />
//         </li>
//       ))}
//     </ul>
//   );
// }

///////////////////////////////////////////....................................updated code..........................................................////////////////////////////
// src/pages/SessionView.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { postQuestion, markAnswered } from "../api/questionApi";
import { endSession } from "../api/sessionApi";
import { postReply } from "../api/replyApi";
import { markSeen } from "../api/updateApi";
import axios from "../api/axiosInstance";
import "./SessionView.css";

function fetchSession(sessionId) {
  return axios.get(`/sessions?sessionId=${sessionId}`).then(r => r.data[0]);
}

function buildReplyTree(replies) {
  const map = {};
  const roots = [];
  replies.forEach(r => (map[r.replyId] = { ...r, children: [] }));
  replies.forEach(r => {
    if (r.parentReplyId) {
      const parent = map[r.parentReplyId];
      if (parent) parent.children.push(map[r.replyId]);
      else roots.push(map[r.replyId]);
    } else roots.push(map[r.replyId]);
  });
  return roots;
}

export default function SessionView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuthContext();
  const [session, setSession] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState("unanswered");

  useEffect(() => {
    (async () => {
      const s = await fetchSession(sessionId);
      setSession(s || null);
      if (s) {
        await markSeen(s.sessionId);
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    socket.emit("joinSession", sessionId);

    socket.on("question:created", (q) => {
      setSession(prev => prev ? { ...prev, questions: [...prev.questions, q] } : prev);
    });

    socket.on("reply:created", ({ questionId, reply }) => {
      setSession(prev => {
        if (!prev) return prev;
        const qs = prev.questions.map(q => q.questionId === questionId ? { ...q, replies: [...q.replies, reply], updatedAt: new Date().toISOString() } : q);
        return { ...prev, questions: qs };
      });
    });

    socket.on("question:answered", ({ questionId }) => {
      setSession(prev => {
        if (!prev) return prev;
        const qs = prev.questions.map(q => q.questionId === questionId ? { ...q, status: "answered", updatedAt: new Date().toISOString() } : q);
        return { ...prev, questions: qs };
      });
    });

    return () => {
      socket.emit("leaveSession", sessionId);
      socket.off("question:created");
      socket.off("reply:created");
      socket.off("question:answered");
    };
  }, [socket, sessionId]);

  const filteredQuestions = useMemo(() => {
    if (!session?.questions) return [];
    
    const sorted = [...session.questions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (filter === "unanswered") {
      return sorted.filter(q => q.status === "unanswered");
    }
    if (filter === "answered") {
      return sorted.filter(q => q.status === "answered");
    }
    return sorted; // "all"
  }, [session?.questions, filter]);

  if (!session) return <div className="loading-container">Loading session...</div>;

  const isInstructor = user.role === "instructor" && user.courses.some(c => c.courseName === session.courseName && c.isInstructor);
  const isTA = user.courses.some(c => c.courseName === session.courseName && c.isTA);
  const isEnrolled = user.courses.some(c => c.courseName === session.courseName && c.enrolled);
  const canPostQuestion = session.status === "live" && user.role === "student" && isEnrolled;
  const canReplyNow = session.status === "live" ? isInstructor : (isInstructor || isTA);

  const handlePostQuestion = async () => {
    if (!questionText.trim()) return;
    try {
      await postQuestion(sessionId, questionText);
      setQuestionText("");
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handlePostReply = async (qId, parentId = null) => {
    if (!replyText.trim()) return;
    try {
      await postReply(sessionId, qId, replyText, parentId);
      setReplyText("");
      setSelectedQuestion(null);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleMarkAnswered = async (qId) => {
    try {
      await markAnswered(sessionId, qId);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleEndSession = async () => {
    if (window.confirm("Are you sure you want to end this session?")) {
      try {
        await endSession(sessionId);
        setSession(prev => ({ ...prev, status: "completed" }));
        navigate("/instructor");
      } catch (e) {
        alert(e.response?.data?.message || e.message);
      }
    }
  };

  return (
    <div className="session-container">
      <header className="session-header">
        <div className="header-left">
          <Link to={isInstructor ? "/instructor" : "/dashboard"} className="back-link">
            &larr; Back to Dashboard
          </Link>
          <div className="session-header-info">
            <h1>{session.courseName} — Session</h1>
            <span className={`session-status status-${session.status.toLowerCase()}`}>{session.status}</span>
          </div>
        </div>
        {isInstructor && session.status === "live" && (
          <button onClick={handleEndSession} className="btn-danger">
            End Session
          </button>
        )}
      </header>

      <main>
        {canPostQuestion && (
          <section className="post-question-section">
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={4}
              placeholder="Ask a question..."
            />
            <button onClick={handlePostQuestion} className="btn-primary">Post Question</button>
          </section>
        )}

        <section className="questions-list-section">
          <div className="questions-header-controls">
            <h2>Questions</h2>
            <div className="filter-controls">
              <button 
                className={`filter-btn ${filter === 'unanswered' ? 'active' : ''}`} 
                onClick={() => setFilter('unanswered')}>
                  Unanswered
              </button>
              <button 
                className={`filter-btn ${filter === 'answered' ? 'active' : ''}`}
                onClick={() => setFilter('answered')}>
                  Answered
              </button>
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}>
                  All
              </button>
            </div>
          </div>
          
          {filteredQuestions.length === 0 && <p>No questions in this category.</p>}
          
          <div className="questions-grid">
            {filteredQuestions.map(q => (
              <div key={q.questionId} className="question-card">
                <div className="question-header">
                  <div className="question-main">
                    <p className="question-text">{q.text}</p>
                    <small className="question-meta">
                      By {q.author.name} — <span className={`question-status status-${q.status}`}>{q.status}</span>
                    </small>
                  </div>
                  {isInstructor && q.status === "unanswered" && (
                    <button onClick={() => handleMarkAnswered(q.questionId)} className="btn-success">
                      Mark Answered
                    </button>
                  )}
                </div>

                <div className="replies-section">
                  <ReplyThread replies={buildReplyTree(q.replies)} />
                </div>

                {canReplyNow && (
                  <div className="reply-form">
                    <input
                      type="text"
                      placeholder="Write a reply or clarification..."
                      value={selectedQuestion === q.questionId ? replyText : ""}
                      onChange={e => {
                        setSelectedQuestion(q.questionId);
                        setReplyText(e.target.value);
                      }}
                    />
                    <button onClick={() => handlePostReply(q.questionId)} className="btn-secondary">
                      Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ReplyThread({ replies }) {
  if (!replies || replies.length === 0) return null;
  return (
    <ul className="reply-thread">
      {replies.map(r => (
        <li key={r.replyId} className="reply-item">
          <p className="reply-text">
            <strong>{r.author.name}</strong>: {r.text}
          </p>
          <small className="reply-meta">
            {new Date(r.createdAt).toLocaleString()}
          </small>
          <ReplyThread replies={r.children} />
        </li>
      ))}
    </ul>
  );
}


