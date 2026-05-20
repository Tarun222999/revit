import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  description: {
    lineHeight: 22,
  },
});
