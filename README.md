# Skin Care Tracker ver.8

病棟看護師向けのスキンケアPWAです。BMI18.5以下または浮腫のある患者のケア実施状況をFirebaseで共有します。

## セットアップ

```bash
npm install
npm run dev
```

本番ビルドは `npm run build` を実行することで `dist/` に生成され、そのままNetlifyへデプロイできます。

### Firebase環境変数

`.env` に以下を定義してください（プレフィックスは `VITE_FIREBASE_`）。

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 技術構成
- React (Vite + TypeScript)
- Firebase Auth（匿名サインイン） + Firestore
- Chart.js + react-chartjs-2
- PWA対応（`manifest.webmanifest` / Service Worker / Web App Manifestアイコン）

## ディレクトリ
- `src/components` : 評価フォーム・ダッシュボード
- `src/hooks/useEvaluationData.ts` : Firestore購読と集計
- `src/contexts/AuthContext.tsx` : Firebase Auth管理
- `src/lib/summaries.ts` : 月次サマリー計算

## デプロイ
Netlifyで新規サイトを作成し、ビルドコマンドに `npm run build`、公開ディレクトリに `dist` を指定してください。環境変数も同様に設定します。
