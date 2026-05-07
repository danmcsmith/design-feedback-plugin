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
    <div className="df-settings">
      <div className="df-settings__row">
        <span className="df-settings__label">Project</span>
        <span className="df-settings__value df-settings__value--mono">{projectName}</span>
      </div>
      <div className="df-settings__row">
        <span className="df-settings__label">API URL</span>
        <span className="df-settings__value df-settings__value--mono">{apiUrl}</span>
      </div>
      <div className="df-settings__row">
        <span className="df-settings__label">Notion DB</span>
        <span className="df-settings__value df-settings__value--mono">
          {config.notionDatabaseId
            ? `${config.notionDatabaseId.slice(0, 8)}…`
            : 'Not provisioned'}
        </span>
      </div>
      {config.notionDatabaseId && (
        <button className="df-settings__reset-btn" onClick={handleResetDatabase}>
          Reset Notion database
        </button>
      )}
    </div>
  )
}
