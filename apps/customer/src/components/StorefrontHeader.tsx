import React from 'react'
import { Animated, Image, Linking, Pressable, Share, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@yws/ui'
import { resolveMediaUrl, type PublicTenant } from '@yws/shared'
import { API_URL, WEB_URL } from '../lib/api'

const BANNER_MAX_HEIGHT = 140
const COLLAPSE_DISTANCE = 100

/** Social keys the storefront knows an icon for — mirrors `yorde-what-store-client/src/config/social.ts`. Any other key on `tenant.socialLinks` is ignored, same as there. */
const SOCIAL_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  instagram: 'logo-instagram',
  whatsapp: 'logo-whatsapp',
  tiktok: 'logo-tiktok',
  facebook: 'logo-facebook',
  youtube: 'logo-youtube',
  x: 'logo-twitter',
}

function SocialIcon({ url, icon, color, bg }: { url: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      hitSlop={6}
      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
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
        <Animated.View style={{ height: bannerHeight, opacity: bannerOpacity, overflow: 'hidden' }}>
          <Image source={{ uri: bannerUrl }} style={{ width: '100%', height: BANNER_MAX_HEIGHT }} resizeMode="cover" />
        </Animated.View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={{ width: 48, height: 48, borderRadius: 12 }} />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
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
          style={{ padding: 6 }}
        >
          <Ionicons name="share-social-outline" size={22} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {socialEntries.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
          {socialEntries.map(([key, url]) => (
            <SocialIcon key={key} url={url} icon={SOCIAL_ICONS[key]} color={theme.colors.brand600} bg={theme.colors.brand50} />
          ))}
        </View>
      ) : null}
    </View>
  )
}
