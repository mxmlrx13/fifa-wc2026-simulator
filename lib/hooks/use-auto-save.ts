'use client'

import { useRef, useCallback, useState, useEffect } from 'react'

type SaveStatus = 'hidden' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions {
  debounceMs?: number
  onSave: () => Promise<boolean>
}

export function useAutoSave({
  debounceMs = 1500,
  onSave,
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('hidden')
  const [dirty, setDirty] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retriesRef = useRef(0)
  const onSaveRef = useRef(onSave)
  const savingRef = useRef(false)
  const executeSaveRef = useRef<(() => Promise<void>) | undefined>(undefined)

  // Keep onSave ref in sync
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  // Define the save function using a ref so it can self-reference for retries
  useEffect(() => {
    executeSaveRef.current = async () => {
      if (savingRef.current) {
        // A save is in-flight — reschedule so we don't lose this change
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => executeSaveRef.current?.(), 500)
        return
      }
      savingRef.current = true
      setStatus('saving')

      const ok = await onSaveRef.current()

      savingRef.current = false

      if (ok) {
        setStatus('saved')
        setDirty(false)
        retriesRef.current = 0
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'hidden' : s)), 2000)
      } else {
        retriesRef.current += 1
        if (retriesRef.current < 3) {
          setTimeout(() => executeSaveRef.current?.(), 2000)
        } else {
          setStatus('error')
        }
      }
    }
  }, [])

  const markDirty = useCallback(() => {
    setDirty(true)
    retriesRef.current = 0
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      executeSaveRef.current?.()
    }, debounceMs)
  }, [debounceMs])

  const retry = useCallback(() => {
    retriesRef.current = 0
    executeSaveRef.current?.()
  }, [])

  // beforeunload warning while dirty
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { status, markDirty, retry, dirty }
}
