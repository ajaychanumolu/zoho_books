# Zoho Books — Expense Ledger

A clean, minimal expense tracking interface for Zoho Books with AI chat assistant, powered by n8n webhooks.

## Features

- **Record Expenses** — Batch entry form with 50+ categories, subcategories, pay-through options
- **View Expenses** — Table with search, sort, date-range filter, and live totals
- **AI Chat Assistant** — Chat widget connected to n8n for quick queries
- **Auto-Sync** — Expenses page auto-refreshes when new records are added

## Project Structure

```
├── Index.html          # Add expenses page
├── expenses.html       # View all expenses page
├── config.js           # ⚙️ All API endpoints (edit this to change URLs)
├── styles.css          # Design system (The Classic Ledger)
├── categories.js       # Expense category data
├── app.js              # Expense form logic
├── chat.js             # Chat widget logic
├── expenses.js         # Expenses table logic
└── .gitignore
```

## Configuration

All webhook URLs are in **`config.js`**:

```js
const CONFIG = {
    EXPENSE_WEBHOOK_URL: "https://your-n8n/webhook/zohobooks",
    GET_EXPENSES_URL:    "https://your-n8n/webhook/getexpences",
    CHAT_WEBHOOK_URL:    "https://your-n8n/webhook/chat",
};
```

## Design System

**The Classic Ledger** — Warm, earthy palette with Playfair Display serif headings and DM Sans body text.
