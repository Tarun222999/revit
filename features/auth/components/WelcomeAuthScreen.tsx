import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EMAIL_AUTH_ENABLED_FOR_LAUNCH } from '@/constants/app';
import { isAppleSignInAvailable, signInWithApple } from '@/features/auth/api/apple-auth-api';
import { signInWithGoogle } from '@/features/auth/api/google-auth-api';
import { cn } from '@/lib/utils/cn';

type ProviderButtonProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  variant?: 'primary' | 'dark';
  onPress: () => void;
};

type MediaTile = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  image: ImageSource;
  className: string;
  imageScale?: number;
};

const mediaTiles: MediaTile[] = [
  {
    title: 'Movies',
    icon: 'film-outline',
    image: require('@/assets/images/movie-heat.jpg'),
    className: 'h-44 flex-1',
    imageScale: 1.18,
  },
  {
    title: 'Series',
    icon: 'tv-outline',
    image: require('@/assets/images/series-bear.jpg'),
    className: 'h-20 flex-1',
  },
  {
    title: 'Anime',
    icon: 'sparkles-outline',
    image: require('@/assets/images/animie-vinland.jpeg'),
    className: 'h-20 flex-1',
  },
];

function ProviderButton({
  title,
  icon,
  loading = false,
  variant = 'dark',
  onPress,
}: ProviderButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'min-h-14 flex-row items-center justify-center gap-3 rounded-app px-5',
        isPrimary ? 'bg-gold-400' : 'bg-archive-700',
        loading && 'opacity-60',
      )}
      disabled={loading}
      onPress={onPress}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#0d0b09' : '#fbf6ec'} />
      ) : (
        <>
          <Ionicons
            color={isPrimary ? '#5b3b12' : '#fbf6ec'}
            name={icon}
            size={24}
          />
          <Text
            adjustsFontSizeToFit
            className={cn(
              'text-center text-base font-bold',
              isPrimary ? 'text-shelf-700' : 'text-archive-50',
            )}
            numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function MediaTileCard({ tile }: { tile: MediaTile }) {
  return (
    <View
      className={cn(
        'overflow-hidden rounded-app border border-archive-700 bg-archive-800',
        tile.className,
      )}>
      <Image
        contentFit="cover"
        source={tile.image}
        style={{
          height: '100%',
          opacity: 0.58,
          transform: [{ scale: tile.imageScale ?? 1 }],
          width: '100%',
        }}
      />
      <View className="absolute inset-0 bg-archive-900/35" />
      <View className="absolute bottom-4 left-4 flex-row items-center gap-2">
        <Ionicons color="#d7a94d" name={tile.icon} size={26} />
        <Text className="text-xl font-bold text-archive-50">{tile.title}</Text>
      </View>
    </View>
  );
}

export function WelcomeAuthScreen() {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    setLoadingProvider('google');

    try {
      await signInWithGoogle();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign-in failed.');
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleAppleSignIn() {
    setError(null);
    setLoadingProvider('apple');

    try {
      await signInWithApple();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Apple sign-in failed.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <Screen scroll className="grow px-8 py-8">
      <View className="w-full max-w-[430px] flex-1 justify-between gap-8 self-center">
        <View className="flex-1 justify-center gap-8">
          <View className="gap-7">
            <View className="flex-row items-center gap-4">
              <View className="h-20 w-20 overflow-hidden rounded-app border border-archive-700 bg-archive-800">
                <Image
                  source={require('@/assets/images/revit-app-icon.png')}
                  contentFit="cover"
                  style={{ height: '100%', width: '100%' }}
                />
              </View>
              <View className="min-w-0 flex-1 gap-3">
                <Text className="text-5xl font-bold text-archive-50">Revit</Text>
                <Text
                  adjustsFontSizeToFit
                  className="text-xs font-semibold uppercase tracking-[4px] text-gold-400"
                  numberOfLines={1}>
                  Entertainment Journal
                </Text>
              </View>
            </View>

            <Text className="text-3xl leading-10 text-archive-300">
              Your personal journal for everything you{' '}
              <Text className="font-bold text-archive-50">watch, track, and love.</Text>
            </Text>

            <View className="flex-row gap-4">
              <MediaTileCard tile={mediaTiles[0]} />
              <View className="flex-1 gap-4">
                <MediaTileCard tile={mediaTiles[1]} />
                <MediaTileCard tile={mediaTiles[2]} />
              </View>
            </View>
          </View>

          <Card className="gap-5 border-archive-600 bg-archive-800/95 p-6">
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <Ionicons color="#d7a94d" name="book-outline" size={30} />
                <Text
                  adjustsFontSizeToFit
                  className="min-w-0 flex-1 text-3xl font-bold text-archive-50"
                  numberOfLines={1}>
                  Start your shelf
                </Text>
              </View>
              <Text className="text-lg leading-7 text-archive-300">
                Sign in to track what you watch, rate, and remember.
              </Text>
            </View>

            <View className="gap-3">
              <ProviderButton
                title="Continue with Google"
                icon="logo-google"
                variant="primary"
                onPress={handleGoogleSignIn}
                loading={loadingProvider === 'google'}
              />
              {Platform.OS === 'ios' && appleAvailable ? (
                <ProviderButton
                  title="Continue with Apple"
                  icon="logo-apple"
                  onPress={handleAppleSignIn}
                  loading={loadingProvider === 'apple'}
                />
              ) : null}
              {EMAIL_AUTH_ENABLED_FOR_LAUNCH ? (
                <ProviderButton
                  title="Continue with Email"
                  icon="mail-outline"
                  onPress={() => router.push('/email-code')}
                />
              ) : null}
            </View>

            {error ? <Text className="text-sm leading-5 text-reel-400">{error}</Text> : null}
          </Card>
        </View>

        <View className="items-center gap-2 pb-2">
          <Text className="text-center text-sm leading-5 text-archive-300">
            By continuing, you agree to Revit&apos;s
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/terms')}>
              <Text className="text-base font-semibold text-gold-300">
                Terms
              </Text>
            </Pressable>
            <Text className="text-base text-archive-500">and</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/privacy')}>
              <Text className="text-base font-semibold text-gold-300">
                Privacy Policy
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
