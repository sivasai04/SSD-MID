import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuthContext } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token } = useAuthContext();
  const socketRef = useRef(null);

  useEffect(() => {
    if (token) {
      // adjust URL to your backend server
      socketRef.current = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
        auth: { token }
      });

      socketRef.current.on("connect", () => {
        console.log("socket connected:", socketRef.current.id);
      });

      socketRef.current.on("disconnect", () => {
        console.log("socket disconnected");
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [token]);

  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
