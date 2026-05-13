import { Client } from "@notionhq/client";

export function createNotionClient(auth) {
  return new Client({ auth });
}

export async function uploadPdfToNotion(notion, pdfBuffer, fileName) {
  const fileUpload = await notion.fileUploads.create({
    mode: "single_part",
    filename: fileName,
    content_type: "application/pdf"
  });

  const uploaded = await notion.fileUploads.send({
    file_upload_id: fileUpload.id,
    file: {
      filename: fileName,
      data: new Blob([pdfBuffer], { type: "application/pdf" })
    }
  });

  return uploaded;
}

export async function findOrCreateCorporation(notion, dataSourceId, metadata) {
  const corporationName = metadata.corporationName || metadata.shortName || "名称未判定";
  const existing = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      property: "法人名",
      title: { equals: corporationName }
    },
    page_size: 1
  });

  if (existing.results.length > 0) return existing.results[0];

  return notion.pages.create({
    parent: { data_source_id: dataSourceId },
    properties: {
      "法人名": title(corporationName),
      "略称": richText(metadata.shortName || corporationName),
      "ステータス": select("運用中"),
      "メモ": richText("Chatwork取込時に自動作成")
    }
  });
}

export async function upsertMonthlyReport(notion, dataSourceId, corporationPage, report) {
  const existing = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      and: [
        { property: "ChatworkメッセージID", rich_text: { equals: report.chatworkMessageId } },
        { property: "ChatworkルームID", rich_text: { equals: report.chatworkRoomId } }
      ]
    },
    page_size: 1
  });

  const properties = buildMonthlyReportProperties(corporationPage, report);

  if (existing.results.length > 0) {
    return notion.pages.update({
      page_id: existing.results[0].id,
      properties
    });
  }

  return notion.pages.create({
    parent: { data_source_id: dataSourceId },
    properties,
    children: [
      paragraph("Chatworkに届いたPDFを自動保存しました。"),
      paragraph(`ファイル名: ${report.fileName || "不明"}`),
      ...(report.fileUploadId ? [pdfBlock(report.fileUploadId)] : [])
    ]
  });
}

function buildMonthlyReportProperties(corporationPage, report) {
  const properties = {
    "タイトル": title(buildReportTitle(report)),
    "法人": { relation: [{ id: corporationPage.id }] },
    "報告種別": select(report.reportType || "その他"),
    "ChatworkルームID": richText(report.chatworkRoomId),
    "ChatworkメッセージID": richText(report.chatworkMessageId),
    "取込ステータス": select("取込済み"),
    "メモ": richText(report.memo || ""),
    "PDF": report.fileUploadId
      ? {
          files: [
            {
              name: report.fileName || "report.pdf",
              type: "file_upload",
              file_upload: { id: report.fileUploadId }
            }
          ]
        }
      : undefined
  };

  if (report.period) {
    properties["対象月"] = { date: { start: report.period } };
  }

  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

function buildReportTitle(report) {
  const name = report.shortName || report.corporationName || "法人未判定";
  const ym = formatPeriod(report.period);
  return `${name} ${ym} ${report.reportType || "月次報告"}`;
}

function formatPeriod(period) {
  if (!period) return "年月未判定";
  const match = period.match(/^(\d{4})-(\d{2})/);
  if (!match) return period;
  return `${match[1]}年${Number(match[2])}月`;
}

function title(content) {
  return { title: [{ text: { content } }] };
}

function richText(content) {
  return { rich_text: [{ text: { content: String(content || "") } }] };
}

function select(name) {
  return { select: { name } };
}

function paragraph(content) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content } }]
    }
  };
}

function pdfBlock(fileUploadId) {
  return {
    object: "block",
    type: "pdf",
    pdf: {
      type: "file_upload",
      file_upload: { id: fileUploadId }
    }
  };
}
