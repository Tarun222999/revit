import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

type ListDetailsScreenProps = {
  listId?: string;
};

export function ListDetailsScreen({ listId }: ListDetailsScreenProps) {
  return (
    <PlaceholderScreen
      title="List Details"
      description={`Phase 6 will show list metadata and items here. Current route id: ${listId ?? 'none'}.`}
    />
  );
}
