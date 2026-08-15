import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import type { MediaType } from '@/constants/media';
import {
  getJournalTitleActions,
  type JournalTitleAction,
} from '@/features/journal/model/journalTitleActions';
import type { JournalTitleSummary } from '@/features/journal/types';
import { cn } from '@/lib/utils/cn';

type Props = {
  addToListLoading: boolean;
  canAddToList: boolean;
  canUseJournal: boolean;
  isSignedIn: boolean;
  mediaType: MediaType;
  onAddToList: () => void;
  onIntent: (action: JournalTitleAction) => void;
  onOpenHistory: () => void;
  onRemovePlan: () => void;
  onRemoveTitle: () => void;
  onSignIn: () => void;
  onWatchTrailer: () => void;
  removing: boolean;
  showTrailer: boolean;
  summary: JournalTitleSummary | null;
};

function CompactAction({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={cn(
        'h-12 w-12 items-center justify-center rounded-app border border-archive-600 bg-archive-800',
        disabled && 'opacity-50',
      )}
      disabled={disabled}
      onPress={onPress}>
      <Ionicons color="#e8c77d" name={icon} size={19} />
    </Pressable>
  );
}

export function TitleDetailsJournalActions({
  addToListLoading,
  canAddToList,
  canUseJournal,
  isSignedIn,
  mediaType,
  onAddToList,
  onIntent,
  onOpenHistory,
  onRemovePlan,
  onRemoveTitle,
  onSignIn,
  onWatchTrailer,
  removing,
  showTrailer,
  summary,
}: Props) {
  const [showMore, setShowMore] = useState(false);
  const actions = getJournalTitleActions(mediaType, summary);
  const secondaryDisabled = !canUseJournal || removing;
  const runSecondary = () => {
    if (actions.secondary.intent === 'history') onOpenHistory();
    else onIntent(actions.secondary);
  };

  return (
    <View className="gap-3">
      <Button
        className="min-h-14"
        disabled={(isSignedIn && !canUseJournal) || removing}
        onPress={isSignedIn ? () => onIntent(actions.primary) : onSignIn}
        title={isSignedIn ? actions.primary.label : 'Sign in to use Journal'}
      />

      <View className="flex-row items-center gap-2">
        {isSignedIn ? (
          <Pressable
            accessibilityLabel={actions.secondary.label}
            accessibilityRole="button"
            accessibilityState={{ disabled: secondaryDisabled }}
            className="min-h-12 min-w-0 flex-1 justify-center px-1"
            disabled={secondaryDisabled}
            onPress={runSecondary}>
            <Text className="text-sm font-semibold text-gold-300" numberOfLines={1}>
              {actions.secondary.label}
            </Text>
          </Pressable>
        ) : (
          <View className="min-w-0 flex-1" />
        )}
        {showTrailer ? (
          <CompactAction
            accessibilityLabel="Watch trailer"
            icon="play"
            onPress={onWatchTrailer}
          />
        ) : null}
        <CompactAction
          accessibilityLabel="Add to List"
          disabled={!canAddToList || addToListLoading}
          icon="list"
          onPress={onAddToList}
        />
        <CompactAction
          accessibilityLabel={showMore ? 'Close more actions' : 'More actions'}
          disabled={(isSignedIn && !canUseJournal) || removing}
          icon="ellipsis-horizontal"
          onPress={() => setShowMore((current) => !current)}
        />
      </View>

      {showMore ? (
        <View className="gap-2 rounded-app border border-archive-700 bg-archive-800 p-3">
          {isSignedIn && summary?.activityCount ? (
            <Button title="View history" variant="ghost" onPress={onOpenHistory} />
          ) : null}
          {isSignedIn && actions.planAction ? (
            <Button
              title={actions.planAction.label}
              variant="ghost"
              onPress={() => onIntent(actions.planAction!)}
            />
          ) : null}
          {isSignedIn && actions.stopAction ? (
            <Button
              title={actions.stopAction.label}
              variant="ghost"
              onPress={() => onIntent(actions.stopAction!)}
            />
          ) : null}
          {isSignedIn && summary?.titleState.activePlan ? (
            <Button title="Remove plan" variant="ghost" onPress={onRemovePlan} />
          ) : null}
          {summary ? (
            <Button
              loading={removing}
              title="Remove from Journal"
              variant="danger"
              onPress={onRemoveTitle}
            />
          ) : null}
        </View>
      ) : null}

      {!isSignedIn ? (
        <Text className="text-center text-xs leading-4 text-archive-300">
          Sign in to plan, log watches, and keep history for this title.
        </Text>
      ) : !canUseJournal ? (
        <Text className="text-center text-xs leading-4 text-archive-300">
          Retry the Journal summary before changing this title.
        </Text>
      ) : null}
    </View>
  );
}
