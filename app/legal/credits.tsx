import { LegalDocumentScreen } from '@/features/legal/components/LegalDocumentScreen';
import {
  LEGAL_UPDATED_AT,
  creditsSections,
} from '@/features/legal/data/legalDocuments';

export default function CreditsRoute() {
  return (
    <LegalDocumentScreen
      title="Credits / Attributions"
      updatedAt={LEGAL_UPDATED_AT}
      intro="Revit is built on trusted app infrastructure and third-party metadata providers."
      sections={creditsSections}
    />
  );
}
