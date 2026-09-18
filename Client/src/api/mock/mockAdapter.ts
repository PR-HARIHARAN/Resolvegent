import type {
  Incident,
  Alert,
  AuditEvent,
  MemoryRecord,
  ApprovalRequest,
} from '@/types'
import {
  mockIncident,
  mockIncidentsList,
  mockAlerts,
  mockAuditTrail,
  mockMemoryRecords,
} from './mockData'

// Simulated realistic async latency (configurable for fast testing)
const DEFAULT_DELAY_MS = 60

const wait = (ms: number = DEFAULT_DELAY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Mock API Adapter for Resolvegent Operational Control Plane
 */

export async function getIncidents(): Promise<Incident[]> {
  await wait()
  return [...mockIncidentsList]
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  await wait()
  if (id === mockIncident.id || id.toUpperCase() === 'INC-8492') {
    return { ...mockIncident }
  }
  const found = mockIncidentsList.find((inc) => inc.id === id)
  return found ? { ...found } : { ...mockIncident, id }
}

export async function getAlerts(): Promise<Alert[]> {
  await wait()
  return [...mockAlerts]
}

export async function getAuditTrail(incidentId?: string): Promise<AuditEvent[]> {
  await wait()
  if (incidentId) {
    return mockAuditTrail.filter((event) => event.incidentId === incidentId)
  }
  return [...mockAuditTrail]
}

export async function getMemoryMatches(incidentId?: string): Promise<MemoryRecord[]> {
  await wait()
  if (incidentId) {
    return [...mockMemoryRecords]
  }
  return [...mockMemoryRecords]
}

export async function approveAction(
  approvalId: string,
  approver: string = 'sre-lead@company.com',
  comments?: string
): Promise<ApprovalRequest> {
  await wait(120)
  return {
    id: approvalId,
    incidentId: 'INC-8492',
    actionId: 'act-restart-worker',
    actionName: 'restart_payment_worker',
    status: 'APPROVED',
    requestedAt: '2026-09-18T11:40:15Z',
    decidedAt: new Date().toISOString(),
    approver,
    approverRole: 'Principal SRE',
    comments: comments || 'Approved via control plane.',
    executionStatus: 'SUCCESS',
  }
}

export async function rejectAction(
  approvalId: string,
  approver: string = 'sre-lead@company.com',
  comments?: string
): Promise<ApprovalRequest> {
  await wait(120)
  return {
    id: approvalId,
    incidentId: 'INC-8492',
    actionId: 'act-restart-worker',
    actionName: 'restart_payment_worker',
    status: 'REJECTED',
    requestedAt: '2026-09-18T11:40:15Z',
    decidedAt: new Date().toISOString(),
    approver,
    approverRole: 'Principal SRE',
    comments: comments || 'Rejected by operator.',
    executionStatus: 'FAILED',
  }
}

export interface SystemMetrics {
  activeIncidents: number
  pendingApprovals: number
  mttrMinutes: number
  agentResolutionRate: number
  totalAlertsIngested: number
  telemetryLatencyMs: number
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  await wait()
  return {
    activeIncidents: 3,
    pendingApprovals: 1,
    mttrMinutes: 4.4,
    agentResolutionRate: 94.2,
    totalAlertsIngested: 1420,
    telemetryLatencyMs: 14,
  }
}
