@echo off
title E-Commerce Platform + Correlated Alert Engine
echo ================================================================
echo Starting E-Commerce Platform (React) and Alert Engine...
echo ================================================================

start "E-Commerce Web Platform (Port 3000)" cmd /k "cd react-e-commerce- && npm start"
timeout /t 3 >nul

echo Starting Alert Engine (~5 alerts/sec with Correlated Cascades)...
.\venv\Scripts\python.exe ecommerce_alert_engine.py --rate 5 --output alerts.jsonl
pause
