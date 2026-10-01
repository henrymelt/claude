type SaveOutcome = 'saved' | 'declined' | 'failed'

interface DownloadsNamespace {
  save(req: { filename: string; data: string }): Promise<unknown>
}

interface ClaudeHost {
  use(name: 'downloads'): Promise<DownloadsNamespace | null>
}

/**
 * Offer a text file to the user. Inside the claude.ai artifact viewer, page-initiated
 * downloads are blocked, so the save goes through the viewer's `downloads` capability
 * (which asks the user to confirm). Everywhere else a normal browser download is used.
 */
export async function saveTextFile(filename: string, text: string, type = 'application/json'): Promise<SaveOutcome> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude
  if (host?.use) {
    const downloads = await host.use('downloads').catch(() => null)
    if (!downloads) return 'failed'
    try {
      await downloads.save({ filename, data: text })
      return 'saved'
    } catch (e) {
      return (e as { code?: string }).code === 'declined' ? 'declined' : 'failed'
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'saved'
}
