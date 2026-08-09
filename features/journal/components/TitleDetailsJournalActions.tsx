import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import type { MediaType } from '@/constants/media';
import {
  getJournalTitleActions,
  type JournalTitleAction,
} from '@/features/journal/model/journalTitleActions';
import type { JournalTitleSummary } from '@/features/journal/types';

type Props = {
  addToListLoading: boolean;
  canAddToList: boolean;
  canUseJournal: boolean;
  isSignedIn: boolean;
  mediaType: MediaType;
  onAddToList: () => void;
  onIntent: (action: JournalTitleAction) => void;
  onSignIn: () => void;
  onRemovePlan: () => void;
  onRemoveTitle: () => void;
  onOpenHistory: () => void;
  removing: boolean;
  summary: JournalTitleSummary | null;
};

export function TitleDetailsJournalActions({
  addToListLoading,
  canAddToList,
  canUseJournal,
  isSignedIn,
  mediaType,
  onAddToList,
  onIntent,
  onSignIn,
  onRemovePlan,
  onRemoveTitle,
  onOpenHistory,
  removing,
  summary,
}: Props) {
  const [showMore, setShowMore] = useState(false);
  const actions = getJournalTitleActions(mediaType, summary);
  const runSecondary = () => {
    if (actions.secondary.intent === 'history') onOpenHistory();
    else onIntent(actions.secondary);
  };

  return (
    <View className="gap-3">
      <Button
        disabled={(isSignedIn && !canUseJournal) || removing}
        onPress={isSignedIn ? () => onIntent(actions.primary) : onSignIn}
        title={isSignedIn ? actions.primary.label : 'Sign in to use Journal'}
      />
      {isSignedIn ? (
        <Button
          disabled={!canUseJournal || removing}
          onPress={runSecondary}
          title={actions.secondary.label}
          variant="secondary"
        />
      ) : null}
      <Button
        disabled={(isSignedIn && !canUseJournal) || removing}
        onPress={() => setShowMore((current) => !current)}
        title={showMore ? 'Close more actions' : 'More actions'}
        variant="ghost"
      />

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
          <Button
            disabled={!canAddToList}
            loading={addToListLoading}
            title="Add to List"
            variant="ghost"
            onPress={onAddToList}
          />
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
