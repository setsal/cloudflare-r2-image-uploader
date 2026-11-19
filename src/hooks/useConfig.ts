import { useState, useEffect, useCallback } from 'react'
import { AppConfig, DEFAULT_CONFIG } from '@common/types'

export function useConfig() {
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const cfg = await window.api.getConfig()
      setConfigState(cfg)
    } catch (err) {
      console.error('Failed to load config:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = useCallback(async (updates: Partial<AppConfig>) => {
    try {
      const updated = await window.api.setConfig(updates)
      setConfigState(updated)
      return updated
    } catch (err) {
      console.error('Failed to update config:', err)
      throw err
    }
  }, [])

  const setProfile = useCallback(async (name: string, profile: Record<string, unknown>) => {
    try {
      const updated = await window.api.setProfile(name, profile)
      setConfigState(updated)
      return updated
    } catch (err) {
      console.error('Failed to set profile:', err)
      throw err
    }
  }, [])

  const deleteProfile = useCallback(async (name: string) => {
    try {
      const updated = await window.api.deleteProfile(name)
      setConfigState(updated)
      return updated
    } catch (err) {
      console.error('Failed to delete profile:', err)
      throw err
    }
  }, [])

  const activeProfile = config.profiles[config.activeProfile] || null

  return {
    config,
    loading,
    activeProfile,
    updateConfig,
    setProfile,
    deleteProfile,
    reload: loadConfig
  }
}
