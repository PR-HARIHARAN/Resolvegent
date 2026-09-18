import * as React from 'react'
import { createBrowserRouter, Navigate, Link } from 'react-router-dom'
import { AppShell } from './app'

import { OverviewPage } from '@/pages/overview'
import { IncidentsListPage } from '@/pages/incidents_list'
import { IncidentDetailPage } from '@/pages/incident_detail'
import { AlertsPage } from '@/pages/alerts_page'
import { MemoryPage } from '@/pages/memory_page'
import { AuditPage } from '@/pages/audit_page'

const NotFoundPage: React.FC = () => (
  <div className="max-w-md mx-auto mt-24 text-center space-y-4">
    <div className="text-4xl font-light text-zinc-300">404</div>
    <div className="text-sm font-medium text-zinc-400">Route Not Found</div>
    <p className="text-xs text-zinc-500">
      The requested endpoint does not exist.
    </p>
    <div className="pt-2">
      <Link
        to="/overview"
        className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
      >
        Return to Overview
      </Link>
    </div>
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'incidents', element: <IncidentsListPage /> },
      { path: 'incidents/:id', element: <IncidentDetailPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'memory', element: <MemoryPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
