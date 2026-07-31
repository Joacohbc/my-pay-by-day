import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PaymentPlanType } from '@/models';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { GroupPlanForm } from '@/components/paymentPlans/GroupPlanForm';
import { InstallmentPlanForm } from '@/components/paymentPlans/InstallmentPlanForm';
import { SubscriptionPlanForm } from '@/components/paymentPlans/SubscriptionPlanForm';
import { CustomPlanForm } from '@/components/paymentPlans/CustomPlanForm';
import { PageHeader } from '@/components/ui/PageHeader';

interface PlanFormProps {
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}

const TITLE_KEYS: Record<PaymentPlanType, string> = {
  GROUP: 'paymentPlans.kindGroupTitle',
  INSTALLMENT: 'paymentPlans.kindInstallmentTitle',
  RECURRING: 'paymentPlans.kindSubscriptionTitle',
  CUSTOM: 'paymentPlans.kindCustomTitle',
};

const FORMS: Record<PaymentPlanType, (props: PlanFormProps) => ReactNode> = {
  GROUP: (props) => <GroupPlanForm {...props} />,
  INSTALLMENT: (props) => <InstallmentPlanForm {...props} />,
  RECURRING: (props) => <SubscriptionPlanForm {...props} />,
  CUSTOM: (props) => <CustomPlanForm {...props} />,
};

export function PaymentPlanNewKindPage({ kind }: { readonly kind: PaymentPlanType }) {
  const { t } = useTranslation();
  const { navigate, navigateBack } = useAppNavigation();
  const goBack = () => navigateBack(Routes.PAYMENT_PLANS);
  // Success always lands on the list, regardless of the chooser hop that preceded this page —
  // navigateBack would otherwise pop back to the type chooser instead of showing the new plan.
  const goToList = () => navigate(Routes.PAYMENT_PLANS);

  return (
    <div className="space-y-4">
      <PageHeader title={t(TITLE_KEYS[kind])} back={goBack} />

      <div className="px-5 pb-6">{FORMS[kind]({ onCancel: goBack, onSuccess: goToList })}</div>
    </div>
  );
}
