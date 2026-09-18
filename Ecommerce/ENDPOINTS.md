# Alert Engine Endpoints (Integration Guide)

**Alert Engine Base URL:** `http://localhost:8001`  
**Resolvegent Backend Base URL:** `http://localhost:8000` (`/api/v1`)  
**CORS:** Enabled (`*`)  
**Log File:** `alerts.jsonl`

---

## 1. Endpoints Quick Reference

### Alert Engine Endpoints (`http://localhost:8001`)
| Method | Endpoint | Description | Response Format |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/alerts` | Query alerts with filters and pagination | JSON `{ total_in_log, count, alerts: [...] }` |
| `GET` | `/api/alerts/raw` | Raw NDJSON stream directly from `alerts.jsonl` | `application/x-ndjson` |
| `GET` | `/api/alerts/last` | Get the single most recent alert | JSON `{ status, alert: {...} }` |
| `GET` | `/api/alerts/stats` | Aggregated metrics (severity, category, incidents) | JSON `{ total_alerts, severity_breakdown, ... }` |
| `GET` | `/stream` *(or `/api/alerts/stream`)* | Real-time Server-Sent Events (SSE) push stream | `text/event-stream` (`data: {...}\n\n`) |
| `POST` | `/api/incident/{1\|2\|3}` | Trigger Incident 1, 2, or 3 (auto-forwards to backend) | JSON `{ status: "TRIGGERED", incident, ... }` |
| `POST` | `/api/clear` | Clear in-memory alerts and truncate `alerts.jsonl` | JSON `{ status: "CLEARED" }` |

### Resolvegent Backend Ingest Endpoints (`http://localhost:8000/api/v1`)
| Method | Endpoint | Description | Response Format |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/alerts/ingest` | Ingest single alert or alert array with schema adaptation | JSON `{ status: "success", count }` |
| `POST` | `/api/v1/alerts/pull-from-engine` | Auto-pull & ingest latest alerts from Alert Engine (port 8001) | JSON `{ status: "success", imported_count }` |
| `GET` | `/api/v1/alerts` | List all ingested alerts stored in database | JSON `[ AlertDB, ... ]` |
| `POST` | `/api/v1/alerts/clear` | Clear all alerts from SQLite database | JSON `{ status: "success", cleared_count }` |

---

## 2. Query Parameters (`GET /api/alerts`)

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `since` | `float` | `0` | Returns only alerts where `timestamp > since` (use as polling cursor). |
| `since_id` | `string` | `""` | Returns only alerts created after this `alert_id`. |
| `severity` | `string` | `all` | Filter: `INFO`, `WARNING`, `ERROR`, `CRITICAL`. |
| `category` | `string` | `all` | Filter: `SECURITY`, `INFRASTRUCTURE`, `ORDERS`, `PERFORMANCE`, `INVENTORY`. |
| `incident_id` | `string` | `all` | Filter: `INC-202`, `INC-303`, etc. |
| `correlated_only` | `bool` | `false` | Set `true` to return only correlated alerts. |
| `limit` | `int` | `100` | Max alerts to return. |
| `order` | `string` | `desc` | `desc` (newest first) or `asc` (chronological). |

---

## 3. Alert JSON Schema

```json
{
  "alert_id": "ALT-4a2cac05d4",
  "timestamp": 1789753990.165,
  "timestamp_iso": "2026-09-18T23:23:10.165556",
  "severity": "CRITICAL",
  "category": "INFRASTRUCTURE",
  "service": "payment-gateway-proxy",
  "rule_name": "PAYMENT_GATEWAY_TIMEOUT",
  "message": "Payment gateway response timed out after 10000ms.",
  "correlation_id": "corr-70968e5b",
  "incident_id": "INC-202",
  "parent_alert_id": null,
  "sequence": 1,
  "total_in_cascade": 2,
  "details": {
    "latency_ms": 10000,
    "error_rate": 0.42
  }
}
```

### Key Fields for Processing
- `correlation_id`: Non-null string when the alert is part of a correlated cascade.
- `incident_id`: Incident tag (`INC-101`, `INC-202`, `INC-303`).
- `parent_alert_id`: ID of root cause alert in cascade, or `null` if root or independent.
- `sequence` / `total_in_cascade`: Step number and total alerts in the correlation chain.

---

## 4. Incident Scenarios

- `POST /api/incident/1` &rarr; **1 Alert**: Critical `PAYMENT_GATEWAY_TIMEOUT`.
- `POST /api/incident/2` &rarr; **3 Alerts**: 2 Correlated (`INC-202` Flash Sale Surge &rarr; Negative Inventory) + 1 Independent.
- `POST /api/incident/3` &rarr; **5 Alerts**: 3 Correlated (`INC-303` Credential Stuffing &rarr; Auth CPU Throttle &rarr; WAF Block) + 2 Independent.

---

## 5. Agent Integration Code

### Python: Incremental Polling
```python
import requests, time

def poll_alerts(base_url="http://localhost:8000"):
    last_ts = 0.0
    while True:
        res = requests.get(f"{base_url}/api/alerts", params={"since": last_ts, "order": "asc"}).json()
        for alert in res.get("alerts", []):
            print(f"[{alert['severity']}] {alert['rule_name']} (Corr: {alert['correlation_id']})")
            last_ts = max(last_ts, alert["timestamp"])
        time.sleep(2)
```

### Python: Real-Time SSE Stream
```python
import requests, json

def stream_alerts(base_url="http://localhost:8000"):
    with requests.get(f"{base_url}/stream", stream=True) as resp:
        for line in resp.iter_lines():
            if line and line.startswith(b"data: "):
                alert = json.loads(line[6:].decode("utf-8"))
                print(f"Live Alert: {alert['rule_name']} - {alert['message']}")
```

### JavaScript / Node.js
```javascript
// REST Fetch
const res = await fetch("http://localhost:8000/api/alerts?order=asc");
const { alerts } = await res.json();

// Or SSE Stream
const stream = new EventSource("http://localhost:8000/stream");
stream.onmessage = (e) => {
  const alert = JSON.parse(e.data);
  console.log("Alert:", alert);
};
```
