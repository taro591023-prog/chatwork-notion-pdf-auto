# Chatwork to Notion PDF保存

Chatworkに届く月次財務報告PDFを、法人ごとのNotionページに整理して保存する連携サービスです。

## 作成済みのNotionデータベース

- 法人マスタ: https://www.notion.so/f80adc729a74459ca888f4f80127b9ca
- 月次財務報告: https://www.notion.so/566dc9e119a1497ebb4a55c8c893b3ce

## 仕組み

1. ChatworkにPDFが届きます。
2. Chatwork Webhookがこのサービスの `/chatwork/webhook` に通知します。
3. サービスがChatworkからPDFを取得します。
4. ファイル名から法人名と対象月を読み取ります。
5. PDF本体をNotionへアップロードします。
6. 月次財務報告DBに、法人・対象月・PDFを保存します。

数字の自動読み取りはしません。Notion上でPDFを開いて確認する運用です。

## ファイル名の想定

次の形式を想定しています。

```text
（医社）EMIFULL_財務報告_2603.pdf
```

この場合、次のように保存します。

- 法人: 医療法人社団EMIFULL
- 対象月: 2026年3月
- 報告種別: 財務報告

## セットアップ

```bash
npm install
cp .env.example .env
npm test
npm start
```

`.env` にChatwork APIトークン、Notion APIキー、Webhookトークンを設定します。

## Chatwork側の設定

ChatworkのWebhook管理画面で、公開したURLを次のように設定します。

```text
https://your-service.example.com/chatwork/webhook
```

## 参考

- Chatwork Webhook: https://developer.chatwork.com/docs/webhook
- Chatwork ファイル取得: https://developer.chatwork.com/reference/get-rooms-room_id-files-file_id
- Notion File Upload: https://developers.notion.com/docs/uploading-small-files
