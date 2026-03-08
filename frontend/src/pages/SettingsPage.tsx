import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { useTemplates } from '@/hooks/useTemplates';

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
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dn-text-main">{title}</p>
        {subtitle && <p className="text-xs text-dn-text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {count !== undefined && (
          <span className="text-xs font-mono text-dn-text-muted">{count}</span>
        )}
        <span className="material-symbols-outlined text-lg text-dn-text-muted/50">chevron_right</span>
      </div>
    </Link>
  );
}

export function SettingsPage() {
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: nodes = [] } = useNodes();
  const { data: templates = [] } = useTemplates();

  const activeNodes = nodes.filter((n) => !n.archived);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      {/* Data Management */}
      <section className="px-5">
        <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
          Data Management
        </p>
        <Card padding={false} className="overflow-hidden divide-y divide-white/5">
          <SettingRow
            to="/settings/categories"
            icon="folder_open"
            title="Categories"
            subtitle="Budget classification buckets"
            count={categories.length}
          />
          <SettingRow
            to="/settings/tags"
            icon="tag"
            title="Tags"
            subtitle="Transversal labels for events"
            count={tags.length}
          />
          <SettingRow
            to="/nodes"
            icon="account_balance_wallet"
            title="Finance Nodes"
            subtitle="Accounts, entities, contacts"
            count={activeNodes.length}
          />
          <SettingRow
            to="/settings/templates"
            icon="auto_fix_high"
            title="Templates"
            subtitle="Blueprints for rapid event creation"
            count={templates.length}
          />
        </Card>
      </section>

      {/* About */}
      <section className="px-5">
        <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
          About
        </p>
        <Card>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-dn-text-muted shrink-0 mt-0.5">info</span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-dn-text-main">MyPayByDay</p>
              <p className="text-xs text-dn-text-muted leading-relaxed">
                A double-entry personal finance system. Every Event wraps a
                Transaction whose Line Items must always sum to zero — money
                never appears or disappears.
              </p>
              <div className="pt-2 space-y-0.5">
                <p className="text-xs text-dn-text-muted/60">Backend: Quarkus 3.x + SQLite</p>
                <p className="text-xs text-dn-text-muted/60">Frontend: React + TypeScript + Tailwind CSS</p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
