# Reports API

Base path: `/api/reports`

All endpoints require a valid `Authorization: Bearer <token>` header for a manager account.

## Common Query Parameters

`from` (optional) — ISO date (YYYY-MM-DD). Defaults to 7 days ago (inclusive).

`to` (optional) — ISO date (YYYY-MM-DD). Defaults to today (inclusive).

Unless otherwise noted, responses include:

```json
{
  "type": "<report key>",
  "range": { "from": "<ISO>", "to": "<ISO>" },
  "generatedAt": "<ISO timestamp>",
  ... report-specific fields
}
```

---

## 1. Sales Report

`GET /api/reports/sales`

Summary metrics plus daily breakdown.

```json
{
  "summary": {
    "totalRevenue": 0,
    "totalOrders": 0,
    "totalItemsSold": 0,
    "avgOrderValue": 0,
    "totalAllowanceUsed": 0,
    "totalCashOrCard": 0
  },
  "daily": [
    { "date": "2025-10-01", "orders": 3, "revenue": 1500, "itemsSold": 12 }
  ]
}
```

---

## 2. Inventory Report

`GET /api/reports/inventory?lowStock=10`

Low stock items and category distribution.

```json
{
  "lowStockThreshold": 10,
  "lowStock": [
    {
      "id": "...",
      "name": "Sprite",
      "category": "Soft Drink",
      "stock": 8,
      "unitSize": "250ml"
    }
  ],
  "categories": [{ "category": "Soft Drink", "count": 12, "totalStock": 312 }],
  "totalItems": 42,
  "totalStockUnits": 903
}
```

---

## 3. Cadet Spending Report

`GET /api/reports/cadet-spending`

Per‑cadet spending metrics.

```json
{
  "summary": {
    "uniqueCadets": 25,
    "totalSpent": 32000,
    "totalAllowanceUsed": 28000,
    "totalCashCard": 4000,
    "avgPerCadet": 1280
  },
  "topCadets": [
    {
      "serviceNumber": "C123",
      "name": "John Doe",
      "orders": 5,
      "totalSpent": 4500,
      "allowanceUsed": 4000,
      "cashOrCard": 500,
      "avgOrderValue": 900,
      "allowanceRemaining": 11000
    }
  ],
  "cadets": [
    /* full list */
  ]
}
```

---

## 4. Financial Report

`GET /api/reports/financial`

Overall financial performance and payment method mix.

```json
{
  "summary": {
    "totalRevenue": 0,
    "totalOrders": 0,
    "totalAllowanceUsed": 0,
    "totalCashCard": 0,
    "avgDailyRevenue": 0,
    "avgOrderValue": 0,
    "highestRevenueDay": { "date": "2025-10-03", "revenue": 5000, "orders": 9 }
  },
  "paymentMethods": [
    { "method": "Monthly Allowance", "revenue": 21000, "orders": 42 }
  ],
  "daily": [{ "date": "2025-10-03", "revenue": 5000, "orders": 9 }]
}
```

---

## 5. Operational Report

`GET /api/reports/operational?lowStock=10`

Demand patterns & stocking risks.

```json
{
  "summary": {
    "totalOrders": 0,
    "avgItemsPerOrder": 0,
    "medianItemsPerOrder": 0,
    "busiestHour": { "hour": 13, "orders": 7 },
    "busiestDay": { "day": "Fri", "orders": 23 }
  },
  "demandByHour": [{ "hour": 0, "orders": 0 }],
  "demandByDay": [{ "day": "Mon", "orders": 5 }],
  "categories": [{ "category": "Soft Drink", "itemsSold": 120 }],
  "lowStock": [{ "name": "Sprite", "stock": 8 }],
  "lowStockThreshold": 10
}
```

---

## 6. Comparative Report

`GET /api/reports/comparative`

Compares the selected range versus the immediately preceding range of identical length.

```json
{
  "currentRange": {
    "from": "2025-10-01T00:00:00.000Z",
    "to": "2025-10-07T23:59:59.999Z"
  },
  "previousRange": {
    "from": "2025-09-24T00:00:00.000Z",
    "to": "2025-09-30T23:59:59.999Z"
  },
  "metrics": {
    "revenue": { "current": 32000, "previous": 28000, "changePct": 14.29 },
    "orders": { "current": 54, "previous": 49, "changePct": 10.2 },
    "itemsSold": { "current": 300, "previous": 270, "changePct": 11.11 }
  }
}
```

`changePct` = `null` when previous baseline is zero (to avoid infinite growth representation). You can treat `null` as "N/A" in the UI.

---

## Error Format

```json
{ "error": "Message" }
```

## Notes / Extension Ideas

1. Replace in-memory loops with MongoDB aggregation for scalability where needed (cadet-spending currently loads all matching orders).
2. Introduce caching (e.g., Redis) for frequently accessed periods (today, last 7 days, month-to-date).
3. Add filtering: `?category=Soft Drink` for sales/operational.
4. Allow grouping granularity (`daily`, `weekly`, `monthly`) for sales & financial.
5. Record inventory movement events to enrich operational KPIs (restock counts, spoilage, shrinkage).

---

## Frontend Export

Exports supported: CSV & PDF (jsPDF + autotable). Data tables mirror JSON structures above per report type.

---

## Maintenance Checklist

| Change                   | Action                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| Add new payment method   | Verify financial & sales reports automatically include it via aggregation. |
| Add inventory categories | Inventory & operational reports pick them up automatically.                |
| Modify Order schema      | Re-check metrics depending on renamed/removed fields.                      |
| Performance issues       | Promote in-memory reductions to aggregation pipelines with projections.    |

---

## QR Pickup Verification

Cash orders generate a short‑lived QR code for physical pickup validation.

### Model Fields Added

- `pickupVerified: Boolean` – set true after successful scan.
- `collectedAt: Date` – timestamp of scan.

### Generation (Cadet)

`GET /api/qr/order/:orderId`

Requirements:

- Cadet must own the order.
- Order must have `paymentMethod === "Cash"` and not yet be collected.

Response:

```json
{
  "orderId": "RCP-20241007-1234",
  "qrToken": "<jwt>",
  "qrImage": "data:image/png;base64,....",
  "expiresInMinutes": 10
}
```

### Verification (Manager)

`POST /api/qr/verify`

```json
{ "token": "<jwt from QR>" }
```

Response:

```json
{
  "success": true,
  "orderId": "RCP-20241007-1234",
  "collectedAt": "2025-10-07T12:34:56.123Z"
}
```

### Token Payload

```json
{ "typ": "PICKUP", "oid": "<orderId>", "cid": "<cadetObjectId>", "exp": <unix> }
```

Signed with `QR_SECRET` (fallback to `JWT_SECRET`) and expires in 10 minutes.

### Error Codes

| Status | Meaning                                               |
| ------ | ----------------------------------------------------- |
| 400    | Malformed / non-cash / already collected (generation) |
| 401    | Invalid or expired QR token                           |
| 404    | Order not found                                       |
| 409    | Already collected (replay)                            |
| 410    | (Legacy) Already collected during generation          |

### Security Notes

- Short expiry + server-side collected flag prevents replay.
- Only cash orders produce QR codes.
- Consider rotating `QR_SECRET` periodically.
- Future: websocket notify cadet after collection.

### Frontend

- `PurchaseSuccess.jsx` fetches QR automatically for cash orders.
- Manager `PickupScanner.jsx` page supports manual paste; camera scanning can be added with `html5-qrcode`.
