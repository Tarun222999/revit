import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { JournalActionDrawer } from '@/features/journal/components/JournalActionDrawer';
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
  onEditCompletedPlay?: () => void;
  onIntent: (action: JournalTitleAction) => void;
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
  onEditCompletedPlay,
  onIntent,
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
  const secondaryNeedsFullWidth =
    mediaType === 'game' && actions.secondary.intent === 'log_finished';
  const runSecondary = () => {
    if (
      mediaType === 'game' &&
      summary?.titleState.status === 'completed' &&
      onEditCompletedPlay
    ) {
      onEditCompletedPlay();
      return;
    }
    onIntent(actions.secondary);
  };

  const closeMore = () => setShowMore(false);
  const runMoreAction = (action: () => void) => {
    closeMore();

    if (!canUseJournal || removing) {
      return;
    }

    action();
  };

  useEffect(() => {
    if (!canUseJournal || removing) {
      setShowMore(false);
    }
  }, [canUseJournal, removing]);
  const hasHistory = Boolean(summary?.activityCount);
  const moreActions = [
    ...(isSignedIn && actions.planAction
      ? [{ label: actions.planAction.label, onPress: () => runMoreAction(() => onIntent(actions.planAction!)), tone: 'standard' as const }]
      : []),
    ...(isSignedIn && actions.stopAction
      ? [{ label: actions.stopAction.label, onPress: () => runMoreAction(() => onIntent(actions.stopAction!)), tone: 'standard' as const }]
      : []),
    ...(isSignedIn && summary?.titleState.activePlan
      ? [{ label: 'Remove plan', onPress: () => runMoreAction(onRemovePlan), tone: 'standard' as const }]
      : []),
    ...(summary && (!summary.titleState.activePlan || hasHistory)
      ? [{ label: 'Remove from Journal', onPress: () => runMoreAction(onRemoveTitle), tone: 'danger' as const }]
      : []),
  ];

  return (
    <View className="gap-3">
      <Button
        accessibilityState={{
          disabled: Boolean((isSignedIn && !canUseJournal) || removing || actions.primary.disabled),
        }}
        className="min-h-14"
        disabled={(isSignedIn && !canUseJournal) || removing || actions.primary.disabled}
        onPress={isSignedIn ? () => onIntent(actions.primary) : onSignIn}
        title={isSignedIn ? actions.primary.label : 'Sign in to use Journal'}
      />

      {actions.primary.disabledReason ? (
        <Text className="text-center text-xs leading-4 text-archive-300">
          {actions.primary.disabledReason}
        </Text>
      ) : null}

      {isSignedIn && secondaryNeedsFullWidth ? (
        <Pressable
          accessibilityLabel={actions.secondary.label}
          accessibilityRole="button"
          accessibilityState={{ disabled: secondaryDisabled }}
          className="min-h-12 w-full items-center justify-center px-3"
          disabled={secondaryDisabled}
          onPress={runSecondary}>
          <Text className="text-center text-sm font-semibold leading-5 text-gold-300">
            {actions.secondary.label}
          </Text>
        </Pressable>
      ) : null}

      <View className="flex-row items-center gap-2">
        {isSignedIn && !secondaryNeedsFullWidth ? (
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
        ) : !secondaryNeedsFullWidth ? (
          <View className="min-w-0 flex-1" />
        ) : null}
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
        {moreActions.length > 0 ? (
          <CompactAction
            accessibilityLabel={showMore ? 'Close more actions' : 'More actions'}
            disabled={(isSignedIn && !canUseJournal) || removing}
            icon="ellipsis-horizontal"
            onPress={() => setShowMore((current) => !current)}
          />
        ) : null}
      </View>

      <JournalActionDrawer
        actions={moreActions}
        onClose={closeMore}
        title="More actions"
        visible={
          showMore && canUseJournal && !removing && moreActions.length > 0
        }
      />

      {!isSignedIn ? (
        <Text className="text-center text-xs leading-4 text-archive-300">
          {mediaType === 'game'
            ? 'Sign in to plan, log plays, and keep history for this title.'
            : 'Sign in to plan, log watches, and keep history for this title.'}
        </Text>
      ) : !canUseJournal ? (
        <Text className="text-center text-xs leading-4 text-archive-300">
          Retry the Journal summary before changing this title.
        </Text>
      ) : null}
    </View>
  );
}
