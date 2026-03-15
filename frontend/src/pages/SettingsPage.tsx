import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useTemplates } from '@/hooks/useTemplates';
import { useNodes } from '@/hooks/useNodes';
import { changeLanguage } from '@/i18n';
import { getCurrency, setCurrency, onCurrencyChange } from '@/lib/format';
import { commonTimezones } from '@/utils/timezones';
import { getUserTimezone } from '@/utils/dateUtils';

interface SettingRowProps {
  to: string;
  icon: string;
  title: string;
  subtitle?: string;
  count?: number;
}

function SettingRow({ to, icon, title, subtitle, count }: SettingRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-dn-surface-low/50 transition-colors"
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-surface-low text-dn-text-muted shrink-0">
        <Icon name={icon} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dn-text-main">{title}</p>
        {subtitle && <p className="text-xs text-dn-text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {count !== undefined && (
          <span className="text-xs font-mono text-dn-text-muted">{count}</span>
        )}
        <Icon name="chevron_right" className="text-lg text-dn-text-muted/50" />
      </div>
    </Link>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [currency, _setCurrency] = useState(getCurrency);
  const [timezone, _setTimezone] = useState(() => localStorage.getItem('user-timezone') || '');
  const { data: categoriesPaged } = useCategories();
  const { data: tagsPaged } = useTags();
  const { data: templatesPaged } = useTemplates();
  const { data: nodesPaged } = useNodes();

  useEffect(() => onCurrencyChange(() => _setCurrency(getCurrency())), []);

  const handleCurrencyChange = (code: string) => {
    setCurrency(code);
    _setCurrency(code);
  };

  const handleTimezoneChange = (tz: string) => {
    if (tz === '') {
      localStorage.removeItem('user-timezone');
    } else {
      localStorage.setItem('user-timezone', tz);
    }
    _setTimezone(tz);
    // Force a reload to quickly apply timezone to all cached date-fns-tz computations across the app
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} />

      {/* Preferences */}
      <section className="px-5">
        <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
          {t('settings.preferences')}
        </p>
        <Card padding={false} className="overflow-hidden divide-y divide-white/5">
          <div className="flex items-center gap-4 px-4 py-3.5">
            <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-surface-low text-dn-text-muted shrink-0">
              <Icon name="language" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dn-text-main">{t('settings.language')}</p>
              <p className="text-xs text-dn-text-muted">{t('settings.languageDesc')}</p>
            </div>
            <div className="relative shrink-0">
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="appearance-none text-sm bg-dn-surface-low text-dn-text-main border border-white/10 rounded-input pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-dn-primary"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
              <Icon name="expand_more" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-base text-dn-text-muted" />
            </div>
          </div>
          <div className="flex items-center gap-4 px-4 py-3.5">
            <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-surface-low text-dn-text-muted shrink-0">
              <Icon name="schedule" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dn-text-main">{t('settings.timezone')}</p>
              <p className="text-xs text-dn-text-muted">{t('settings.timezoneDesc')}</p>
            </div>
            <div className="relative shrink-0">
              <select
                value={timezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="appearance-none text-sm bg-dn-surface-low text-dn-text-main border border-white/10 rounded-input pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-dn-primary max-w-[150px] truncate"
              >
                <option value="">{t('settings.timezoneBrowserDefault')} ({getUserTimezone()})</option>
                {commonTimezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <Icon name="expand_more" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-base text-dn-text-muted" />
            </div>
          </div>
          <div className="flex items-center gap-4 px-4 py-3.5">
            <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-surface-low text-dn-text-muted shrink-0">
              <Icon name="payments" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dn-text-main">{t('settings.currency')}</p>
              <p className="text-xs text-dn-text-muted">{t('settings.currencyDesc')}</p>
            </div>
            <div className="relative shrink-0">
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="appearance-none text-sm bg-dn-surface-low text-dn-text-main border border-white/10 rounded-input pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-dn-primary"
              >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="ARS">ARS ($)</option>
              <option value="MXN">MXN ($)</option>
              <option value="COP">COP ($)</option>
              <option value="CLP">CLP ($)</option>
              <option value="PEN">PEN (S/)</option>
              <option value="BRL">BRL (R$)</option>
              <option value="UYU">UYU ($)</option>
              <option value="JPY">JPY (¥)</option>
              </select>
              <Icon name="expand_more" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-base text-dn-text-muted" />
            </div>
          </div>
        </Card>
      </section>

      {/* Data Management */}
      <section className="px-5">
        <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
          {t('settings.dataManagement')}
        </p>
        <Card padding={false} className="overflow-hidden divide-y divide-white/5">
          <SettingRow
            to="/settings/nodes"
            icon="account_balance_wallet"
            title={t('nodes.title')}
            subtitle={t('settings.nodesDesc')}
            count={nodesPaged?.totalElements}
          />
          <SettingRow
            to="/settings/categories"
            icon="folder_open"
            title={t('categories.title')}
            subtitle={t('settings.categoriesDesc')}
            count={categoriesPaged?.totalElements}
          />
          <SettingRow
            to="/settings/tags"
            icon="tag"
            title={t('tags.title')}
            subtitle={t('settings.tagsDesc')}
            count={tagsPaged?.totalElements}
          />
          <SettingRow
            to="/settings/templates"
            icon="auto_fix_high"
            title={t('templates.title')}
            subtitle={t('settings.templatesDesc')}
            count={templatesPaged?.totalElements}
          />
        </Card>
      </section>

      {/* About */}
      <section className="px-5">
        <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
          {t('settings.about')}
        </p>
        <Card>
          <div className="flex items-start gap-3">
            <Icon name="info" className="text-dn-text-muted shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-dn-text-main">{t('settings.appName')}</p>
              <p className="text-xs text-dn-text-muted leading-relaxed">
                {t('settings.appDesc')}
              </p>
              <div className="pt-2 space-y-0.5">
                <p className="text-xs text-dn-text-muted/60">{t('settings.backendStack')}</p>
                <p className="text-xs text-dn-text-muted/60">{t('settings.frontendStack')}</p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
