import { useState } from 'react'
import '../../App.css'

function AdminSettings() {
  const [settings, setSettings] = useState({ name: 'CosmoCare Servicing', email: 'admin@cosmocare.com', notifications: true, autoRefresh: true })
  const [saved, setSaved] = useState(false)
  const update = (event) => {
    const { name, value, type, checked } = event.target
    setSettings((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setSaved(false)
  }

  return (
    <section className="settings-page">
      <section className="admin-panel settings-panel">
        <div className="panel-heading"><div><p className="admin-kicker">Workspace preferences</p><h2>General settings</h2></div></div>
        <div className="settings-form">
          <label>Organization name<input name="name" value={settings.name} onChange={update} /></label>
          <label>Administrator email<input name="email" type="email" value={settings.email} onChange={update} /></label>
        </div>
      </section>
      <section className="admin-panel settings-panel">
        <div className="panel-heading"><div><p className="admin-kicker">Communication</p><h2>Notifications</h2></div></div>
        <label className="setting-toggle"><input type="checkbox" name="notifications" checked={settings.notifications} onChange={update} /><span /><b>Team notifications</b><small>Receive alerts when staff send suggestions or messages.</small></label>
        <label className="setting-toggle"><input type="checkbox" name="autoRefresh" checked={settings.autoRefresh} onChange={update} /><span /><b>Live dashboard updates</b><small>Refresh request activity automatically when new data arrives.</small></label>
      </section>
      <button className="save-services-button settings-save" type="button" onClick={() => setSaved(true)}>Save settings</button>
      {saved && <p className="suggestion-success settings-saved" role="status">Settings saved successfully.</p>}
    </section>
  )
}

export default AdminSettings
