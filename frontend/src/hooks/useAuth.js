import { useContext } from "react";
import { useAuthContext } from "../context/AuthContext";

export const useAuth = () => {
  const ctx = useAuthContext();
  return ctx;
};

export default useAuth;
