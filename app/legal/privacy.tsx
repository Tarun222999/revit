import { LegalDocumentScreen } from '@/features/legal/components/LegalDocumentScreen';
import {
  LEGAL_UPDATED_AT,
  privacySections,
} from '@/features/legal/data/legalDocuments';

export default function PrivacyPolicyRoute() {
  return (
    <LegalDocumentScreen
      title="Privacy Policy"
      updatedAt={LEGAL_UPDATED_AT}
      intro="This policy explains what Revit stores and how that data supports your personal entertainment journal."
      sections={privacySections}
    />
  );
}
