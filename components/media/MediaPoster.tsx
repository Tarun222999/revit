import { Image } from 'expo-image';
import { View, type ViewProps } from 'react-native';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';

type MediaPosterProps = ViewProps & {
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'h-24 w-16',
  md: 'h-36 w-24',
  lg: 'h-52 w-36',
};

export function MediaPoster({ imageUrl, size = 'md', className, ...props }: MediaPosterProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <View
      className={cn(
        'overflow-hidden rounded-app border border-archive-700 bg-shelf-700',
        sizeClasses[size],
        className,
      )}
      {...props}>
      {imageUrl && !imageFailed ? (
        <Image
          contentFit="cover"
          onError={() => setImageFailed(true)}
          source={{ uri: imageUrl }}
          style={{ height: '100%', width: '100%' }}
          testID="media-poster-image"
        />
      ) : (
        <View className="h-full w-full bg-shelf-700" testID="media-poster-fallback" />
      )}
    </View>
  );
}
