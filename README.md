# Stock Portfolio Return Tracker

一個現代化的股票投資組合回測工具,支援美股和台股。讓您輕鬆分析過去的投資決策、比較不同策略的表現。

## 功能特色

- **美股 + 台股支援** — 同時回測美國股市和台灣股市的股票
- **靈活的投資方式** — 一次性投入(Lump Sum)或定期定額(DCA)
- **智慧配息處理** — 配息再投入、現金累積、自訂比例再投入等多種模式
- **資產走勢圖表** — 動態圖表展示投資組合總資產變化,可篩選單檔或多檔股票
- **月度報酬分析** — 每月價格報酬、配息金額、含息/不含息報酬率一覽
- **幣別轉換** — 在 USD 和 TWD 之間切換顯示,自動套用歷史匯率
- **策略儲存與編輯** — 保存回測設定,之後可重新載入編輯或重新回測
- **策略比較** — 並排比較多個已儲存的策略表現

## 系統需求

- **Node.js** 20 以上 (建議 24 版本)
- **npm** 或其他套件管理工具(yarn、pnpm 等)
- 約 500MB 硬碟空間(包含 node_modules)
- 網際網路連線(用來抓取即時股價資料)

## 安裝步驟

### 1. Clone 專案

```bash
git clone https://github.com/max84517/stock-portfolio-return-tracker.git
cd stock-portfolio-return-tracker
```

### 2. 安裝依賴

```bash
npm install
```

這會安裝所有需要的套件,包括 Next.js、React、Recharts 等。

### 3. 啟動開發伺服器

```bash
npm run dev
```

輸出會顯示類似:
```
▲ Next.js 16.2.10
- Local:         http://localhost:3000
```

### 4. 打開網站

在瀏覽器中打開 **http://localhost:3000** 即可開始使用。

## 使用指南

### 新增回測

1. 點擊 **New Backtest** 按鈕
2. 輸入策略名稱(可選)
3. 設定回測日期範圍(起始日期、結束日期,預設今天)
4. 逐檔新增股票:
   - **Ticker** — 股票代碼(如 AAPL、2330)
   - **Market** — 選擇市場(US/TW)
   - **Amount** — 投入金額
   - **Currency** — 投入幣別(USD/TWD)
   - **Investment style** — 一次性或定期定額
   - **Dividend handling** — 配息處理方式
5. 點擊 **Run Backtest** 等待計算結果

### 檢視結果

- **資產走勢圖** — 大圖顯示投資組合整體資產變化,可用勾選框篩選個股
- **月度報酬表** — 每月的價格報酬、配息金額、含息/不含息報酬率
- **統計數字** — 總投入、期末資產、總報酬(金額與百分比)
- **幣別切換** — 點右上角 USD/TWD 按鈕切換顯示幣別

### 儲存與編輯策略

- **儲存策略** — 回測完後點 **Save Strategy** 保存設定
- **檢視已存策略** — 回到首頁可看到所有保存的策略
- **編輯策略** — 進入已存策略的詳細頁,點 **Edit** 修改設定後重新回測

### 比較策略

1. 點擊 **Compare** 進入比較頁面
2. 勾選想比較的策略(可複選)
3. 選擇顯示幣別
4. 點 **Compare** 按鈕
5. 同一張圖上疊出多條策略的資產走勢線,下方列出各策略的整體報酬

## 技術棧

- **前端** — Next.js 16 + React 19 + TypeScript
- **樣式** — Tailwind CSS(Dark mode)
- **圖表** — Recharts
- **資料庫** — SQLite + Prisma ORM
- **資料來源** — Yahoo Finance API(股價、股利、匯率)
- **CI/CD** — GitHub Actions (lint + typecheck + build 檢查)

## 常見問題

### Q: 如果我新增股票後結果沒更新?
A: 這通常是 React 快取問題。重新整理頁面 (Ctrl+R 或 Cmd+R) 或按一次 **Run Backtest** 按鈕應該就會更新。

### Q: 台股代碼怎麼輸入?
A: 直接輸入代碼數字(如 `2330` 代表台積電, `0056` 代表元大高股息)。系統會自動嘗試 `.TW`(上市)或 `.TWO`(上櫃/OTC)後綴。

### Q: 如果某些日期沒有股價資料怎麼辦?
A: 系統會自動向前補齊(使用前一個交易日的價格)。這是為了處理假日或停牌的情況。

### Q: 配息是怎麼算的?
A: 每個股票在除息日會按持股數量配發現金,根據您選擇的模式(再投入/現金/自訂%)來處理。

### Q: 我可以備份我的策略嗎?
A: 策略資料存在本機的 SQLite 資料庫(`.db` 檔案)裡。如果要備份,只需複製這個檔案即可。

## 開發與貢獻

### 執行測試與品質檢查

```bash
# 檢查代碼風格
npm run lint

# TypeScript 型別檢查
npm run typecheck

# 生成生產版本
npm run build
```

### 專案結構

```
src/
├── app/              # Next.js 頁面與 API routes
├── components/       # React 元件(圖表、表單、卡片等)
├── lib/              # 核心邏輯(回測引擎、資料層、型別定義)
└── generated/        # Prisma 自動生成的型別(勿手動編輯)

prisma/
├── schema.prisma     # 資料庫 schema
└── migrations/       # 資料庫遷移紀錄
```

## 授權

此專案開源釋出,歡迎分享與修改。

## 反饋與支援

如有任何問題或建議,歡迎在 GitHub 上開 Issue 或提交 Pull Request。
