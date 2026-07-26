import { useTranslation } from 'react-i18next';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { PaymentPlanForm } from '@/components/paymentPlans/PaymentPlanForm';
import { PageHeader } from '@/components/ui/PageHeader';

export function PaymentPlanNewPage() {
  const { t } = useTranslation();
  const { navigateBack } = useAppNavigation();
  const goBack = () => navigateBack(Routes.PAYMENT_PLANS);

  return (
    <div className="space-y-4">
      <PageHeader title={t('paymentPlans.createTitle')} back={goBack} />

      <div className="px-5 pb-6">
        <PaymentPlanForm onCancel={goBack} onSuccess={goBack} />
      </div>
    </div>
  );
}
