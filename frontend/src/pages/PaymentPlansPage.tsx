import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import type { PaymentPlan, PaymentPlanStatus, PaymentPlanType } from '@/models';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatCurrency, formatCurrencyShort } from '@/lib/format';
import { isUserComposedPlan, planTypeIcons } from '@/components/paymentPlans/planPresentation';
import { useBanner, BANNER_IDS } from '@/store/dismissedBannersStore';

type PlanFilter = 'ALL' | PaymentPlanType;

const statusBadgeVariants: Record<PaymentPlanStatus, 'income' | 'indigo' | 'gray'> = {
  ACTIVE: 'income',
  COMPLETED: 'indigo',
  PAUSED: 'gray',
  CANCELLED: 'gray',
};

const statusIcons: Record<PaymentPlanStatus, string> = {
  ACTIVE: 'check_circle',
  COMPLETED: 'task_alt',
  PAUSED: 'pause_circle',
  CANCELLED: 'cancel',
};

export function PaymentPlansPage() {
  const { t } = useTranslation();
  const { linkStateFromHere } = useAppNavigation();
  const { data: plans = [], isLoading } = usePaymentPlans();
  const [filter, setFilter] = useState<PlanFilter>('ALL');

  const howItWorksBanner = useBanner(BANNER_IDS.SUBSCRIPTIONS_HOW_IT_WORKS);

  const filteredPlans = filter === 'ALL' ? plans : plans.filter((plan) => plan.planType === filter);

  const remainingInstallmentDebt = plans
    .filter((plan) => plan.status === 'ACTIVE' && plan.planType === 'INSTALLMENT')
    .reduce((total, plan) => total + (plan.remainingAmount || 0), 0);

  const filterTabs: { key: PlanFilter; label: string }[] = [
    { key: 'ALL', label: t('paymentPlans.filterAll') },
    { key: 'INSTALLMENT', label: t('paymentPlans.filterInstallment') },
    { key: 'RECURRING', label: t('paymentPlans.filterRecurring') },
    { key: 'GROUP', label: t('paymentPlans.filterGroup') },
    { key: 'CUSTOM', label: t('paymentPlans.filterCustom') },
  ];

  const createAction = (
    <Link to={Routes.PAYMENT_PLAN_NEW} state={linkStateFromHere()}>
      <Button size="sm">
        <Icon name="add" className="text-sm" />
        {t('common.new')}
      </Button>
    </Link>
  );

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-4">
      <PageHeader title={t('paymentPlans.title')} subtitle={t('paymentPlans.subtitle')} action={createAction} />

      {howItWorksBanner.isVisible && (
        <div className="px-5">
          <Card>
            <div className="flex items-start gap-3">
              <Icon name="event_repeat" className="text-dn-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dn-text-main">{t('paymentPlans.howItWorksTitle')}</p>
                <p className="text-xs text-dn-text-muted mt-1 leading-relaxed">{t('paymentPlans.howItWorksDesc')}</p>
              </div>
              <button
                onClick={howItWorksBanner.dismiss}
                aria-label={t('common.close')}
                className="shrink-0 text-dn-text-muted hover:text-dn-text-main transition-colors"
              >
                <Icon name="close" className="text-base" />
              </button>
            </div>
          </Card>
        </div>
      )}

      <div className="px-5 space-y-3">
        <Card>
          <p className="text-xs text-dn-text-muted uppercase tracking-wider">{t('paymentPlans.remainingCuotasDebt')}</p>
          <p className="text-4xl font-mono font-bold tracking-tight text-dn-primary break-all mt-1">
            {formatCurrencyShort(remainingInstallmentDebt)}
          </p>
        </Card>
      </div>

      <div className="px-5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors border ${
              filter === key
                ? 'bg-dn-primary/20 text-dn-primary border-dn-primary/30'
                : 'bg-dn-surface-low text-dn-text-muted border-transparent hover:text-dn-text-main'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredPlans.length === 0 ? (
        <EmptyState
          icon={<Icon name="payments" className="text-2xl" />}
          title={t('paymentPlans.noPlans')}
          description={t('paymentPlans.noPlansDesc')}
          action={createAction}
        />
      ) : (
        <div className="px-5 space-y-3 pb-8">
          {filteredPlans.map((plan) => (
            <PaymentPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentPlanCard({ plan }: { readonly plan: PaymentPlan }) {
  const { t } = useTranslation();
  const { linkStateFromHere } = useAppNavigation();

  const isInstallment = plan.planType === 'INSTALLMENT';
  const isActive = plan.status === 'ACTIVE';
  const linkedEventsCount = (plan.items ?? []).filter((item) => item.eventId != null).length;
  // A group and a custom plan carry no cadence and no amount of their own: they only total up
  // what is linked to them, which is also the only number worth showing on their card.
  const totalsFromLinkedEvents = isUserComposedPlan(plan.planType);
  const progressPercent =
    plan.totalInstallments && plan.totalInstallments > 0
      ? Math.min(100, Math.round((plan.completedInstallments / plan.totalInstallments) * 100))
      : 0;

  return (
    <Link
      to={Routes.PAYMENT_PLAN_DETAIL(plan.id)}
      state={linkStateFromHere()}
      className="block active:scale-[0.99] transition-transform"
    >
      <Card className={`space-y-3 ${isActive ? '' : 'opacity-60'}`}>
        <div className="flex items-center gap-4 min-w-0">
          {plan.category ? (
            <CategoryIcon category={plan.category} size="lg" shape="rounded-full" />
          ) : (
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-dn-primary/10 text-dn-primary shrink-0">
              <Icon name={planTypeIcons[plan.planType]} className="text-xl" />
            </div>
          )}

          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-base font-medium text-dn-text-main truncate">{plan.name}</span>
            <span className="text-xs text-dn-text-muted truncate">
              {t(`paymentPlans.types.${plan.planType}`)}
              {plan.frequency && ` · ${t(`subscriptions.recurrence.${plan.frequency}`)}`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusBadgeVariants[plan.status]} className="gap-1">
              <Icon name={statusIcons[plan.status]} className="text-[13px]" />
              {t(`paymentPlans.status.${plan.status}`)}
            </Badge>
            <Icon name="chevron_right" className="text-dn-text-muted text-lg" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
          <span className="text-sm font-mono text-dn-primary whitespace-nowrap">
            {totalsFromLinkedEvents
              ? formatCurrency(plan.paidAmount)
              : plan.installmentAmount
                ? formatCurrency(plan.installmentAmount)
                : '—'}
          </span>

          {totalsFromLinkedEvents ? (
            <span className="flex items-center gap-1.5 text-xs text-dn-text-muted">
              <Icon name="receipt_long" className="text-sm" />
              {t('paymentPlans.groupedEventsCount', { count: linkedEventsCount })}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-dn-text-muted">
              <Icon name={plan.isAutomated ? 'smart_toy' : 'touch_app'} className="text-sm" />
              {plan.isAutomated ? t('paymentPlans.automated') : t('paymentPlans.manual')}
            </span>
          )}
        </div>

        {isInstallment && !!plan.totalInstallments && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-dn-text-muted">{t('paymentPlans.cuotasLabel')}</span>
              <span className="font-mono text-dn-text-main">
                {plan.completedInstallments} / {plan.totalInstallments}
              </span>
            </div>
            <div className="h-2 rounded-full bg-dn-surface-low overflow-hidden">
              <div
                className="h-full rounded-full bg-dn-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}
