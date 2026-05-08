import { loadConfig, clearConfig } from '../storage'

interface SettingsPanelProps {
  projectName: string
  apiUrl: string
}

export function SettingsPanel({ projectName, apiUrl }: SettingsPanelProps) {
  const config = loadConfig(projectName)

  function handleResetDatabase() {
    if (!confirm('Reset the cached Notion database ID? The next comment will create a new database.')) return
    clearConfig(projectName)
    window.location.reload()
  }

  return (
    <div className="df-flex df-flex-col df-gap-4 df-p-4">
      {[
        { label: 'Project', value: projectName },
        { label: 'API URL', value: apiUrl },
        { label: 'Notion DB', value: config.notionDatabaseId ? `${config.notionDatabaseId.slice(0, 8)}…` : 'Not provisioned' },
      ].map(({ label, value }) => (
        <div key={label} className="df-flex df-flex-col df-gap-0.5">
          <span className="df-text-[10px] df-font-semibold df-uppercase df-tracking-widest df-text-gray-400">{label}</span>
          <span className="df-break-all df-font-mono df-text-xs df-text-gray-600">{value}</span>
        </div>
      ))}

      {config.notionDatabaseId && (
        <button
          className="df-mt-1 df-rounded-md df-border df-border-red-200 df-bg-red-50 df-px-3 df-py-2 df-text-left df-text-xs df-font-medium df-text-red-600 df-transition hover:df-bg-red-100"
          onClick={handleResetDatabase}
        >
          Reset Notion database
        </button>
      )}
    </div>
  )
}
