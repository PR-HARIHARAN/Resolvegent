import React, { useState, useEffect, useRef } from 'react';

const ALERT_ENGINE_URL = 'http://localhost:8001';
const COMMAND_CENTER_URL = 'http://localhost:5173/overview';

export default function AlertNotificationOverlay() {
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [triggering, setTriggering] = useState(null);
  const eventSourceRef = useRef(null);

  // Fetch recent alerts on mount
  useEffect(() => {
    fetch(`${ALERT_ENGINE_URL}/api/alerts?limit=50`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.alerts) && data.alerts.length > 0) {
          setAlerts(data.alerts);
          setIsBannerDismissed(false);
        }
      })
      .catch(() => {});

    function connectSSE() {
      try {
        const es = new EventSource(`${ALERT_ENGINE_URL}/stream`);
        eventSourceRef.current = es;

        es.onopen = () => {
          setConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const alert = JSON.parse(event.data);
            setAlerts(prev => [alert, ...prev.slice(0, 49)]);
            setIsBannerDismissed(false);

            // Add to system operational toast notifications
            const toastId = alert.alert_id || Math.random().toString();
            setToasts(prev => [{ ...alert, toastId }, ...prev.slice(0, 2)]);

            // Auto-dismiss toast after 7 seconds
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.toastId !== toastId));
            }, 7000);
          } catch (err) {
            console.error('Error parsing SSE alert:', err);
          }
        };

        es.onerror = () => {
          setConnected(false);
          es.close();
          setTimeout(connectSSE, 4000);
        };
      } catch (e) {
        setConnected(false);
      }
    }

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const triggerIncident = async (id) => {
    try {
      setTriggering(id);
      await fetch(`${ALERT_ENGINE_URL}/api/incident/${id}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to trigger incident:', e);
    } finally {
      setTimeout(() => setTriggering(null), 800);
    }
  };

  const clearAlerts = async () => {
    try {
      await fetch(`${ALERT_ENGINE_URL}/api/clear`, { method: 'POST' });
      setAlerts([]);
      setToasts([]);
      setIsBannerDismissed(false);
    } catch (e) {
      console.error('Failed to clear alerts:', e);
    }
  };

  const dismissToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

  const activeAlert = alerts.length > 0 ? alerts[0] : null;
  const isCritical = activeAlert && (activeAlert.severity === 'CRITICAL' || activeAlert.severity === 'ERROR');

  // Determine services health status for the diagnostics matrix
  const serviceStatuses = {
    'checkout-service': alerts.some(a => a.service === 'checkout-service' || a.category === 'PAYMENT') ? 'DEGRADED' : 'HEALTHY',
    'order-service': alerts.some(a => a.service === 'order-service' || a.category === 'ORDERS') ? 'DEGRADED' : 'HEALTHY',
    'inventory-service': alerts.some(a => a.service === 'inventory-service' || a.category === 'INVENTORY') ? 'DEGRADED' : 'HEALTHY',
    'postgres-cluster': alerts.some(a => a.service === 'postgres-cluster' || a.category === 'INFRASTRUCTURE') ? 'DEGRADED' : 'HEALTHY',
  };

  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* 1. TOP SYSTEM INCIDENT / STATUS BANNER (REAL PRODUCTION STYLE)     */}
      {/* ----------------------------------------------------------------- */}
      {alerts.length > 0 && !isBannerDismissed ? (
        <div style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100000,
          background: isCritical
            ? 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 50%, #450a0a 100%)'
            : 'linear-gradient(90deg, #7c2d12 0%, #9a3412 50%, #431407 100%)',
          color: '#ffffff',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          animation: 'slideDown 0.3s ease-out',
        }}>
          {/* Left: Incident Warning & Affected Service */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ff4444',
                display: 'inline-block',
                boxShadow: '0 0 8px #ff4444',
                animation: 'pulse 1.2s infinite'
              }}></span>
              BACKEND INCIDENT ACTIVE
            </span>

            {activeAlert.incident_id && (
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'monospace'
              }}>
                {activeAlert.incident_id}
              </span>
            )}

            <span style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#fef08a',
              fontFamily: 'monospace',
              fontWeight: 600
            }}>
              [{activeAlert.service || 'backend'}]
            </span>

            <span style={{ fontSize: '13px', fontWeight: 500, color: '#fef2f2', letterSpacing: '-0.01em' }}>
              <strong>{activeAlert.rule_name}:</strong> {activeAlert.message}
            </span>
          </div>

          {/* Right: Operational Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowDiagnostics(true)}
              style={{
                background: '#ffffff',
                color: '#173f35',
                border: 'none',
                padding: '6px 13px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.15s ease'
              }}
            >
              📊 System Diagnostics ({alerts.length})
            </button>

            <a
              href={COMMAND_CENTER_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.35)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ⚡ Command Center (5173) ↗
            </a>

            <button
              onClick={() => setIsBannerDismissed(true)}
              title="Minimize incident banner"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '2px 6px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* Top Minimal Operational Status Strip (When nominal or minimized) */
        <div style={{
          background: alerts.length > 0 ? '#450a0a' : '#173f35',
          color: '#ffffff',
          fontSize: '11px',
          padding: '4px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: alerts.length > 0 ? '#ef4444' : '#22c55e',
              display: 'inline-block',
              boxShadow: alerts.length > 0 ? '0 0 6px #ef4444' : '0 0 6px #22c55e'
            }}></span>
            <span>
              {alerts.length > 0
                ? `Service Degradation Active (${alerts.length} Alerts) · Remediation In Progress`
                : 'All E-Commerce Backend Services Operational'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
              Engine: <strong style={{ color: connected ? '#86efac' : '#fca5a5' }}>{connected ? 'ONLINE (8001)' : 'DISCONNECTED'}</strong>
            </span>
            <button
              onClick={() => { setShowDiagnostics(true); setIsBannerDismissed(false); }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff',
                borderRadius: '3px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🛠️ Backend Diagnostics
            </button>
            <a
              href="http://localhost:5173/overview"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#86efac', textDecoration: 'none', fontWeight: 600, fontSize: '10px' }}
            >
              Resolvegent Command (5173) ↗
            </a>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. REALISTIC BACKEND SYSTEM TELEMETRY TOAST NOTIFICATIONS          */}
      {/* ----------------------------------------------------------------- */}
      <div style={{
        position: 'fixed',
        top: '60px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => {
          const isCriticalToast = t.severity === 'CRITICAL' || t.severity === 'ERROR';
          const isCorr = !!t.correlation_id;
          return (
            <div
              key={t.toastId}
              onClick={() => { setShowDiagnostics(true); dismissToast(t.toastId); }}
              style={{
                pointerEvents: 'auto',
                background: '#173f35',
                color: '#ffffff',
                borderLeft: `5px solid ${isCriticalToast ? '#ef4444' : '#f59e0b'}`,
                border: '1px solid #2d6a5b',
                borderRadius: '6px',
                padding: '12px 16px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                cursor: 'pointer',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                animation: 'slideInRight 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: isCriticalToast ? '#dc2626' : '#d97706',
                    color: '#ffffff',
                    letterSpacing: '0.04em'
                  }}>
                    SYSTEM {t.severity}
                  </span>
                  <span style={{ fontSize: '11px', color: '#a7f3d0', fontFamily: 'monospace', fontWeight: 600 }}>
                    [{t.service || 'backend'}]
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                  {t.timestamp_iso ? t.timestamp_iso.substring(11, 19) : 'Just now'}
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff', marginBottom: '3px' }}>
                {t.rule_name}
              </div>

              <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.4', marginBottom: '6px' }}>
                {t.message}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#a7f3d0' }}>
                <span>Category: <strong>{t.category}</strong></span>
                {isCorr && (
                  <span style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontWeight: 600
                  }}>
                    🔗 {t.incident_id} (Step {t.sequence}/{t.total_in_cascade})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. ENTERPRISE BACKEND SERVICE HEALTH & INCIDENT DIAGNOSTICS MODAL  */}
      {/* ----------------------------------------------------------------- */}
      {showDiagnostics && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 100010,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
          <div style={{
            background: '#ffffff',
            color: '#1e293b',
            width: '850px',
            maxWidth: '96vw',
            maxHeight: '90vh',
            borderRadius: '10px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #cbd5e1'
          }}>
            {/* Modal Header styled in CARA theme */}
            <div style={{
              background: '#173f35',
              color: '#ffffff',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #0f2c25'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                    CARA Storefront · Backend Reliability & Diagnostics
                  </h2>
                  <span style={{
                    fontSize: '11px',
                    background: alerts.length > 0 ? '#ef4444' : '#22c55e',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700
                  }}>
                    {alerts.length > 0 ? `${alerts.length} ISSUES DETECTED` : 'ALL SYSTEMS NOMINAL'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#a7f3d0', margin: '4px 0 0 0' }}>
                  Real-time telemetry connected to E-Commerce Alert Engine (Port 8001) & Resolvegent Incident Engine (Port 8000)
                </p>
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Service Health Matrix */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Microservice Health Matrix:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {Object.entries(serviceStatuses).map(([srv, status]) => {
                    const isDegraded = status === 'DEGRADED';
                    return (
                      <div
                        key={srv}
                        style={{
                          background: isDegraded ? '#fef2f2' : '#f0fdf4',
                          border: `1px solid ${isDegraded ? '#fecaca' : '#bbf7d0'}`,
                          borderRadius: '6px',
                          padding: '10px 14px'
                        }}
                      >
                        <div style={{ fontSize: '11px', color: isDegraded ? '#991b1b' : '#166534', fontWeight: 700, fontFamily: 'monospace' }}>
                          {srv}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isDegraded ? '#ef4444' : '#22c55e',
                            display: 'inline-block'
                          }}></span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isDegraded ? '#b91c1c' : '#15803d' }}>
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulation Scenario Trigger Bar */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    ⚡ Simulate Production Incidents:
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Fires real alerts into Alert Engine (8001) & triggers AI remediation (5173)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => triggerIncident(1)}
                    disabled={triggering === 1}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🔴 Incident 1: Checkout Timeout (1 Alert)
                  </button>

                  <button
                    onClick={() => triggerIncident(2)}
                    disabled={triggering === 2}
                    style={{
                      background: '#f59e0b',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🟠 Incident 2: Latency & Stock (3 Alerts)
                  </button>

                  <button
                    onClick={() => triggerIncident(3)}
                    disabled={triggering === 3}
                    style={{
                      background: '#8b5cf6',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🟣 Incident 3: Cascading Failure (5 Alerts)
                  </button>

                  <button
                    onClick={clearAlerts}
                    style={{
                      background: '#64748b',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🧹 Clear System
                  </button>
                </div>
              </div>

              {/* Ingested Alerts Telemetry Log */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Active Telemetry & Alert Stream:
                </div>
                {alerts.length === 0 ? (
                  <div style={{
                    padding: '30px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b'
                  }}>
                    <p style={{ fontWeight: 600, margin: 0, color: '#166534' }}>✓ No active system errors or alerts detected.</p>
                    <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>All store transactions, stock checks, and checkout queues are executing nominally.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {alerts.map(a => {
                      const isCrit = a.severity === 'CRITICAL' || a.severity === 'ERROR';
                      return (
                        <div
                          key={a.alert_id}
                          style={{
                            background: isCrit ? '#fef2f2' : '#fffbeb',
                            border: `1px solid ${isCrit ? '#fecaca' : '#fde68a'}`,
                            borderLeft: `4px solid ${isCrit ? '#ef4444' : '#f59e0b'}`,
                            borderRadius: '6px',
                            padding: '10px 14px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '3px',
                                background: isCrit ? '#dc2626' : '#d97706',
                                color: '#ffffff'
                              }}>
                                {a.severity}
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: '#334155' }}>
                                [{a.service}] {a.rule_name}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                              {a.timestamp_iso ? a.timestamp_iso.substring(11, 19) : ''}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#1e293b', marginBottom: '4px' }}>
                            {a.message}
                          </div>

                          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                            <span>Category: <strong>{a.category}</strong></span>
                            {a.incident_id && (
                              <span style={{ color: '#7c3aed', fontWeight: 600 }}>
                                Incident: {a.incident_id}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Storefront connected to Resolvegent Autonomous SRE Agent
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={COMMAND_CENTER_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#173f35',
                    color: '#ffffff',
                    textDecoration: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ⚡ Open Resolvegent Command Center (Port 5173) ↗
                </a>
                <button
                  onClick={() => setShowDiagnostics(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '8px 14px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
