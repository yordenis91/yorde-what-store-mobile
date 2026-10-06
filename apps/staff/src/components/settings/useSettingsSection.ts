import { useEffect, useRef, useState } from 'react'
import { extractErrorMessage, type Tenant, type TenantSettingsUpdate } from '@yws/shared'
import { useIsStoreOwner, useStoreSettings, useUpdateStoreSettings } from '../../hooks/queries'

export interface SettingsSectionForm<T> {
  /** The store as the api last returned it, or undefined while the first load is in flight. */
  tenant: Tenant | undefined
  /** This section's editable copy, or null until the store has loaded. */
  values: T | null
  /** Updates part of the local copy and clears any save feedback. */
  patch: (changes: Partial<T>) => void
  /** Sends `changes` (only this section's api fields) after running `validate`, if given. */
  save: (changes: TenantSettingsUpdate, validate?: (values: T) => string | null) => void
  /** False for a collaborator: the settings endpoints are owner-only. */
  canEdit: boolean
  isLoading: boolean
  isRefetching: boolean
  isSaving: boolean
  error: string | null
  saved: boolean
  /** For a section that saves through another endpoint (payments) and reports its own errors. */
  setError: (message: string | null) => void
  refetch: () => void
}

/**
 * The shared half of every store-settings section: load the store once, keep
 * an editable local copy of just this section's fields, and save that section
 * alone.
 *
 * Sections save independently on purpose (see ADR-011 in the agency repo): a
 * save sends only the keys it owns, so two people editing different sections
 * can't overwrite each other, and the api — which rejects any field outside
 * `UpdateTenantDto` — never sees a round-tripped tenant object.
 */
export function useSettingsSection<T extends object>(fromTenant: (tenant: Tenant) => T): SettingsSectionForm<T> {
  const canEdit = useIsStoreOwner()
  const settings = useStoreSettings()
  const update = useUpdateStoreSettings()
  const [values, setValues] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Every call site writes the mapper inline, so it's a new function on each
  // render — keeping the latest one in a ref makes the store's data the only
  // thing that re-seeds the form.
  const map = useRef(fromTenant)
  map.current = fromTenant

  const tenant = settings.data
  useEffect(() => {
    if (tenant) setValues(map.current(tenant))
  }, [tenant])

  return {
    tenant,
    values,
    canEdit,
    isLoading: settings.isLoading,
    isRefetching: settings.isRefetching,
    isSaving: update.isPending,
    error: error ?? (settings.error ? extractErrorMessage(settings.error, 'No pudimos cargar la configuración.') : null),
    saved,
    setError,
    refetch: () => void settings.refetch(),
    patch: (changes) => {
      setSaved(false)
      setError(null)
      setValues((current) => (current ? { ...current, ...changes } : current))
    },
    save: (changes, validate) => {
      if (!values) return
      const message = validate?.(values) ?? null
      setSaved(false)
      setError(message)
      if (message) return
      update.mutate(changes, {
        onSuccess: () => setSaved(true),
        onError: (err) => setError(extractErrorMessage(err, 'No pudimos guardar los cambios.')),
      })
    },
  }
}
