export function parseReportFileName(fileName = "") {
  const stem = fileName.replace(/\.pdf$/i, "");
  const match = stem.match(/^(.+?)_(財務報告|経営指標|月次報告)_(\d{4})$/);

  if (!match) {
    return {
      fileName,
      corporationName: "",
      shortName: "",
      reportType: "その他",
      period: null,
      memo: "ファイル名から法人名と対象月を判定できませんでした。"
    };
  }

  const [, corporationLabel, reportType, yymm] = match;
  const year = 2000 + Number(yymm.slice(0, 2));
  const month = Number(yymm.slice(2, 4));

  return {
    fileName,
    corporationName: normalizeCorporationName(corporationLabel),
    shortName: extractShortName(corporationLabel),
    reportType,
    period: `${year}-${String(month).padStart(2, "0")}-01`,
    memo: "ファイル名から法人名と対象月を判定しました。数字は自動読み取りしません。"
  };
}

export function normalizeCorporationName(value = "") {
  return value
    .replace(/[()（）]/g, "")
    .replace(/^医社/, "医療法人社団")
    .replace(/^医$/, "医療法人")
    .replace(/\s+/g, "")
    .trim();
}

export function extractShortName(value = "") {
  const cleaned = value.replace(/[()（）]/g, "").trim();
  const parts = cleaned.split(/[_\s]/).filter(Boolean);
  const last = parts.at(-1) || cleaned;
  return last.replace(/^医療法人社団|^医療法人|^医社|^医/, "");
}
