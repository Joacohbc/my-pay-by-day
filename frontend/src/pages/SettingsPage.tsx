import { Link } from 'react-router-dom';
import { Routes } from '@/lib/routes';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useTagGroups } from '@/hooks/useTagGroups';
import { useTemplates } from '@/hooks/useTemplates';
import { useNodes } from '@/hooks/useNodes';
import { useFiles } from '@/hooks/useFiles';
import { changeLanguage } from '@/i18n';
import { getCurrency, setCurrency, onCurrencyChange } from '@/lib/format';
import { commonTimezones } from '@/utils/timezones';
import { getUserTimezone } from '@/utils/dateUtils';
import { currenciesList } from '@/utils/currencies';
import { useAlert } from '@/contexts/AlertContext';
import { idbRemove } from '@/lib/idbStorage';
import { useDismissedBannersStore } from '@/store/dismissedBannersStore';

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
  const { success } = useAlert();
  const queryClient = useQueryClient();
  const resetDismissedBanners = useDismissedBannersStore((s) => s.reset);
  const [currency, _setCurrency] = useState(getCurrency);
  const [timezone, _setTimezone] = useState(() => localStorage.getItem('user-timezone') || '');
  const { data: categoriesPaged } = useCategories();
  const { data: tagsPaged } = useTags();
  const { data: tagGroupsPaged } = useTagGroups();
  const { data: templatesPaged } = useTemplates();
  const { data: nodesPaged } = useNodes();
  const { data: filesPaged } = useFiles(0, 1);

  useEffect(() => onCurrencyChange(() => _setCurrency(getCurrency())), []);

  const handleCurrencyChange = (code: string) => {
    setCurrency(code);
    _setCurrency(code);
  };

  const handleClearCache = async () => {
    queryClient.clear();
    await idbRemove('mpbd-query-cache');
    resetDismissedBanners();
    success(t('settings.clearCacheSuccess'));
    window.location.reload();
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
            <div className="relative shrink-0 w-32">
              <SearchableSelect
                value={i18n.language}
                onChange={(val) => changeLanguage(String(val))}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Español' },
                ]}
              />
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
            <div className="relative shrink-0 w-48">
              <SearchableSelect
                value={timezone}
                onChange={(val) => handleTimezoneChange(String(val))}
                options={[
                  { value: '', label: `${t('settings.timezoneBrowserDefault')} (${getUserTimezone()})` },
                  ...commonTimezones.map(tz => ({ value: tz, label: tz }))
                ]}
              />
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
            <div className="relative shrink-0 w-32">
              <SearchableSelect
                value={currency}
                onChange={(val) => handleCurrencyChange(String(val))}
                options={currenciesList.map(c => ({ value: c.code, label: c.label }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 px-4 py-3.5">
            <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-surface-low text-dn-text-muted shrink-0">
              <Icon name="delete_sweep" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dn-text-main">{t('settings.clearCache')}</p>
              <p className="text-xs text-dn-text-muted">{t('settings.clearCacheDesc')}</p>
            </div>
            <button
              onClick={handleClearCache}
              className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-dn-surface-low text-dn-text-muted hover:bg-dn-surface-low/70 transition-colors"
            >
              {t('settings.clearCache')}
            </button>
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
            to={Routes.SETTINGS_NODES}
            icon="account_balance_wallet"
            title={t('nodes.title')}
            subtitle={t('settings.nodesDesc')}
            count={nodesPaged?.totalElements}
          />
          <SettingRow
            to={Routes.SETTINGS_CATEGORIES}
            icon="folder_open"
            title={t('categories.title')}
            subtitle={t('settings.categoriesDesc')}
            count={categoriesPaged?.totalElements}
          />
          <SettingRow
            to={Routes.SETTINGS_TAGS}
            icon="tag"
            title={t('tags.title')}
            subtitle={t('settings.tagsDesc')}
            count={tagsPaged?.totalElements}
          />
          <SettingRow
            to={Routes.SETTINGS_TAG_GROUPS}
            icon="auto_awesome_mosaic"
            title={t('tagGroups.title')}
            subtitle={t('settings.tagGroupsDesc')}
            count={tagGroupsPaged?.totalElements}
          />
          <SettingRow
            to={Routes.SETTINGS_TEMPLATES}
            icon="auto_fix_high"
            title={t('templates.title')}
            subtitle={t('settings.templatesDesc')}
            count={templatesPaged?.totalElements}
          />
          <SettingRow
            to={Routes.SETTINGS_FILES}
            icon="attach_file"
            title={t('files.title')}
            subtitle={t('settings.filesDesc')}
            count={filesPaged?.totalElements}
          />
          <SettingRow
            to={Routes.SETTINGS_AI}
            icon="auto_awesome"
            title={t('ai.settings.title')}
            subtitle={t('settings.aiDesc')}
          />
          <SettingRow
            to={Routes.SETTINGS_DUPLICATES}
            icon="find_replace"
            title={t('duplicates.settings.title')}
            subtitle={t('duplicates.settings.desc')}
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
