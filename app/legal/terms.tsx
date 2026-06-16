import { LegalDocumentScreen } from '@/features/legal/components/LegalDocumentScreen';
import {
  LEGAL_UPDATED_AT,
  termsSections,
} from '@/features/legal/data/legalDocuments';

export default function TermsOfUseRoute() {
  return (
    <LegalDocumentScreen
      title="Terms of Use"
      updatedAt={LEGAL_UPDATED_AT}
      intro="These terms describe the expected use of Revit as a personal entertainment tracking app."
      sections={termsSections}
    />
  );
}
