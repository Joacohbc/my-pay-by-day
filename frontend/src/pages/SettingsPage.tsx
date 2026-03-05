import { Link } from 'react-router-dom';
import {
  Tag as TagIcon,
  FolderOpen,
  ChevronRight,
  Info,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';

interface SettingRowProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: number;
}

function SettingRow({ to, icon, title, subtitle, count }: SettingRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors rounded-xl"
    >
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {count !== undefined && (
          <span className="text-xs text-zinc-500">{count}</span>
        )}
        <ChevronRight size={15} className="text-zinc-600" />
      </div>
    </Link>
  );
}

export function SettingsPage() {
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: nodes = [] } = useNodes();

  const activeNodes = nodes.filter((n) => !n.archived);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      {/* Data Management */}
      <section className="px-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-0">
          Data Management
        </p>
        <Card padding={false} className="overflow-hidden divide-y divide-zinc-800">
          <SettingRow
            to="/settings/categories"
            icon={<FolderOpen size={16} />}
            title="Categories"
            subtitle="Budget classification buckets"
            count={categories.length}
          />
          <SettingRow
            to="/settings/tags"
            icon={<TagIcon size={16} />}
            title="Tags"
            subtitle="Transversal labels for events"
            count={tags.length}
          />
          <SettingRow
            to="/nodes"
            icon={<Wallet size={16} />}
            title="Finance Nodes"
            subtitle="Accounts, entities, contacts"
            count={activeNodes.length}
          />
        </Card>
      </section>

      {/* About */}
      <section className="px-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          About
        </p>
        <Card>
          <div className="flex items-start gap-3">
            <Info size={16} className="text-zinc-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-200">MyPayByDay</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                A double-entry personal finance system. Every Event wraps a
                Transaction whose Line Items must always sum to zero — money
                never appears or disappears.
              </p>
              <div className="pt-2 space-y-0.5">
                <p className="text-xs text-zinc-600">Backend: Quarkus 3.x + SQLite</p>
                <p className="text-xs text-zinc-600">Frontend: React + TypeScript + Tailwind CSS</p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
