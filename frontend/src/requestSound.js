let audioContext

function playChime(context) {
  const startAt = context.currentTime + 0.02
  const notes = [
    { frequency: 784, start: 0, duration: 0.15 },
    { frequency: 1046, start: 0.13, duration: 0.22 },
  ]

  notes.forEach(({ frequency, start, duration }) => {
    const oscillator = context.createOscillator()
    const volume = context.createGain()
    const noteStart = startAt + start
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    volume.gain.setValueAtTime(0.0001, noteStart)
    volume.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.025)
    volume.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration)
    oscillator.connect(volume)
    volume.connect(context.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + duration)
  })
}

export async function activateRequestSound() {
  if (!window.AudioContext) return false
  try {
    audioContext ||= new window.AudioContext()
    await audioContext.resume()
    playChime(audioContext)
    return true
  } catch (error) {
    console.error('Unable to activate request alert sound.', error)
    return false
  }
}

export async function playRequestAlert() {
  if (!audioContext) return false
  try {
    if (audioContext.state === 'suspended') await audioContext.resume()
    playChime(audioContext)
    return true
  } catch (error) {
    console.error('Unable to play new request alert sound.', error)
    return false
  }
}
