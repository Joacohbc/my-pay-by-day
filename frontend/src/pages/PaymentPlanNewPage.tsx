import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

interface PlanKindOption {
  to: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

const PLAN_KIND_OPTIONS: PlanKindOption[] = [
  {
    to: Routes.PAYMENT_PLAN_NEW_GROUP,
    icon: 'workspaces',
    titleKey: 'paymentPlans.kindGroupTitle',
    descriptionKey: 'paymentPlans.kindGroupDescription',
  },
  {
    to: Routes.PAYMENT_PLAN_NEW_INSTALLMENT,
    icon: 'credit_card',
    titleKey: 'paymentPlans.kindInstallmentTitle',
    descriptionKey: 'paymentPlans.kindInstallmentDescription',
  },
  {
    to: Routes.PAYMENT_PLAN_NEW_CUSTOM,
    icon: 'tune',
    titleKey: 'paymentPlans.kindCustomTitle',
    descriptionKey: 'paymentPlans.kindCustomDescription',
  },
];

export function PaymentPlanNewPage() {
  const { t } = useTranslation();
  const { navigateBack, linkStateFromHere } = useAppNavigation();
  const goBack = () => navigateBack(Routes.PAYMENT_PLANS);

  return (
    <div className="space-y-4">
      <PageHeader title={t('paymentPlans.createTitle')} back={goBack} />

      <div className="flex flex-col gap-2 px-5 pb-6">
        {PLAN_KIND_OPTIONS.map((option) => (
          <Link key={option.to} to={option.to} state={linkStateFromHere()}>
            <Card className="flex items-center gap-4 hover:bg-dn-surface-low transition-colors">
              <div className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-primary">
                <Icon name={option.icon} className="text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-dn-text-main">{t(option.titleKey)}</p>
                <p className="text-xs text-dn-text-muted leading-relaxed">{t(option.descriptionKey)}</p>
              </div>
              <Icon name="chevron_right" className="text-dn-text-muted shrink-0" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
