# Poker Settlement Pro

多人即時德州撲克記分與結算工具。前端使用 React、Vite 與 Liveblocks；房間 API 可部署為 Vercel Functions，本機開發時則由 Vite middleware 執行相同的 handler。

## 本機啟動

需求：Node.js 20 或更新版本，以及一組 Liveblocks secret key。

```bash
npm install
copy .env.example .env.local
npm run dev
```

在 `.env.local` 設定：

```dotenv
LIVEBLOCKS_SECRET_KEY=sk_dev_replace_me
```

瀏覽器開啟 <http://localhost:3000>。不需要、也不應設定前端 `VITE_LIVEBLOCKS_PUBLIC_KEY`。

## 驗證

```bash
npm run typecheck
npm test
npm run build
```

## 權限模型

- 房間 ID 由伺服器隨機產生；知道完整房間連結的人可加入共同記分。
- Liveblocks access token 由 `/api/liveblocks-auth` 簽發，並且只允許存取請求中的單一既有房間。
- 建立房間時另產生房主 token。瀏覽器只在本機保存 token，伺服器僅保存 SHA-256 雜湊。
- 更新房間 metadata 與刪除房間需要通過伺服器端房主 token 驗證；UI 的房主狀態也由伺服器驗證後才啟用。
- API 不提供全域房間清單；首頁只顯示目前裝置的瀏覽紀錄。

房主 token 是 capability credential。清除瀏覽器資料後無法復原房主權限，因此正式產品若需要帳號復原，應再接入真正的使用者登入與資料庫。

## 部署

部署到 Vercel 時，在專案環境變數中設定 `LIVEBLOCKS_SECRET_KEY`。`api/rooms.ts` 與 `api/liveblocks-auth.ts` 會作為 serverless functions 執行。
