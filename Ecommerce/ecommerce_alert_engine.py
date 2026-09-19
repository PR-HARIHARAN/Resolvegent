#!/usr/bin/env python3
"""
E-COMMERCE PLATFORM INCIDENT & ALERT ENGINE + LOG API ENDPOINTS
===============================================================
Modeled specifically for the `react-e-commerce-` web platform.

Available API Endpoints for Your Main Project:
- GET  /api/alerts              -> Full JSON alerts log with query filtering (?limit=50&severity=CRITICAL&since=...)
- GET  /api/alerts/log          -> Alias for /api/alerts
- GET  /api/alerts/raw          -> Raw NDJSON (alerts.jsonl) stream for log forwarders & pipelines
- GET  /api/alerts/stats        -> Aggregated log stats (by severity, category, incident, correlations)
- GET  /api/alerts/last         -> Most recent alert object
- GET  /api/alerts/stream       -> Server-Sent Events (SSE) live push stream
- GET  /stream                  -> Alias for /api/alerts/stream
- GET  /recent                  -> Recent alerts array
- POST /api/incident/1          -> Trigger Incident 1 (1 alert: Payment Gateway Timeout)
- POST /api/incident/2          -> Trigger Incident 2 (3 alerts: 2 Correlated + 1 Independent)
- POST /api/incident/3          -> Trigger Incident 3 (5 alerts: 3 Correlated + 2 Independent)
- POST /api/clear               -> Clear active alerts log
"""

import argparse
import asyncio
import datetime
import json
import os
import random
import sys
import threading
import time
import urllib.request
from urllib.parse import urlparse, parse_qs
import uuid
from typing import Dict, Any, List, Optional

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ANSI colors for console styling
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_CRITICAL = "\033[91;1m"   # Bright Red Bold
COLOR_ERROR = "\033[31m"        # Red
COLOR_WARNING = "\033[33m"      # Yellow
COLOR_INFO = "\033[36m"         # Cyan
COLOR_CORRELATION = "\033[35m"  # Magenta
COLOR_DIM = "\033[90m"          # Gray


def format_cli_alert(alert: Dict[str, Any]) -> str:
    """Returns a beautifully formatted console string for an alert."""
    sev = alert.get("severity", "INFO")
    cat = alert.get("category", "SYSTEM")
    time_str = alert.get("timestamp_iso", "")[11:23]  # HH:MM:SS.mmm

    icon = "ℹ️ "
    sev_color = COLOR_INFO
    if sev == "CRITICAL":
        icon = "🚨"
        sev_color = COLOR_CRITICAL
    elif sev == "ERROR":
        icon = "❌"
        sev_color = COLOR_ERROR
    elif sev == "WARNING":
        icon = "⚠️ "
        sev_color = COLOR_WARNING

    corr_info = ""
    if alert.get("correlation_id"):
        inc_id = alert.get("incident_id", "INC-CORR")
        seq = alert.get("sequence", 1)
        total_seq = alert.get("total_in_cascade", "?")
        corr_info = f" {COLOR_CORRELATION}🔗 [{inc_id} step {seq}/{total_seq}]{COLOR_RESET}"
    elif alert.get("incident_id"):
        inc_id = alert.get("incident_id")
        corr_info = f" {COLOR_DIM}[{inc_id} single]{COLOR_RESET}"

    rule = alert.get("rule_name", "ALERT")
    msg = alert.get("message", "")
    service = alert.get("service", "platform")

    return (
        f"{COLOR_DIM}{time_str}{COLOR_RESET} "
        f"{icon} {sev_color}[{sev:<8}]{COLOR_RESET} "
        f"{COLOR_BOLD}[{cat:<14}]{COLOR_RESET} "
        f"{COLOR_DIM}({service}){COLOR_RESET} "
        f"{COLOR_BOLD}{rule}{COLOR_RESET}: {msg}{corr_info}"
    )


# ==============================================================================
# IN-MEMORY BUFFER & BROADCAST SYSTEM
# ==============================================================================

MAX_RECENT_ALERTS = 200
recent_alerts: List[Dict[str, Any]] = []
stream_subscribers: List[asyncio.Queue] = []
current_engine_instance = None


def read_alerts_log(filepath: str) -> List[Dict[str, Any]]:
    """Reads all logged alerts from the JSONL log file."""
    if not os.path.exists(filepath):
        return []
    records = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        records.append(json.loads(line))
                    except Exception:
                        pass
    except Exception as e:
        print(f"Error reading log file {filepath}: {e}", file=sys.stderr)
    return records


def record_alert(alert: Dict[str, Any], output_filepath: Optional[str] = "alerts.jsonl"):
    """Store in memory, notify live stream listeners, and append to JSONL file."""
    recent_alerts.append(alert)
    if len(recent_alerts) > MAX_RECENT_ALERTS:
        recent_alerts.pop(0)

    # Broadcast to SSE queues
    for q in list(stream_subscribers):
        try:
            q.put_nowait(alert)
        except Exception:
            pass

    # Append to file
    if output_filepath:
        try:
            with open(output_filepath, "a", encoding="utf-8") as f:
                f.write(json.dumps(alert) + "\n")
        except Exception as e:
            print(f"Failed writing to {output_filepath}: {e}", file=sys.stderr)

    # Auto-forward to Resolvegent backend if configured
    if current_engine_instance and getattr(current_engine_instance, "backend_url", None):
        threading.Thread(
            target=_post_alert_to_backend,
            args=(alert, current_engine_instance.backend_url),
            daemon=True
        ).start()


def _post_alert_to_backend(alert: Dict[str, Any], url: str):
    """Fire-and-forget webhook forwarder to Resolvegent backend."""
    try:
        data = json.dumps(alert).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=1.5):
            pass
    except Exception:
        pass


# ==============================================================================
# INCIDENT SCENARIOS (Incident 1: 1 alert | Incident 2: 3 alerts | Incident 3: 5 alerts)
# ==============================================================================

