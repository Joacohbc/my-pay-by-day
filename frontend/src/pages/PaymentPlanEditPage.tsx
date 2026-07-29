import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePaymentPlan } from '@/hooks/usePaymentPlans';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { PaymentPlanForm } from '@/components/paymentPlans/PaymentPlanForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';

export function PaymentPlanEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { navigateBack } = useAppNavigation();
  const goBack = () => navigateBack(Routes.PAYMENT_PLAN_DETAIL(Number(id)));

  const { data: plan, isLoading } = usePaymentPlan(Number(id));

  if (isLoading) return <FullPageSpinner />;
  if (!plan) return <ErrorState message={t('paymentPlans.noPlans')} />;

  return (
    <div className="space-y-4">
      <PageHeader title={t('paymentPlans.editTitle')} back={goBack} />

      <div className="px-5 pb-6">
        <PaymentPlanForm editTarget={plan} onCancel={goBack} onSuccess={goBack} />
      </div>
    </div>
  );
}
