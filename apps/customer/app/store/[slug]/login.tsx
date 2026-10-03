import React from 'react'
import { Redirect, useLocalSearchParams } from 'expo-router'

/**
 * The web storefront's `/store/<slug>/login` path, so a shared web link (or
 * the password-reset email's `?token=` link) opens the right screen in the
 * app: the reset form when it carries a token, the login form otherwise.
 */
export default function WebLoginPath() {
  const { slug, token } = useLocalSearchParams<{ slug: string; token?: string }>()
  if (token)
    return <Redirect href={{ pathname: '/store/[slug]/auth/reset-password', params: { slug, token } }} />
  return <Redirect href={`/store/${slug}/auth/login`} />
}
