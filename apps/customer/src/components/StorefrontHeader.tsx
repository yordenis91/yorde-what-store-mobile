import React from 'react'
import { Animated, Image, Linking, Pressable, Share, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@yws/ui'
import { resolveMediaUrl, type PublicTenant } from '@yws/shared'
import { API_URL, WEB_URL } from '../lib/api'

const BANNER_MAX_HEIGHT = 140
const COLLAPSE_DISTANCE = 100

/** Social keys the storefront knows an icon for — mirrors `yorde-what-store-client/src/config/social.ts`. Any other key on `tenant.socialLinks` is ignored, same as there. */
const SOCIAL_ICONS: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
  instagram: { icon: 'logo-instagram', label: 'Instagram' },
  whatsapp: { icon: 'logo-whatsapp', label: 'WhatsApp' },
  tiktok: { icon: 'logo-tiktok', label: 'TikTok' },
  facebook: { icon: 'logo-facebook', label: 'Facebook' },
  youtube: { icon: 'logo-youtube', label: 'YouTube' },
  x: { icon: 'logo-twitter', label: 'X' },
}

function SocialIcon({
  url,
  icon,
  label,
  color,
  bg,
}: {
  url: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  color: string
  bg: string
}) {
  const theme = useTheme()
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={6}
      style={{ width: 32, height: 32, borderRadius: theme.radius.full, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  )
}

/**
 * Banner collapses as the product grid below it scrolls — `scrollY` is the
 * Animated.Value the screen's scroll container feeds in. Logo, name, tagline
 * and the social/share row stay put so the store identity never fully
 * disappears, only the decorative photo behind it does.
 */
export function StorefrontHeader({ tenant, scrollY, slug }: { tenant: PublicTenant; scrollY: Animated.Value; slug: string }) {
  const theme = useTheme()
  const bannerUrl = resolveMediaUrl(tenant.bannerUrl, API_URL)
  const logoUrl = resolveMediaUrl(tenant.logoUrl, API_URL)
  const socialEntries = Object.entries(tenant.socialLinks ?? {}).filter(([key, url]) => url && SOCIAL_ICONS[key])

  const bannerHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [BANNER_MAX_HEIGHT, 0],
    extrapolate: 'clamp',
  })
  const bannerOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE * 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  function onShare() {
    Share.share({ message: `${tenant.name} — ${WEB_URL}/store/${slug}`, url: `${WEB_URL}/store/${slug}` })
  }

  return (
    <View>
      {bannerUrl ? (
        <Animated.View
          style={{ height: bannerHeight, opacity: bannerOpacity, overflow: 'hidden' }}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Image source={{ uri: bannerUrl }} style={{ width: '100%', height: BANNER_MAX_HEIGHT }} resizeMode="cover" />
        </Animated.View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            accessibilityLabel={`Logo de ${tenant.name}`}
            style={{ width: 48, height: 48, borderRadius: theme.radius.md }}
          />
        ) : (
          <View
            accessibilityLabel={`Logo de ${tenant.name}`}
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.brand600,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text weight="bold" style={{ color: '#fff' }}>
              {tenant.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="subtitle" numberOfLines={1}>
            {tenant.name}
          </Text>
          {tenant.tagline ? (
            <Text color="muted" variant="caption" numberOfLines={1}>
              {tenant.tagline}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Compartir tienda"
          hitSlop={8}
          style={{ padding: theme.spacing.sm }}
        >
          <Ionicons name="share-social-outline" size={22} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {socialEntries.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
          {socialEntries.map(([key, url]) => (
            <SocialIcon
              key={key}
              url={url}
              icon={SOCIAL_ICONS[key].icon}
              label={SOCIAL_ICONS[key].label}
              color={theme.colors.brand600}
              bg={theme.colors.brand50}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}
