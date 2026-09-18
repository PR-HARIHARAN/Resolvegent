@echo off
title E-Commerce Platform Alert Engine
echo ================================================================
echo Running E-Commerce Platform Alert Engine
echo Base URL: http://localhost:8001
echo Stream URL: http://localhost:8001/stream
echo Output File: alerts.jsonl
echo Auto-Forward to Backend: http://localhost:8000/api/v1/alerts/ingest
echo ================================================================
.\venv\Scripts\python.exe ecommerce_alert_engine.py --port 8001 --output alerts.jsonl
pause
