import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

type TitleDetailsScreenProps = {
  titleId?: string;
};

export function TitleDetailsScreen({ titleId }: TitleDetailsScreenProps) {
  return (
    <PlaceholderScreen
      title="Title Details"
      description={`Phase 4 will show normalized media details and journal actions here. Current route id: ${titleId ?? 'none'}.`}
    />
  );
}
