import axios from "./axiosInstance";

export const getMySessions = async () => {
  const resp = await axios.get("/sessions");
  return resp.data;
};

export const createSession = async (body) => {
  const resp = await axios.post("/sessions", body);
  return resp.data;
};

export const endSession = async (sessionId) => {
  const resp = await axios.patch(`/sessions/${sessionId}/end`);
  return resp.data;
};
