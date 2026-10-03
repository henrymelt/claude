import { useEffect, useState } from 'react'

/**
 * 'persistent'  the browser has promised not to clear the ledger to free up space
 * 'best-effort' it may clear it under storage pressure (export backups regularly)
 * 'unknown'     the browser doesn't report it, or we haven't asked yet
 */
export type StorageStatus = 'persistent' | 'best-effort' | 'unknown'

/**
 * Asks the browser to keep this site's storage permanently once there is real data to protect.
 * Installed web apps (Dock / Home Screen / Chrome install) are usually granted this automatically.
 */
export function useStoragePersistence(hasOwnData: boolean): StorageStatus {
  const [status, setStatus] = useState<StorageStatus>('unknown')
  useEffect(() => {
    const storage = navigator.storage
    if (!storage?.persisted) return
    let cancelled = false
    void (async () => {
      try {
        let persistent = await storage.persisted()
        // Firefox shows a permission prompt for this, so only ask once the user has entries worth keeping.
        if (!persistent && hasOwnData && storage.persist) persistent = await storage.persist()
        if (!cancelled) setStatus(persistent ? 'persistent' : 'best-effort')
      } catch {
        if (!cancelled) setStatus('unknown')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasOwnData])
  return status
}
