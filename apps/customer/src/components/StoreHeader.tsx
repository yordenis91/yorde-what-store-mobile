import React, { useState } from 'react'
import { Image, Linking, Pressable, View } from 'react-native'
import { Text, useTheme } from '@yws/ui'
import type { PublicTenant } from '@yws/shared'
import { mediaUrl } from '../lib/api'
import { shareStore } from '../lib/share'

/**
 * Networks a store can link to, in the web storefront header's order
 * (`yorde-what-store-client/src/config/social.ts`). `socialLinks` is free-form
 * on the api; keys not listed here, and empty values, are skipped.
 */
const SOCIAL_NETWORKS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'x', label: 'X' },
  { key: 'website', label: 'Sitio web' },
] as const

/** Banner, logo, name, tagline, "about" and social links — the app's take on the web storefront header. */
export function StoreHeader({ tenant }: { tenant: PublicTenant }) {
  const theme = useTheme()
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const links = SOCIAL_NETWORKS.filter((n) => /^https?:\/\//i.test(tenant.socialLinks?.[n.key]?.trim() ?? ''))

  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      {tenant.bannerUrl ? (
        <Image
          source={{ uri: mediaUrl(tenant.bannerUrl) }}
          style={{ width: '100%', height: 120, borderRadius: theme.radius.lg }}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {tenant.logoUrl ? (
          <Image
            source={{ uri: mediaUrl(tenant.logoUrl) }}
            style={{
              width: 56,
              height: 56,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surface,
              marginTop: tenant.bannerUrl ? -36 : 0,
              borderWidth: 2,
              borderColor: theme.colors.surface,
            }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text variant="title">{tenant.name}</Text>
          {tenant.tagline ? <Text color="muted">{tenant.tagline}</Text> : null}
        </View>
      </View>
      {tenant.about ? (
        <Pressable onPress={() => setAboutExpanded((v) => !v)} accessibilityRole="button">
          <Text color="muted" numberOfLines={aboutExpanded ? undefined : 3}>
            {tenant.about}
          </Text>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => void shareStore(tenant)}>
          <Text weight="semibold" style={{ color: theme.colors.brand600 }}>
            Compartir tienda
          </Text>
        </Pressable>
        {links.map((n) => (
          <Pressable
            key={n.key}
            accessibilityRole="link"
            onPress={() => Linking.openURL(tenant.socialLinks[n.key]!.trim()).catch(() => undefined)}
          >
            <Text weight="semibold" style={{ color: theme.colors.brand600 }}>
              {n.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
