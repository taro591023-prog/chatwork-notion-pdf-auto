import assert from "node:assert/strict";
import { parseReportFileName } from "../src/parser.js";

const fileName = "（医社）EMIFULL_財務報告_2603.pdf";

assert.deepEqual(parseReportFileName(fileName), {
  fileName,
  corporationName: "医療法人社団EMIFULL",
  shortName: "EMIFULL",
  reportType: "財務報告",
  period: "2026-03-01",
  memo: "ファイル名から法人名と対象月を判定しました。数字は自動読み取りしません。"
});

console.log("parser tests passed");
