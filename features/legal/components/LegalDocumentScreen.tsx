import * as Linking from 'expo-linking';
import { Alert, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';

export type LegalSection = {
  title: string;
  body: string[];
  link?: {
    label: string;
    url: string;
  };
};

type LegalDocumentScreenProps = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalDocumentScreen({
  intro,
  sections,
  title,
  updatedAt,
}: LegalDocumentScreenProps) {
  return (
    <Screen scroll>
      <View className="gap-5">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-archive-50">{title}</Text>
          <Text className="text-sm font-semibold uppercase text-gold-300">
            Last updated {updatedAt}
          </Text>
          <Text className="text-base leading-6 text-archive-200">{intro}</Text>
        </View>

        {sections.map((section) => (
          <Card key={section.title} className="gap-3">
            <Text className="text-lg font-bold text-archive-50">
              {section.title}
            </Text>
            {section.body.map((paragraph) => (
              <Text
                key={paragraph}
                className="text-sm leading-6 text-archive-200">
                {paragraph}
              </Text>
            ))}
            {section.link ? (
              <Pressable
                accessibilityHint="Opens this attribution source in your browser."
                accessibilityLabel={section.link.label}
                accessibilityRole="link"
                className="self-start py-1"
                onPress={() => {
                  void Linking.openURL(section.link!.url).catch(() => {
                    Alert.alert(
                      'Link unavailable',
                      'Unable to open this link right now.',
                    );
                  });
                }}>
                <Text className="text-sm font-semibold text-gold-300">
                  {section.link.label}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
