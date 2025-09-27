import axios from "./axiosInstance";

export const markSeen = async (sessionId) => {
  const resp = await axios.post(`/updates/${sessionId}/seen`);
  return resp.data;
};

export const getUpdates = async (sessionId) => {
  const resp = await axios.get(`/updates/${sessionId}`);
  return resp.data;
};
