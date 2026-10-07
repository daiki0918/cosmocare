import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import '../../App.css'

function ActivityLogs() {
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  useEffect(() => {
    api('/api/activity-logs').then(setLogs).catch((requestError) => setError(requestError.message))
  }, [])
  const pages = Math.max(1, Math.ceil(logs.length / pageSize))
  const visible = logs.slice((page - 1) * pageSize, page * pageSize)

  return (
    <section className="admin-panel activity-panel">
      <div className="panel-heading"><div><p className="admin-kicker">Security and accountability</p><h2>Activity log</h2></div><button type="button" onClick={() => setLogs([])}>Clear log</button></div>
      <p className="service-offers-help">Review actions performed by administrators, staff, and chapel accounts.</p>
      {error && <p className="account-form-error" role="alert">{error}</p>}
      <div className="activity-list">{visible.map((log) => <div className="activity-row" key={log.id}><span className={`activity-avatar ${log.tone}`}>{log.user.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span><strong>{log.action}</strong><small>{log.user} · {log.role}</small><em>{log.detail}</em></span><time>{log.time}</time></div>)}{visible.length === 0 && <p className="activity-empty">No activity recorded.</p>}</div>
      <div className="table-pagination"><span>{logs.length} activities total</span>{pages > 1 && <div className="pagination"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button></div>}</div>
    </section>
  )
}

export default ActivityLogs
