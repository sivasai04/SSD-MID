import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { postQuestion, markAnswered } from "../api/questionApi";
import { postReply } from "../api/replyApi";
import { markSeen } from "../api/updateApi";
import axios from "../api/axiosInstance";

function fetchSession(sessionId) {
  return axios.get(`/sessions?sessionId=${sessionId}`).then(r => r.data[0]);
}

// utility: reorganize replies into nested tree
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
  const socket = useSocket();
  const { user } = useAuthContext();
  const [session, setSession] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(null); // for replies
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    (async () => {
      // fetch session by sessionId
      const s = await fetchSession(sessionId);
      setSession(s || null);
      // mark seen
      await markSeen(sessionId);
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

  if (!session) return <div style={{padding:20}}>Loading session...</div>;

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

  return (
    <div style={{padding:20}}>
      <header>
        <h2>{session.courseName} — Session</h2>
        <div>Status: {session.status}</div>
      </header>

      <section style={{marginTop:12}}>
        {canPostQuestion && (
          <div style={{marginBottom:12}}>
            <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3} style={{width:"100%"}} />
            <button onClick={handlePostQuestion}>Post Question</button>
          </div>
        )}

        <div>
          <h3>Questions</h3>
          {session.questions.length === 0 && <div>No questions</div>}
          {session.questions.map(q => (
            <div key={q.questionId} style={{border:"1px solid #ddd", padding:8, marginBottom:8}}>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <div>
                  <strong>{q.text}</strong>
                  <div style={{fontSize:12, color:"#555"}}>By {q.author.name} — {q.status}</div>
                </div>
                <div>
                  {isInstructor && (session.status === "live" || session.status === "completed") && q.status === "unanswered" && (
                    <button onClick={() => handleMarkAnswered(q.questionId)}>Mark Answered</button>
                  )}
                </div>
              </div>

              <div style={{marginTop:8}}>
                <ReplyThread replies={buildReplyTree(q.replies)} />
              </div>

              <div style={{marginTop:8}}>
                {canReplyNow && (
                  <>
                    <input placeholder="Write reply/clarification..." value={selectedQuestion === q.questionId ? replyText : ""} onChange={e => { setSelectedQuestion(q.questionId); setReplyText(e.target.value); }} style={{width:"70%"}} />
                    <button onClick={() => handlePostReply(q.questionId)}>Reply</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// simple recursive reply component:
function ReplyThread({ replies }) {
  if (!replies || replies.length === 0) return null;
  return (
    <ul style={{listStyle:"none", paddingLeft:0}}>
      {replies.map(r => (
        <li key={r.replyId} style={{marginBottom:6}}>
          <div style={{fontSize:13}}><strong>{r.author.name}</strong>: {r.text} <span style={{fontSize:11, color:"#666"}}>({new Date(r.createdAt).toLocaleString()})</span></div>
          <div style={{marginLeft:12}}>
            <ReplyThread replies={r.children} />
          </div>
        </li>
      ))}
    </ul>
  );
}
