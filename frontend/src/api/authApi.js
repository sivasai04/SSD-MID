import axios from "./axiosInstance";

export const login = async (email, password) => {
  const resp = await axios.post("/auth/login", { email, password });
  return resp.data;
};