class AlertEngine:
    def __init__(
        self,
        output_filepath: Optional[str] = "alerts.jsonl",
        backend_url: Optional[str] = "http://localhost:8000/api/v1/alerts/ingest"
    ):
        self.output_filepath = output_filepath
        self.backend_url = backend_url
        self.running = True
        self.total_generated = 0
        self.total_correlated = 0

    def build_alert_payload(
        self,
        base_data: Dict[str, Any],
        correlation_id: Optional[str] = None,
        incident_id: Optional[str] = None,
        parent_alert_id: Optional[str] = None,
        sequence: int = 1,
        total_in_cascade: int = 1,
    ) -> Dict[str, Any]:
        """Wrap alert in standard payload structure."""
        now = time.time()
        iso_str = datetime.datetime.fromtimestamp(now).isoformat()

        payload = {
            "alert_id": f"ALT-{uuid.uuid4().hex[:10]}",
            "timestamp": now,
            "timestamp_iso": iso_str,
            "severity": base_data.get("severity", "INFO"),
            "category": base_data.get("category", "SYSTEM"),
            "service": base_data.get("service", "platform"),
            "rule_name": base_data.get("rule_name", "RULE"),
            "message": base_data.get("message", ""),
            "correlation_id": correlation_id,
            "incident_id": incident_id,
            "parent_alert_id": parent_alert_id,
            "sequence": sequence,
            "total_in_cascade": total_in_cascade,
            "details": base_data.get("details", {}),
        }
        return payload

    async def emit_alert(
        self,
        base_data: Dict[str, Any],
        correlation_id: Optional[str] = None,
        incident_id: Optional[str] = None,
        parent_alert_id: Optional[str] = None,
        sequence: int = 1,
        total_in_cascade: int = 1,
    ) -> Dict[str, Any]:
        """Builds, records, logs, and returns an alert."""
        alert = self.build_alert_payload(
            base_data=base_data,
            correlation_id=correlation_id,
            incident_id=incident_id,
            parent_alert_id=parent_alert_id,
            sequence=sequence,
            total_in_cascade=total_in_cascade,
        )
        self.total_generated += 1
        if correlation_id:
            self.total_correlated += 1
        record_alert(alert, self.output_filepath)
        print(format_cli_alert(alert))
        return alert

    # --------------------------------------------------------------------------
    # INCIDENT 1: EXACTLY 1 ALERT
    # --------------------------------------------------------------------------
    async def trigger_incident_1(self) -> List[Dict[str, Any]]:
        """Incident 1: Exactly 1 alert total (Payment Gateway Timeout)."""
        print(f"\n{COLOR_CRITICAL}{COLOR_BOLD}=== TRIGGERING INCIDENT 1 (1 Alert) ==={COLOR_RESET}")
        incident_id = "INC-101"
        alerts = []

        alert1 = await self.emit_alert(
            base_data={
                "category": "PAYMENT",
                "severity": "CRITICAL",
                "rule_name": "PAYMENT_GATEWAY_TIMEOUT",
                "service": "payment-gateway-proxy",
                "message": "Google Pay & PayPal Express API latency breached 5200ms (> 2000ms SLA). Checkout payments failing for multiple customer carts.",
                "details": {
                    "gateway": "Google Pay / PayPal",
                    "latency_ms": 5200,
                    "affected_orders": 18,
                    "status": "CIRCUIT_BREAKER_TRIPPED",
                },
            },
            incident_id=incident_id,
            correlation_id=None,
            sequence=1,
            total_in_cascade=1,
        )
        alerts.append(alert1)
        return alerts

    # --------------------------------------------------------------------------
    # INCIDENT 2: EXACTLY 3 ALERTS (2 CORRELATED + 1 INDEPENDENT)
    # --------------------------------------------------------------------------
    async def trigger_incident_2(self) -> List[Dict[str, Any]]:
        """Incident 2: Exactly 3 alerts total (2 Correlated: Traffic Surge -> Inventory Race + 1 Independent: CDN 404)."""
        print(f"\n{COLOR_WARNING}{COLOR_BOLD}=== TRIGGERING INCIDENT 2 (3 Alerts: 2 Correlated + 1 Independent) ==={COLOR_RESET}")
        incident_id = "INC-202"
        corr_id = f"corr-{uuid.uuid4().hex[:8]}"
        alerts = []

        # Correlated Alert 1 of 2 (Root Cause: Traffic Spike)
        alert1 = await self.emit_alert(
            base_data={
                "category": "PERFORMANCE",
                "severity": "WARNING",
                "rule_name": "FLASH_SALE_TRAFFIC_SURGE",
                "service": "cdn-edge-cloudflare",
                "message": "Sudden 6.8x traffic spike on 'ROSE GOLD PACK' (SKU-RGP-006) - 420 requests/second on /products.",
                "details": {
                    "sku": "SKU-RGP-006",
                    "product": "ROSE GOLD PACK",
                    "current_rps": 420,
                    "baseline_rps": 62,
                },
            },
            incident_id=incident_id,
            correlation_id=corr_id,
            sequence=1,
            total_in_cascade=2,
        )
        alerts.append(alert1)
        await asyncio.sleep(0.35)

        # Correlated Alert 2 of 2 (Causal Child: Stock fell below 0)
        alert2 = await self.emit_alert(
            base_data={
                "category": "INVENTORY",
                "severity": "CRITICAL",
                "rule_name": "NEGATIVE_INVENTORY_RACE_CONDITION",
                "service": "inventory-service",
                "message": "Oversell condition detected! 'ROSE GOLD PACK' stock fell below zero (-3 items available) due to simultaneous checkouts.",
                "details": {
                    "sku": "SKU-RGP-006",
                    "stock_level": -3,
                    "oversold_orders": ["ORD-83912", "ORD-83913", "ORD-83914"],
                },
            },
            incident_id=incident_id,
            correlation_id=corr_id,
            parent_alert_id=alert1["alert_id"],
            sequence=2,
            total_in_cascade=2,
        )
        alerts.append(alert2)
        await asyncio.sleep(0.30)

        # Independent Alert 3 of 3 (Concurrent CDN error)
        alert3 = await self.emit_alert(
            base_data={
                "category": "PERFORMANCE",
                "severity": "ERROR",
                "rule_name": "STATIC_ASSET_404_SURGE",
                "service": "cdn-edge-cloudflare",
                "message": "Elevated 404 response rate on Shopify CDN product images (12.5% of product image requests failing).",
                "details": {
                    "status_code": 404,
                    "failure_rate_pct": 12.5,
                    "asset_host": "cdn.shopify.com",
                },
            },
            incident_id=None,
            correlation_id=None,
            sequence=1,
            total_in_cascade=1,
        )
        alerts.append(alert3)
        return alerts

    # --------------------------------------------------------------------------
    # INCIDENT 3: EXACTLY 5 ALERTS (3 CORRELATED + 2 INDEPENDENT)
    # --------------------------------------------------------------------------
    async def trigger_incident_3(self) -> List[Dict[str, Any]]:
        """Incident 3: Exactly 5 alerts total (3 Correlated: Security Chain + 2 Independent: Cart & DB)."""
        print(f"\n{COLOR_CORRELATION}{COLOR_BOLD}=== TRIGGERING INCIDENT 3 (5 Alerts: 3 Correlated + 2 Independent) ==={COLOR_RESET}")
        incident_id = "INC-303"
        corr_id = f"corr-{uuid.uuid4().hex[:8]}"
        alerts = []

        # Correlated Alert 1 of 3 (Security Root: Credential Stuffing)
        alert1 = await self.emit_alert(
            base_data={
                "category": "SECURITY",
                "severity": "WARNING",
                "rule_name": "CREDENTIAL_STUFFING_BURST",
                "service": "auth-service",
                "message": "High login failure rate (88% failure over 120 attempts) targeting /api/auth/login from IP 149.43.10.124.",
                "details": {
                    "target_endpoint": "/api/auth/login",
                    "attacker_ip": "149.43.10.124",
                    "failure_rate_pct": 88.0,
                },
            },
            incident_id=incident_id,
            correlation_id=corr_id,
            sequence=1,
            total_in_cascade=3,
        )
        alerts.append(alert1)
        await asyncio.sleep(0.30)

        # Correlated Alert 2 of 3 (Causal Child 1: Microservice CPU saturated by password hashes)
        alert2 = await self.emit_alert(
            base_data={
                "category": "INFRASTRUCTURE",
                "severity": "ERROR",
                "rule_name": "AUTH_SERVICE_CPU_SATURATION",
                "service": "auth-service",
                "message": "Auth microservice CPU usage sustained at 94% due to parallel password hash verifications.",
                "details": {
                    "cpu_utilization_pct": 94.2,
                    "hashing_algorithm": "bcrypt",
                    "active_auth_workers": 16,
                },
            },
            incident_id=incident_id,
            correlation_id=corr_id,
            parent_alert_id=alert1["alert_id"],
            sequence=2,
            total_in_cascade=3,
        )
        alerts.append(alert2)
        await asyncio.sleep(0.30)

        # Correlated Alert 3 of 3 (Causal Child 2: Edge WAF blocks IP)
        alert3 = await self.emit_alert(
            base_data={
                "category": "SECURITY",
                "severity": "CRITICAL",
                "rule_name": "WAF_IP_REPUTATION_BLOCK_ENGAGED",
                "service": "cdn-edge-cloudflare",
                "message": "WAF rate-limiter engaged: blocked attacker IP 149.43.10.124 and 14 subnet addresses for 30 minutes.",
                "details": {
                    "blocked_ip": "149.43.10.124",
                    "action": "403_FORBIDDEN",
                    "duration_minutes": 30,
                },
            },
            incident_id=incident_id,
            correlation_id=corr_id,
            parent_alert_id=alert2["alert_id"],
            sequence=3,
            total_in_cascade=3,
        )
        alerts.append(alert3)
        await asyncio.sleep(0.25)

        # Independent Alert 4 of 5 (Concurrent Cart Abandonment Alert)
        alert4 = await self.emit_alert(
            base_data={
                "category": "ORDERS",
                "severity": "WARNING",
                "rule_name": "CART_ABANDONMENT_ANOMALY",
                "service": "checkout-service",
                "message": "Cart abandonment spiked to 78% in the last 5 minutes (normal baseline: 45%).",
                "details": {
                    "abandonment_rate_pct": 78.0,
                    "carts_created": 65,
                    "checkouts_completed": 14,
                },
            },
            incident_id=None,
            correlation_id=None,
            sequence=1,
            total_in_cascade=1,
        )
        alerts.append(alert4)
        await asyncio.sleep(0.25)

        # Independent Alert 5 of 5 (Concurrent Database Slow Query Alert)
        alert5 = await self.emit_alert(
            base_data={
                "category": "INFRASTRUCTURE",
                "severity": "ERROR",
                "rule_name": "POSTGRES_SLOW_QUERY_THRESHOLD",
                "service": "postgres-cluster",
                "message": "Query on 'order_items' table took 2350ms (> 500ms threshold). Missing index candidate.",
                "details": {
                    "query_duration_ms": 2350,
                    "table": "order_items",
                    "rows_scanned": 184000,
                },
            },
            incident_id=None,
            correlation_id=None,
            sequence=1,
            total_in_cascade=1,
        )
        alerts.append(alert5)
        return alerts


