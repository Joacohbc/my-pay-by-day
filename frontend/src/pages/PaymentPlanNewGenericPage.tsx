import { useTranslation } from 'react-i18next';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { PaymentPlanForm } from '@/components/paymentPlans/PaymentPlanForm';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * Interim page for Cuotas+Suscripciones and Planes: reuses the original all-in-one form until
 * their own dedicated interfaces are designed (see the payment-plans wayfinder map).
 */
export function PaymentPlanNewGenericPage() {
  const { t } = useTranslation();
  const { navigate, navigateBack } = useAppNavigation();
  const goBack = () => navigateBack(Routes.PAYMENT_PLANS);
  // Success always lands on the list, regardless of the chooser hop that preceded this page —
  // navigateBack would otherwise pop back to the type chooser instead of showing the new plan.
  const goToList = () => navigate(Routes.PAYMENT_PLANS);

  return (
    <div className="space-y-4">
      <PageHeader title={t('paymentPlans.createTitle')} back={goBack} />

      <div className="px-5 pb-6">
        <PaymentPlanForm onCancel={goBack} onSuccess={goToList} />
      </div>
    </div>
  );
}
