import { useState } from 'react'
import { activateRequestSound } from './requestSound.js'

function RequestSoundControl({ enabled, onEnabledChange }) {
  const [error, setError] = useState('')

  const toggleSound = async () => {
    if (enabled) {
      onEnabledChange(false)
      setError('')
      return
    }
    const activated = await activateRequestSound()
    onEnabledChange(activated)
    setError(activated ? '' : 'Sound is unavailable. Check browser audio permissions.')
  }

  return (
    <div className="request-sound-control">
      <button
        className={`request-sound-toggle ${enabled ? 'enabled' : ''}`}
        type="button"
        aria-pressed={enabled}
        onClick={toggleSound}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {enabled
            ? <><path d="M4 10v4h4l5 4V6l-5 4H4Z" /><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11" /></>
            : <><path d="M4 10v4h4l5 4V6l-5 4H4Z" /><path d="m17 9 5 6m0-6-5 6" /></>}
        </svg>
        {enabled ? 'Sound on' : 'Enable sound'}
      </button>
      {error && <span className="request-sound-error" role="status">{error}</span>}
    </div>
  )
}

export default RequestSoundControl