# ==============================================================================
# DASHBOARD HTML (MATCHING PORT 5173 RESOLVEGENT THEME & DESIGN SYSTEM)
# ==============================================================================

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resolvegent - Alert Engine & Ingestion Stream (Port 8001)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --card-bg: #0A0A0A;
      --subtle-bg: #141414;
      --hover-bg: #1C1C1C;
      --border: #262626;
      --border-subtle: #1C1C1C;
      --border-strong: #FFFFFF;
      --text: #FFFFFF;
      --text-secondary: #E5E5E5;
      --text-muted: #A3A3A3;
      --text-subtle: #737373;
      --critical: #EF4444;
      --critical-bg: rgba(69, 10, 10, 0.7);
      --critical-border: #7F1D1D;
      --critical-fg: #FCA5A5;
      --error: #F97316;
      --error-bg: rgba(67, 20, 7, 0.7);
      --error-border: #7C2D12;
      --error-fg: #FDBA74;
      --warning: #F59E0B;
      --warning-bg: rgba(69, 26, 3, 0.7);
      --warning-border: #78350F;
      --warning-fg: #FCD34D;
      --info: #3B82F6;
      --info-bg: rgba(23, 37, 84, 0.7);
      --info-border: #1E3A8A;
      --info-fg: #93C5FD;
      --corr: #A855F7;
      --corr-bg: rgba(88, 28, 135, 0.4);
      --corr-border: #6B21A8;
      --corr-fg: #D8B4FE;
      --resolved: #22C55E;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text-secondary);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 0 0 40px 0;
      line-height: 1.5;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Resolvegent Port 5173 Navbar */
    .top-header {
      background: #000000;
      border-bottom: 1px solid var(--border);
      height: 64px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
      gap: 16px;
    }

    /* Logo & Glow Beam matching Port 5173 */
    .brand-container {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      position: relative;
      text-decoration: none;
    }
    .brand-text {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-beams {
      position: relative;
      width: 100%;
      height: 4px;
      margin-top: 3px;
    }
    .beam-cyan {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, #38bdf8, transparent);
    }
    .beam-indigo {
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #6366f1, transparent);
      filter: blur(1px);
    }

    .header-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #052E16;
      border: 1px solid #14532D;
      color: #86EFAC;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      letter-spacing: 0.02em;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      background: #22C55E;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 6px #22c55e;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
      70% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
      100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
    }

    .nav-links {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text);
      font-family: inherit;
    }
    .btn:hover {
      background: var(--hover-bg);
      border-color: #404040;
    }
    .btn-primary {
      background: #FFFFFF;
      color: #000000;
      border-color: #FFFFFF;
      font-weight: 600;
    }
    .btn-primary:hover {
      background: #E5E5E5;
      border-color: #E5E5E5;
      color: #000000;
    }

    .main-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px 24px 0 24px;
    }

    /* Subheader banner */
    .page-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-title {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }
    .page-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Scenario Trigger Command Bar */
    .incident-bar {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .incident-bar-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .incident-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .btn-inc1 {
      background: var(--critical-bg);
      border-color: var(--critical-border);
      color: var(--critical-fg);
      font-weight: 600;
    }
    .btn-inc1:hover {
      background: rgba(127, 29, 29, 0.85);
      border-color: #EF4444;
      color: #FFFFFF;
    }
    .btn-inc2 {
      background: var(--error-bg);
      border-color: var(--error-border);
      color: var(--error-fg);
      font-weight: 600;
    }
    .btn-inc2:hover {
      background: rgba(124, 45, 18, 0.85);
      border-color: #F97316;
      color: #FFFFFF;
    }
    .btn-inc3 {
      background: var(--corr-bg);
      border-color: var(--corr-border);
      color: var(--corr-fg);
      font-weight: 600;
    }
    .btn-inc3:hover {
      background: rgba(107, 33, 168, 0.7);
      border-color: #A855F7;
      color: #FFFFFF;
    }
    .btn-clear {
      background: var(--subtle-bg);
      border-color: var(--border);
      color: var(--text-muted);
    }
    .btn-clear:hover {
      background: var(--hover-bg);
      color: #FFFFFF;
      border-color: #525252;
    }

    /* API Ingestion Endpoints Banner */
    .api-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-left: 3px solid #FFFFFF;
      border-radius: 8px;
      padding: 12px 18px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .api-endpoints-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .endpoint-tag {
      background: var(--subtle-bg);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.74rem;
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .endpoint-tag:hover {
      background: var(--hover-bg);
      color: #FFFFFF;
      border-color: #525252;
    }

    /* KPI Grid matching Port 5173 cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px 18px;
      transition: border-color 0.15s;
    }
    .kpi-card:hover {
      border-color: #383838;
    }
    .kpi-label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 1.85rem;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.03em;
    }

    /* Filter Controls matching Port 5173 Tabs */
    .controls {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
      overflow-x: auto;
      padding-bottom: 4px;
      flex-wrap: wrap;
    }
    .filter-chip {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 5px 13px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .filter-chip:hover {
      color: #FFFFFF;
      border-color: #404040;
    }
    .filter-chip.active {
      background: #FFFFFF;
      color: #000000;
      border-color: #FFFFFF;
      font-weight: 600;
    }

    /* Live Alerts Feed */
    .feed {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: calc(100vh - 410px);
      overflow-y: auto;
      padding-right: 4px;
    }
    .feed::-webkit-scrollbar {
      width: 5px;
    }
    .feed::-webkit-scrollbar-thumb {
      background: #262626;
      border-radius: 3px;
    }

    /* Alert Cards */
    .alert-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-left: 4px solid var(--info);
      border-radius: 8px;
      padding: 14px 18px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 14px;
      align-items: center;
      transition: border-color 0.15s;
      animation: slideIn 0.25s ease-out;
    }
    .alert-card:hover {
      border-color: #383838;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .alert-card.CRITICAL { border-left-color: var(--critical); }
    .alert-card.ERROR { border-left-color: var(--error); }
    .alert-card.WARNING { border-left-color: var(--warning); }
    .alert-card.INFO { border-left-color: var(--info); }
    .alert-card.is-correlated {
      border-right: 3px solid var(--corr);
    }

    /* Severity Badges matching Port 5173 tokens */
    .badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: 1px solid transparent;
      display: inline-block;
    }
    .badge.CRITICAL {
      background: var(--critical-bg);
      border-color: var(--critical-border);
      color: var(--critical-fg);
    }
    .badge.ERROR {
      background: var(--error-bg);
      border-color: var(--error-border);
      color: var(--error-fg);
    }
    .badge.WARNING {
      background: var(--warning-bg);
      border-color: var(--warning-border);
      color: var(--warning-fg);
    }
    .badge.INFO {
      background: var(--info-bg);
      border-color: var(--info-border);
      color: var(--info-fg);
    }

    .alert-title {
      font-weight: 600;
      font-size: 0.92rem;
      color: #FFFFFF;
      margin-bottom: 2px;
      letter-spacing: -0.01em;
    }
    .alert-msg {
      font-size: 0.83rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }
    .alert-meta {
      display: flex;
      gap: 12px;
      font-size: 0.74rem;
      color: var(--text-subtle);
      margin-top: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .meta-tag {
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    .corr-tag {
      color: var(--corr-fg);
      background: var(--corr-bg);
      border: 1px solid var(--corr-border);
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.72rem;
      font-family: 'JetBrains Mono', monospace;
    }
    .time-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.76rem;
      color: var(--text-subtle);
    }
    .empty-state {
      text-align: center;
      padding: 70px 20px;
      color: var(--text-muted);
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .empty-state h3 {
      color: #FFFFFF;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .empty-state p {
      color: var(--text-subtle);
      font-size: 0.82rem;
    }
  </style>
</head>
<body>
  <!-- Port 5173 Style Top Navigation Header -->
  <header class="top-header">
    <div style="display: flex; align-items: center; gap: 14px;">
      <a href="/" class="brand-container" title="Resolvegent Alert Engine">
        <span class="brand-text">Resolvegent</span>
        <div class="brand-beams">
          <div class="beam-indigo"></div>
          <div class="beam-cyan"></div>
        </div>
      </a>
      <span class="header-status-badge">
        <span class="pulse-dot"></span>
        Alert Engine 8001 Live
      </span>
    </div>

    <nav class="nav-links">
      <a href="https://resolvegent.vercel.app/overview" target="_blank" class="btn btn-primary">
        ⚡ Command Center ↗
      </a>
      <a href="https://src-one-beige-69.vercel.app/" target="_blank" class="btn">
        🛍️ Storefront ↗
      </a>
      <a href="/api/alerts" target="_blank" class="btn" style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">
        GET /api/alerts
      </a>
      <a href="/api/alerts/raw" target="_blank" class="btn" style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">
        NDJSON
      </a>
      <a href="/api/alerts/stats" target="_blank" class="btn" style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">
        Stats
      </a>
    </nav>
  </header>

  <main class="main-container">
    <div class="page-title-row">
      <div>
        <h1 class="page-title">E-Commerce Alert Command & Ingestion Stream</h1>
        <p class="page-desc">Simulate production failures and stream real-time incidents into the autonomous incident engine.</p>
      </div>
    </div>

    <!-- Scenario Trigger Palette -->
    <div class="incident-bar">
      <div class="incident-bar-title">
        <span>⚡ Incident Scenarios:</span>
        <span style="font-size: 0.78rem; font-weight: normal; color: var(--text-subtle);">Click to trigger alerts</span>
      </div>
      <div class="incident-buttons">
        <button class="btn btn-inc1" onclick="triggerIncident(1)">
          🔴 Trigger Incident 1 <span style="opacity: 0.85; font-size: 0.72rem; font-weight: normal;">(1 Alert)</span>
        </button>
        <button class="btn btn-inc2" onclick="triggerIncident(2)">
          🟠 Trigger Incident 2 <span style="opacity: 0.85; font-size: 0.72rem; font-weight: normal;">(3 Alerts: 2 Correlated)</span>
        </button>
        <button class="btn btn-inc3" onclick="triggerIncident(3)">
          🟣 Trigger Incident 3 <span style="opacity: 0.85; font-size: 0.72rem; font-weight: normal;">(5 Alerts: 3 Correlated)</span>
        </button>
        <button class="btn btn-clear" onclick="clearAlerts()">
          🧹 Clear Feed
        </button>
      </div>
    </div>

    <!-- Main Project Endpoints Bar -->
    <div class="api-card">
      <div style="font-weight: 600; font-size: 0.82rem; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
        <span>🔌 Endpoints for Autonomous Incident Engine:</span>
        <span style="font-weight: normal; color: var(--text-subtle); font-size: 0.75rem;">(Ingestion & Processing URLs)</span>
      </div>
      <div class="api-endpoints-row">
        <a href="/api/alerts" target="_blank" class="endpoint-tag">GET /api/alerts</a>
        <a href="/api/alerts/raw" target="_blank" class="endpoint-tag">GET /api/alerts/raw</a>
        <a href="/api/alerts/stats" target="_blank" class="endpoint-tag">GET /api/alerts/stats</a>
        <a href="/api/alerts/last" target="_blank" class="endpoint-tag">GET /api/alerts/last</a>
        <a href="/api/alerts/stream" target="_blank" class="endpoint-tag">GET /api/alerts/stream (SSE)</a>
      </div>
    </div>

    <!-- Telemetry KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Active Buffered Alerts</div>
        <div class="kpi-value" id="kpiTotal">0</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Correlated Alerts</div>
        <div class="kpi-value" style="color: var(--corr-fg);" id="kpiCorr">0</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Critical Alerts</div>
        <div class="kpi-value" style="color: var(--critical-fg);" id="kpiCrit">0</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Last Triggered</div>
        <div class="kpi-value" style="font-size: 1.15rem; color: #E5E5E5; margin-top: 6px;" id="kpiLastInc">None</div>
      </div>
    </div>

    <!-- Filter Controls -->
    <div class="controls">
      <div class="filter-chip active" onclick="setFilter('ALL', this)">All Alerts</div>
      <div class="filter-chip" onclick="setFilter('CORR', this)">🔗 Correlated Only</div>
      <div class="filter-chip" onclick="setFilter('CRITICAL', this)">🚨 Critical Only</div>
      <div class="filter-chip" onclick="setFilter('PAYMENT', this)">💳 Payment</div>
      <div class="filter-chip" onclick="setFilter('INVENTORY', this)">📦 Inventory</div>
      <div class="filter-chip" onclick="setFilter('SECURITY', this)">🛡️ Security</div>
      <div class="filter-chip" onclick="setFilter('INFRASTRUCTURE', this)">🖥️ Infrastructure</div>
      <div class="filter-chip" onclick="setFilter('ORDERS', this)">🛒 Orders</div>
    </div>

    <!-- Alert Feed Container -->
    <div class="feed" id="feed">
      <div class="empty-state" id="emptyState">
        <h3>No alerts currently active in buffer</h3>
        <p>Trigger any incident scenario above or fire an incident from the e-commerce store to populate live alerts.</p>
      </div>
    </div>
  </main>

  <script>
    let activeFilter = 'ALL';
    let totalCount = 0;
    let critCount = 0;
    let corrCount = 0;
    const MAX_DOM_ITEMS = 150;

    async function triggerIncident(id) {
      try {
        document.getElementById('kpiLastInc').innerText = `Incident ${id}`;
        const res = await fetch(`/api/incident/${id}`, { method: 'POST' });
        const data = await res.json();
        console.log(`Triggered Incident ${id}:`, data);
      } catch (err) {
        console.error('Trigger failed:', err);
      }
    }

    async function clearAlerts() {
      try {
        await fetch('/api/clear', { method: 'POST' });
        document.getElementById('feed').innerHTML = `
          <div class="empty-state" id="emptyState">
            <h3>No alerts currently active in buffer</h3>
            <p>Trigger any incident scenario above or fire an incident from the e-commerce store to populate live alerts.</p>
          </div>
        `;
        totalCount = 0;
        critCount = 0;
        corrCount = 0;
        document.getElementById('kpiLastInc').innerText = 'Cleared';
        updateKPIs();
      } catch (err) {
        console.error('Clear failed:', err);
      }
    }

    function setFilter(filter, el) {
      activeFilter = filter;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      applyFilter();
    }

    function applyFilter() {
      const cards = document.querySelectorAll('.alert-card');
      cards.forEach(card => {
        const sev = card.dataset.severity;
        const cat = card.dataset.category;
        const isCorr = card.dataset.correlated === 'true';

        let show = true;
        if (activeFilter === 'CORR') show = isCorr;
        else if (activeFilter === 'CRITICAL') show = (sev === 'CRITICAL');
        else if (activeFilter !== 'ALL') show = (cat === activeFilter);

        card.style.display = show ? 'grid' : 'none';
      });
    }

    function updateKPIs() {
      document.getElementById('kpiTotal').innerText = totalCount.toLocaleString();
      document.getElementById('kpiCrit').innerText = critCount.toLocaleString();
      document.getElementById('kpiCorr').innerText = corrCount.toLocaleString();
    }

    const feed = document.getElementById('feed');
    const evtSource = new EventSource('/stream');

    evtSource.onmessage = function(e) {
      try {
        const a = JSON.parse(e.data);
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.remove();

        totalCount++;
        if (a.severity === 'CRITICAL') critCount++;
        if (a.correlation_id) corrCount++;

        updateKPIs();

        const card = document.createElement('div');
        const isCorr = !!a.correlation_id;
        card.className = `alert-card ${a.severity} ${isCorr ? 'is-correlated' : ''}`;
        card.dataset.severity = a.severity;
        card.dataset.category = a.category;
        card.dataset.correlated = isCorr;

        const timeStr = a.timestamp_iso ? a.timestamp_iso.substring(11, 19) : new Date().toLocaleTimeString();

        let corrBadge = '';
        if (isCorr) {
          corrBadge = `<span class="corr-tag">🔗 ${a.incident_id || 'INC'} (Step ${a.sequence}/${a.total_in_cascade})</span>`;
        } else if (a.incident_id) {
          corrBadge = `<span class="corr-tag" style="background: rgba(38,38,38,0.8); border-color: #383838; color: #A3A3A3;">${a.incident_id}</span>`;
        }

        card.innerHTML = `
          <div>
            <span class="badge ${a.severity}">${a.severity}</span>
          </div>
          <div>
            <div class="alert-title">${a.rule_name}</div>
            <div class="alert-msg">${a.message}</div>
            <div class="alert-meta">
              <span>Category: <strong class="meta-tag">${a.category}</strong></span>
              <span>Service: <strong class="meta-tag">${a.service}</strong></span>
              ${corrBadge}
            </div>
          </div>
          <div class="time-tag">${timeStr}</div>
        `;

        let show = true;
        if (activeFilter === 'CORR') show = isCorr;
        else if (activeFilter === 'CRITICAL') show = (a.severity === 'CRITICAL');
        else if (activeFilter !== 'ALL') show = (a.category === activeFilter);
        card.style.display = show ? 'grid' : 'none';

        feed.insertBefore(card, feed.firstChild);

        while (feed.children.length > MAX_DOM_ITEMS) {
          feed.removeChild(feed.lastChild);
        }
      } catch (err) {
        console.error(err);
      }
    };
  </script>
</body>
</html>
"""


# ==============================================================================
# ASYNC HTTP & REST API SERVER (EXPOSING LOG AS ENDPOINTS)
# ==============================================================================

async def handle_http_request(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """Handle REST API endpoints, log queries, SSE streaming, and web UI."""
    global current_engine_instance
    try:
        request_line = await reader.readline()
        if not request_line:
            writer.close()
            return
        line = request_line.decode("utf-8", errors="ignore").strip()
        parts = line.split()
        if len(parts) < 2:
            writer.close()
            return
        method, full_path = parts[0], parts[1]

        # Read remaining headers
        while True:
            h_line = await reader.readline()
            if not h_line or h_line == b"\r\n":
                break

        # Parse query parameters
        parsed_url = urlparse(full_path)
        path = parsed_url.path.rstrip("/")
        if not path:
            path = "/"
        params = {k: v[0] for k, v in parse_qs(parsed_url.query).items()}

        # CORS Preflight
        if method == "OPTIONS":
            writer.write(b"HTTP/1.1 204 No Content\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(b"Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n")
            writer.write(b"Access-Control-Allow-Headers: *\r\n\r\n")
            await writer.drain()
            return

        # ----------------------------------------------------------------------
        # ENDPOINT 1: SSE Live Stream (/stream & /api/alerts/stream)
        # ----------------------------------------------------------------------
        if path in ("/stream", "/api/alerts/stream"):
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: text/event-stream\r\n")
            writer.write(b"Cache-Control: no-cache\r\n")
            writer.write(b"Connection: keep-alive\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n\r\n")
            await writer.drain()

            q: asyncio.Queue = asyncio.Queue(maxsize=100)
            stream_subscribers.append(q)
            try:
                while True:
                    alert = await q.get()
                    data = f"data: {json.dumps(alert)}\n\n"
                    writer.write(data.encode("utf-8"))
                    await writer.drain()
            except Exception:
                pass
            finally:
                if q in stream_subscribers:
                    stream_subscribers.remove(q)
            return

        # ----------------------------------------------------------------------
        # ENDPOINT 2: GET /api/alerts & /api/alerts/log (Main Queryable Log API)
        # ----------------------------------------------------------------------
        elif path in ("/api/alerts", "/api/alerts/log"):
            filepath = current_engine_instance.output_filepath if current_engine_instance else "alerts.jsonl"
            all_records = read_alerts_log(filepath)
            
            # If log file is empty or missing, fallback to in-memory buffer
            if not all_records and recent_alerts:
                all_records = list(recent_alerts)

            # Filtering logic
            filtered = all_records

            # Filter: severity
            if "severity" in params:
                req_sev = params["severity"].upper()
                filtered = [r for r in filtered if r.get("severity") == req_sev]

            # Filter: category
            if "category" in params:
                req_cat = params["category"].upper()
                filtered = [r for r in filtered if r.get("category", "").upper() == req_cat]

            # Filter: incident_id
            if "incident_id" in params:
                req_inc = params["incident_id"].upper()
                filtered = [r for r in filtered if (r.get("incident_id") or "").upper() == req_inc]

            # Filter: correlated_only
            if params.get("correlated_only", "").lower() in ("true", "1", "yes"):
                filtered = [r for r in filtered if r.get("correlation_id")]

            # Filter: since (epoch timestamp)
            if "since" in params:
                try:
                    since_val = float(params["since"])
                    filtered = [r for r in filtered if r.get("timestamp", 0) > since_val]
                except ValueError:
                    pass

            # Filter: since_id (returns alerts logged after this alert_id)
            if "since_id" in params:
                target_id = params["since_id"]
                found_idx = -1
                for idx, r in enumerate(filtered):
                    if r.get("alert_id") == target_id:
                        found_idx = idx
                        break
                if found_idx != -1:
                    filtered = filtered[found_idx + 1:]

            # Sorting (default: desc = newest first)
            order = params.get("order", "desc").lower()
            if order == "desc":
                filtered = list(reversed(filtered))

            # Limit
            limit = 100
            if "limit" in params:
                try:
                    limit = max(1, min(1000, int(params["limit"])))
                except ValueError:
                    pass
            paged = filtered[:limit]

            response_data = {
                "status": "OK",
                "count": len(paged),
                "total_matched": len(filtered),
                "total_logged": len(all_records),
                "log_file": filepath,
                "query_params": params,
                "alerts": paged,
            }
            body = json.dumps(response_data, indent=2).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 3: GET /api/alerts/raw & /api/alerts/jsonl (Verbatim NDJSON)
        # ----------------------------------------------------------------------
        elif path in ("/api/alerts/raw", "/api/alerts/jsonl"):
            filepath = current_engine_instance.output_filepath if current_engine_instance else "alerts.jsonl"
            content = ""
            if os.path.exists(filepath):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                except Exception as e:
                    content = f"# Error reading file: {e}\n"
            body = content.encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/x-ndjson; charset=utf-8\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 4: GET /api/alerts/stats (Aggregate Metrics for Consumers)
        # ----------------------------------------------------------------------
        elif path == "/api/alerts/stats":
            filepath = current_engine_instance.output_filepath if current_engine_instance else "alerts.jsonl"
            all_records = read_alerts_log(filepath)
            if not all_records and recent_alerts:
                all_records = list(recent_alerts)

            by_sev: Dict[str, int] = {}
            by_cat: Dict[str, int] = {}
            by_inc: Dict[str, int] = {}
            corr_count = 0

            for r in all_records:
                sev = r.get("severity", "UNKNOWN")
                by_sev[sev] = by_sev.get(sev, 0) + 1

                cat = r.get("category", "UNKNOWN")
                by_cat[cat] = by_cat.get(cat, 0) + 1

                inc = r.get("incident_id") or "UNASSIGNED"
                by_inc[inc] = by_inc.get(inc, 0) + 1

                if r.get("correlation_id"):
                    corr_count += 1

            stats_data = {
                "status": "OK",
                "total_alerts": len(all_records),
                "correlated_alerts": corr_count,
                "independent_alerts": len(all_records) - corr_count,
                "severity_breakdown": by_sev,
                "category_breakdown": by_cat,
                "incident_breakdown": by_inc,
                "latest_alert_timestamp": all_records[-1].get("timestamp") if all_records else None,
                "latest_alert_id": all_records[-1].get("alert_id") if all_records else None,
            }
            body = json.dumps(stats_data, indent=2).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 5: GET /api/alerts/last (Single Latest Alert)
        # ----------------------------------------------------------------------
        elif path == "/api/alerts/last":
            filepath = current_engine_instance.output_filepath if current_engine_instance else "alerts.jsonl"
            all_records = read_alerts_log(filepath)
            if not all_records and recent_alerts:
                all_records = list(recent_alerts)

            last_alert = all_records[-1] if all_records else None
            body = json.dumps({"status": "OK", "alert": last_alert}, indent=2).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 6: GET /recent (Recent Alerts Array)
        # ----------------------------------------------------------------------
        elif path == "/recent":
            body = json.dumps(recent_alerts[-50:], indent=2).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 7: Trigger Incident 1 (1 Alert)
        # ----------------------------------------------------------------------
        elif path.startswith("/api/incident/1"):
            if current_engine_instance:
                asyncio.create_task(current_engine_instance.trigger_incident_1())
            body = json.dumps({
                "status": "TRIGGERED",
                "incident": 1,
                "incident_id": "INC-101",
                "expected_alerts": 1,
                "correlated": 0
            }).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 8: Trigger Incident 2 (3 Alerts: 2 Correlated + 1 Independent)
        # ----------------------------------------------------------------------
        elif path.startswith("/api/incident/2"):
            if current_engine_instance:
                asyncio.create_task(current_engine_instance.trigger_incident_2())
            body = json.dumps({
                "status": "TRIGGERED",
                "incident": 2,
                "incident_id": "INC-202",
                "expected_alerts": 3,
                "correlated": 2
            }).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 9: Trigger Incident 3 (5 Alerts: 3 Correlated + 2 Independent)
        # ----------------------------------------------------------------------
        elif path.startswith("/api/incident/3"):
            if current_engine_instance:
                asyncio.create_task(current_engine_instance.trigger_incident_3())
            body = json.dumps({
                "status": "TRIGGERED",
                "incident": 3,
                "incident_id": "INC-303",
                "expected_alerts": 5,
                "correlated": 3
            }).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 10: Clear Alerts
        # ----------------------------------------------------------------------
        elif path.startswith("/api/clear"):
            recent_alerts.clear()
            if current_engine_instance and current_engine_instance.output_filepath:
                try:
                    open(current_engine_instance.output_filepath, "w", encoding="utf-8").close()
                except Exception:
                    pass
            body = json.dumps({"status": "CLEARED"}).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 11: Interactive Dashboard UI
        # ----------------------------------------------------------------------
        elif path in ("/", "/dashboard"):
            body = DASHBOARD_HTML.encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: text/html; charset=utf-8\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

        # ----------------------------------------------------------------------
        # ENDPOINT 12: API Discovery & Documentation Index
        # ----------------------------------------------------------------------
        else:
            info = {
                "service": "ecommerce-alert-engine",
                "status": "ONLINE",
                "dashboard": "http://localhost:8000/",
                "api_endpoints": {
                    "/api/alerts": "Queryable JSON alerts log (?limit=50&severity=CRITICAL&category=PAYMENT&incident_id=INC-202&since=TIMESTAMP)",
                    "/api/alerts/raw": "Raw NDJSON alerts.jsonl file stream",
                    "/api/alerts/stats": "Aggregated metrics breakdown by severity, category, and incident",
                    "/api/alerts/last": "Get single latest alert object",
                    "/api/alerts/stream": "Server-Sent Events (SSE) live push stream",
                    "/api/incident/1": "POST to trigger Incident 1 (1 alert)",
                    "/api/incident/2": "POST to trigger Incident 2 (3 alerts: 2 correlated)",
                    "/api/incident/3": "POST to trigger Incident 3 (5 alerts: 3 correlated)",
                    "/api/clear": "POST to clear alerts log",
                },
                "total_buffered": len(recent_alerts),
            }
            body = json.dumps(info, indent=2).encode("utf-8")
            writer.write(b"HTTP/1.1 200 OK\r\n")
            writer.write(b"Content-Type: application/json\r\n")
            writer.write(b"Access-Control-Allow-Origin: *\r\n")
            writer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
            writer.write(body)
            await writer.drain()

    except Exception:
        pass
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass


async def start_http_stream_server(port: int = 8001):
    """Starts the background SSE & REST API HTTP server."""
    try:
        server = await asyncio.start_server(handle_http_request, "0.0.0.0", port)
        print(f"\n{COLOR_BOLD}================================================================{COLOR_RESET}")
        print(f"{COLOR_BOLD}🚀 E-COMMERCE INCIDENT & LOG API SERVER ONLINE{COLOR_RESET}")
        print(f"Interactive Dashboard:    {COLOR_BOLD}http://localhost:{port}/{COLOR_RESET}")
        print(f"Log Query API:            {COLOR_BOLD}GET  http://localhost:{port}/api/alerts{COLOR_RESET}")
        print(f"Raw NDJSON Stream:        {COLOR_BOLD}GET  http://localhost:{port}/api/alerts/raw{COLOR_RESET}")
        print(f"Stats API:                {COLOR_BOLD}GET  http://localhost:{port}/api/alerts/stats{COLOR_RESET}")
        print(f"Live SSE Stream:          {COLOR_BOLD}GET  http://localhost:{port}/api/alerts/stream{COLOR_RESET}")
        print(f"Incident 1 (1 Alert):     {COLOR_BOLD}POST http://localhost:{port}/api/incident/1{COLOR_RESET}")
        print(f"Incident 2 (3 Alerts):    {COLOR_BOLD}POST http://localhost:{port}/api/incident/2{COLOR_RESET}")
        print(f"Incident 3 (5 Alerts):    {COLOR_BOLD}POST http://localhost:{port}/api/incident/3{COLOR_RESET}")
        print(f"Storefront:               {COLOR_BOLD}http://localhost:3000{COLOR_RESET}")
        print(f"{COLOR_BOLD}================================================================{COLOR_RESET}\n")
        async with server:
            await server.serve_forever()
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Warning: Could not bind HTTP server on port {port}: {e}")


# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================

def main():
    global current_engine_instance
    parser = argparse.ArgumentParser(description="E-commerce 3-Incident Alert Engine + Log API")
    parser.add_argument("--output", type=str, default="alerts.jsonl", help="Output file (default: alerts.jsonl)")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8001)), help="HTTP port (default: 8001 or $PORT)")
    parser.add_argument(
        "--backend-url",
        type=str,
        default=os.environ.get("BACKEND_URL", "http://localhost:8000/api/v1/alerts/ingest"),
        help="Backend ingest URL (default: http://localhost:8000/api/v1/alerts/ingest or $BACKEND_URL)"
    )

    args = parser.parse_args()

    engine = AlertEngine(output_filepath=args.output, backend_url=args.backend_url)
    current_engine_instance = engine

    # Ensure output file exists
    if not os.path.exists(args.output):
        try:
            open(args.output, "w", encoding="utf-8").close()
        except Exception:
            pass

    try:
        asyncio.run(start_http_stream_server(port=args.port))
    except KeyboardInterrupt:
        print("\nAlert engine stopped by user.")


if __name__ == "__main__":
    main()
