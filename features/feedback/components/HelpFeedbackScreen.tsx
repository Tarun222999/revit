import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import type { FeedbackCategory } from '@/features/feedback/types';

type FeedbackActionProps = {
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  onPress: () => void;
  title: string;
};

function FeedbackAction({
  description,
  icon,
  iconColor,
  onPress,
  title,
}: FeedbackActionProps) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-4 rounded-app border border-archive-700 bg-archive-800 px-4 py-4"
      onPress={onPress}
    >
      <View className="h-11 w-11 items-center justify-center rounded-app bg-archive-700">
        <Ionicons color={iconColor} name={icon} size={22} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-bold text-archive-50">{title}</Text>
        <Text className="text-sm leading-5 text-archive-300">{description}</Text>
      </View>
      <Ionicons color="#d8c7a9" name="chevron-forward" size={19} />
    </Pressable>
  );
}

function openFeedback(category: FeedbackCategory) {
  router.push(
    `/modals/feedback?category=${category}&source=help_feedback` as Href,
  );
}

export function HelpFeedbackScreen() {
  return (
    <Screen scroll>
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-archive-50">How can we help?</Text>
          <Text className="text-base leading-6 text-archive-300">
            Tell us what went wrong, share an idea, or reach support for account
            and privacy questions.
          </Text>
        </View>

        <View className="gap-3">
          <FeedbackAction
            description="Something did not work as expected."
            icon="alert-circle-outline"
            iconColor="#e8c77d"
            onPress={() => openFeedback('bug')}
            title="Report a problem"
          />
          <FeedbackAction
            description="Share a feature or improvement you would value."
            icon="sparkles-outline"
            iconColor="#8bc6bd"
            onPress={() => openFeedback('feature_idea')}
            title="Suggest an idea"
          />
          <FeedbackAction
            description="Account access, privacy, deletion, or data requests."
            icon="help-circle-outline"
            iconColor="#d8c7a9"
            onPress={() => router.push('/support')}
            title="Contact support"
          />
        </View>

        <View className="rounded-app border-l-2 border-teal-500 bg-archive-800 px-4 py-3">
          <Text className="text-sm leading-5 text-archive-200">
            Incorrect title information may need to be corrected at TMDB or
            IGDB. Revit can still help identify the source.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
