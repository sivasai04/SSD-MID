import axios from "./axiosInstance";

export const postReply = async (sessionId, questionId, text, parentReplyId = null) => {
  const resp = await axios.post(`/replies/${sessionId}/${questionId}`, { text, parentReplyId });
  return resp.data;
};
