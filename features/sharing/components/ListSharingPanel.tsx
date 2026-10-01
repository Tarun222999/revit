import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Share,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { CollectionSheet } from '@/features/lists/components/CollectionSheet';
import { manageListSharing } from '@/features/sharing/api/list-sharing-api';
import { useListSharing } from '@/features/sharing/hooks/useListSharing';
import { createListShareUrl } from '@/features/sharing/model/listShare';

export function ListSharingPanel({
  listId,
  userId,
  visible,
  onClose,
  onEdit,
  onDelete,
}: {
  listId: string;
  userId: string;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const query = useListSharing(userId, listId);
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingUrl = useRef<string | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    if (visible) {
      setError(null);
      setConfirmStop(false);
      void query.refetch();
    }
    // Refetch only when the menu opens, not on every query state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const openShare = async () => {
    const url = pendingUrl.current;
    if (!url) return;
    pendingUrl.current = null;
    try {
      await Share.share({ message: url });
    } catch {
      Alert.alert(
        'Sharing unavailable',
        'Revit could not open sharing right now.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Try again',
            onPress: () => {
              pendingUrl.current = url;
              void openShare();
            },
          },
        ],
      );
    }
  };
  useEffect(() => {
    if (!visible && Platform.OS !== 'ios' && pendingUrl.current)
      void openShare();
  }, [visible]);
  const change = async (action: 'share' | 'stop') => {
    if (inFlight.current || !query.data || query.isFetching || query.isError)
      return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const state = await manageListSharing({
        listId,
        action,
        expectedVersion: query.data.version,
      });
      if (action === 'share' && state.shareKey)
        pendingUrl.current = createListShareUrl(state.shareKey);
      await query.refetch();
      setConfirmStop(false);
      onClose();
    } catch {
      setError(
        action === 'stop'
          ? 'Unable to stop sharing. Reload and try again.'
          : 'Unable to share this list. Reload and try again.',
      );
      await query.refetch();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <CollectionSheet
      title={confirmStop ? 'Stop sharing?' : 'Collection options'}
      visible={visible}
      onClose={() => {
        if (!inFlight.current) onClose();
      }}
      busy={busy}
      onDismiss={() => void openShare()}
    >
      {confirmStop ? (
        <>
          <Text className="text-base leading-6 text-archive-200">
            The current link will stop working. Your list and titles stay
            intact. Sharing again creates a new link.
          </Text>
          <Button
            title="Keep sharing"
            variant="secondary"
            disabled={busy}
            onPress={() => setConfirmStop(false)}
          />
          <Button
            title="Stop sharing"
            variant="danger"
            loading={busy}
            onPress={() => void change('stop')}
          />
        </>
      ) : (
        <>
          <Text className="text-sm leading-5 text-archive-300">
            Anyone with the link can view this list’s name, description, and
            titles. Your personal notes and Journal stay private.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share list"
            accessibilityState={{
              disabled:
                busy || !query.data || query.isFetching || query.isError,
              busy,
            }}
            className="min-h-12 flex-row items-center gap-3 rounded-app border border-archive-500 px-4 py-3"
            disabled={busy || !query.data || query.isFetching || query.isError}
            onPress={() => void change('share')}
          >
            {busy ? (
              <ActivityIndicator color="#e8c77d" />
            ) : (
              <Ionicons name="share-social-outline" size={20} color="#e8c77d" />
            )}
            <Text className="text-base font-semibold text-archive-50">
              Share list
            </Text>
          </Pressable>
          {query.data?.shareKey ? (
            <Button
              title="Stop sharing"
              variant="secondary"
              disabled={busy || query.isFetching || query.isError}
              onPress={() => setConfirmStop(true)}
            />
          ) : null}
          <Button
            title="Edit name & description"
            variant="secondary"
            disabled={busy}
            onPress={onEdit}
          />
          <Button
            title="Delete list"
            variant="danger"
            disabled={busy}
            onPress={onDelete}
          />
        </>
      )}
      {query.isError || error ? (
        <>
          <Text accessibilityRole="alert" className="text-sm text-reel-300">
            {error ?? 'Unable to load sharing. Try again.'}
          </Text>
          <Button
            title="Reload sharing"
            variant="secondary"
            loading={query.isFetching}
            onPress={() => void query.refetch()}
          />
        </>
      ) : null}
    </CollectionSheet>
  );
}
