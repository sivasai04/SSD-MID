import axios from "./axiosInstance";

export const postQuestion = async (sessionId, text) => {
  const resp = await axios.post(`/questions/${sessionId}`, { text });
  return resp.data;
};

export const markAnswered = async (sessionId, questionId) => {
  const resp = await axios.patch(`/questions/${sessionId}/${questionId}/answered`);
  return resp.data;
};
