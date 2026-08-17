import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { PaymentPlan } from '@/models';
import { usePaymentPlan } from '@/hooks/usePaymentPlans';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { GroupPlanForm } from '@/components/paymentPlans/GroupPlanForm';
import { InstallmentPlanForm } from '@/components/paymentPlans/InstallmentPlanForm';
import { SubscriptionPlanForm } from '@/components/paymentPlans/SubscriptionPlanForm';
import { CustomPlanForm } from '@/components/paymentPlans/CustomPlanForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';

export function PaymentPlanEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { navigate, navigateBack } = useAppNavigation();
  const goBack = () => navigateBack(Routes.PAYMENT_PLAN_DETAIL(Number(id)));
  const goToDetail = () => navigate(Routes.PAYMENT_PLAN_DETAIL(Number(id)));

  const { data: plan, isLoading } = usePaymentPlan(Number(id));

  if (isLoading) return <FullPageSpinner />;
  if (!plan) return <ErrorState message={t('paymentPlans.noPlans')} />;

  return (
    <div className="space-y-4">
      <PageHeader title={t('paymentPlans.editTitle')} back={goBack} />

      <div className="px-5 pb-6">
        <PlanEditForm plan={plan} onCancel={goToDetail} onSuccess={goToDetail} />
      </div>
    </div>
  );
}

/** The kind of a plan is fixed once created, so editing always reopens the form that built it. */
function PlanEditForm({
  plan,
  onCancel,
  onSuccess,
}: {
  readonly plan: PaymentPlan;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}) {
  if (plan.planType === 'GROUP') {
    return <GroupPlanForm editTarget={plan} onCancel={onCancel} onSuccess={onSuccess} />;
  }
  if (plan.planType === 'INSTALLMENT') {
    return <InstallmentPlanForm editTarget={plan} onCancel={onCancel} onSuccess={onSuccess} />;
  }
  if (plan.planType === 'RECURRING') {
    return <SubscriptionPlanForm editTarget={plan} onCancel={onCancel} onSuccess={onSuccess} />;
  }
  return <CustomPlanForm editTarget={plan} onCancel={onCancel} onSuccess={onSuccess} />;
}
