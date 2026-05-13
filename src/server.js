import express from "express";
import crypto from "node:crypto";
import {
  downloadFile,
  extractDownloadFileIds,
  fetchFileInfo,
  fetchMessage,
  getRoomAndMessageId,
  postMessage
} from "./chatwork.js";
import {
  createNotionClient,
  findOrCreateCorporation,
  uploadPdfToNotion,
  upsertMonthlyReport
} from "./notion.js";
import { parseReportFileName } from "./parser.js";

const app = express();
app.use(express.json({
  limit: "2mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString("utf8");
  }
}));

const config = {
  port: Number(process.env.PORT || 8080),
  chatworkApiToken: process.env.CHATWORK_API_TOKEN,
  chatworkWebhookToken: process.env.CHATWORK_WEBHOOK_TOKEN,
  notionApiKey: process.env.NOTION_API_KEY,
  corporationDataSourceId: process.env.NOTION_CORPORATION_DATA_SOURCE_ID,
  monthlyReportDataSourceId: process.env.NOTION_MONTHLY_REPORT_DATA_SOURCE_ID,
  replyEnabled: process.env.CHATWORK_REPLY_ENABLED === "true"
};

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/chatwork/webhook", async (req, res) => {
  try {
    verifyWebhook(req);
    requireConfig();

    const { roomId, messageId } = getRoomAndMessageId(req.body);
    if (!roomId || !messageId) {
      return res.status(202).json({ ok: true, skipped: "room_id or message_id missing" });
    }

    const message = await fetchMessage({
      apiToken: config.chatworkApiToken,
      roomId,
      messageId
    });

    const fileIds = extractDownloadFileIds(message.body || "");
    if (fileIds.length === 0) {
      return res.status(202).json({ ok: true, skipped: "no attached files" });
    }

    const notion = createNotionClient(config.notionApiKey);
    const results = [];

    for (const fileId of fileIds) {
      const fileInfo = await fetchFileInfo({
        apiToken: config.chatworkApiToken,
        roomId,
        fileId
      });

      if (!isPdf(fileInfo)) {
        results.push({ fileId, skipped: "not a pdf" });
        continue;
      }

      const fileName = fileInfo.filename || fileInfo.name || "report.pdf";
      const pdfBuffer = await downloadFile(fileInfo.download_url);
      const uploadedPdf = await uploadPdfToNotion(notion, pdfBuffer, fileName);
      const metadata = parseReportFileName(fileName);

      const corporation = await findOrCreateCorporation(
        notion,
        config.corporationDataSourceId,
        metadata
      );

      const page = await upsertMonthlyReport(notion, config.monthlyReportDataSourceId, corporation, {
        ...metadata,
        fileName,
        fileUploadId: uploadedPdf.id,
        chatworkRoomId: roomId,
        chatworkMessageId: messageId
      });

      results.push({ fileId, pageId: page.id, pageUrl: page.url });
    }

    if (config.replyEnabled && results.some((result) => result.pageUrl)) {
      const lines = results
