// import React, { useState } from "react";
// import { useAuthContext } from "../context/AuthContext";

// export default function Login() {
//   const { login, loading } = useAuthContext();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [err, setErr] = useState("");

//   const submit = async (e) => {
//     e.preventDefault();
//     setErr("");
//     const resp = await login(email, password);
//     if (!resp.success) setErr(resp.message || "Login failed");
//   };

//   return (
//     <div className="container" style={{padding:20}}>
//       <h2>VidyaVichar — Login</h2>
//       <form onSubmit={submit} style={{maxWidth:400}}>
//         <div>
//           <label>Email</label><br />
//           <input value={email} onChange={e => setEmail(e.target.value)} required />
//         </div>
//         <div style={{marginTop:8}}>
//           <label>Password</label><br />
//           <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
//         </div>
//         {err && <div style={{color:"red", marginTop:8}}>{err}</div>}
//         <button type="submit" disabled={loading} style={{marginTop:12}}>
//           {loading ? "Logging in..." : "Login"}
//         </button>
//       </form>
//       <p style={{marginTop:12}}>
//         Note: No registration. Use seeded participants.
//       </p>
//     </div>
//   );
// }


// src/pages/Login.jsx
import React, { useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import "./Login.css"; // Import the new CSS file

export default function Login() {
  const { login, loading } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const resp = await login(email, password);
    if (!resp.success) setErr(resp.message || "Login failed");
  };

  return (
    <main className="login-container">
      <div className="login-card">
        <h2>VidyaVichar — Login</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <div className="error-message">{err}</div>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="login-note">
          Note: No registration. Use seeded participants.
        </p>
      </div>
    </main>
  );
}