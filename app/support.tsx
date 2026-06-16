import { LegalDocumentScreen } from '@/features/legal/components/LegalDocumentScreen';
import {
  LEGAL_UPDATED_AT,
  supportSections,
} from '@/features/legal/data/legalDocuments';

export default function SupportRoute() {
  return (
    <LegalDocumentScreen
      title="Support"
      updatedAt={LEGAL_UPDATED_AT}
      intro="Use this page to understand what information helps diagnose account, data, and metadata issues."
      sections={supportSections}
    />
  );
}
