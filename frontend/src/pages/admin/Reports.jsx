import { useMemo, useState } from 'react'
import '../../App.css'

function Reports({ requests = [] }) {
  const [period, setPeriod] = useState('This week')
  const completed = requests.filter((request) => request.status === 'Completed').length
  const reportRows = useMemo(() => [
    { id: 'LIVE-REQUESTS', title: 'Service requests', period, type: 'Operations', value: `${requests.length} requests` },
    { id: 'LIVE-RESOLVED', title: 'Resolved requests', period, type: 'Analytics', value: `${completed} completed` },
  ], [completed, period, requests.length])

  return (
    <section className="reports-page">
      <div className="admin-stat-grid report-stat-grid">
        <div className="admin-stat"><span className="stat-icon stat-blue">↗</span><small>Total requests</small><strong>{requests.length}</strong><em>Live from database</em></div>
        <div className="admin-stat"><span className="stat-icon stat-green">✓</span><small>Resolved requests</small><strong>{completed}</strong><em>{requests.length ? Math.round((completed / requests.length) * 100) : 0}% completion rate</em></div>
        <div className="admin-stat"><span className="stat-icon stat-amber">◷</span><small>Needs attention</small><strong>{requests.filter((request) => request.status !== 'Completed').length}</strong><em className="stat-warning">Pending or in progress</em></div>
      </div>
      <section className="admin-panel">
        <div className="panel-heading">
          <div><p className="admin-kicker">Performance overview</p><h2>Reports</h2></div>
          <select className="report-period" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Report period"><option>This week</option><option>This month</option><option>Last 90 days</option></select>
        </div>
        <div className="report-chart" aria-label={`Requests for ${period}`}>
          {['Pending', 'In progress', 'Completed'].map((status) => {
            const count = requests.filter((request) => request.status === status).length
            const height = requests.length ? Math.max(8, (count / requests.length) * 100) : 8
            return <div className="chart-column" key={status}><span style={{ height: `${height}%` }} /><small>{status}</small></div>
          })}
        </div>
      </section>
      <section className="admin-panel">
        <div className="panel-heading"><div><p className="admin-kicker">Saved exports</p><h2>Available reports</h2></div><button type="button">Export all ↓</button></div>
        <div className="report-list">{reportRows.map((report) => <div className="report-row" key={report.id}><span className="report-file-icon">▤</span><span><strong>{report.title}</strong><small>{report.id} · {report.period}</small></span><span className="report-type">{report.type}</span><strong className="report-value">{report.value}</strong><button type="button">Download</button></div>)}</div>
      </section>
    </section>
  )
}

export default Reports
