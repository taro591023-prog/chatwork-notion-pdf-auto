import axios from "axios";

const CHATWORK_BASE_URL = "https://api.chatwork.com/v2";

export function getWebhookEvent(payload) {
  return payload.webhook_event || payload.event || payload;
}

export function getRoomAndMessageId(payload) {
  const event = getWebhookEvent(payload);
  return {
    roomId: String(event.room_id || event.roomId || ""),
    messageId: String(event.message_id || event.messageId || "")
  };
}

export function extractDownloadFileIds(messageBody) {
  const ids = new Set();
  const patterns = [
    /\[download:(\d+)\][\s\S]*?\[\/download\]/g,
    /file_id[=:](\d+)/g
  ];

  for (const pattern of patterns) {
    for (const match of messageBody.matchAll(pattern)) {
      ids.add(match[1]);
    }
  }

  return [...ids];
}

export async function fetchMessage({ apiToken, roomId, messageId }) {
  const response = await axios.get(`${CHATWORK_BASE_URL}/rooms/${roomId}/messages/${messageId}`, {
    headers: { "X-ChatWorkToken": apiToken }
  });
  return response.data;
}

export async function fetchFileInfo({ apiToken, roomId, fileId }) {
  const response = await axios.get(`${CHATWORK_BASE_URL}/rooms/${roomId}/files/${fileId}`, {
    headers: { "X-ChatWorkToken": apiToken },
    params: { create_download_url: 1 }
  });
  return response.data;
}

export async function downloadFile(downloadUrl) {
  const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

export async function postMessage({ apiToken, roomId, body }) {
  const form = new URLSearchParams({ body });
  const response = await axios.post(`${CHATWORK_BASE_URL}/rooms/${roomId}/messages`, form, {
    headers: {
      "X-ChatWorkToken": apiToken,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  return response.data;
}
