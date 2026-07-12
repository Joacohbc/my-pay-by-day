import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useRemoveEventRelations } from "@/hooks/useEvents";
import type { FinanceEvent, RelatedEvent } from "@/models";
import { EventSelectorModal } from "@/components/events/EventSelectorModal";
import { EventCard } from "@/components/events/EventCard";
import { Routes } from "@/lib/routes";

export function RelatedEventsSection({ event }: { event: FinanceEvent }) {
    const { t } = useTranslation();
    const { navigatePush } = useAppNavigation();
    const removeRelation = useRemoveEventRelations();

    const [toRemove, setToRemove] = useState<RelatedEvent | null>(null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    const handleCreateAndLink = () => {
        navigatePush(Routes.EVENT_NEW, { relatedToEventId: event.id });
    };

    const handleRemove = async () => {
        if (!toRemove) return;
        await removeRelation.mutateAsync({
            id: event.id,
            relatedIds: [toRemove.id],
        });
        setToRemove(null);
    };

		return (
			<div className="px-5 mt-5">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
							{t("events.relatedEvents")}
						</h3>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleCreateAndLink}
							>
								<span className="flex items-center gap-1 text-dn-primary">
									<Icon name="add_circle" className="text-sm" />
									<span className="text-xs">
										{t("events.createRelatedEvent")}
									</span>
								</span>
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsSelectorOpen(true)}
							>
								<span className="flex items-center gap-1 text-dn-primary">
									<Icon name="add" className="text-sm" />
									<span className="text-xs">
										{t("events.addRelatedEvent")}
									</span>
								</span>
							</Button>
						</div>
					</div>

					<EventSelectorModal
						open={isSelectorOpen}
						onClose={() => setIsSelectorOpen(false)}
						baseEventId={event.id}
						existingRelatedIds={event.relatedEvents?.map((e) => e.id) || []}
					/>

					<ConfirmModal
						open={!!toRemove}
						onClose={() => setToRemove(null)}
						onConfirm={handleRemove}
						title={t("events.removeRelation")}
						message={t("events.confirmRemoveRelation")}
						confirmLabel={t("events.removeRelation")}
						variant="danger"
						loading={removeRelation.isPending}
					/>

					{event.relatedEvents && event.relatedEvents.length > 0 ? (
						<div className="space-y-2">
							{event.relatedEvents.map((related) => {
								// Fake FinanceEvent to reuse EventCard
								const fakeEvent = {
										id: related.id,
										name: related.name,
										type: related.type,
										transactionDate: related.date,
										category: related.category,
										lineItems: [{ amount: related.type === "OUTBOUND" ? -Number(related.amount) : Number(related.amount) }],
										tags: [],
										transactionId: 0,
								} as unknown as FinanceEvent;

								return (
									<div
										key={related.id}
										className="group p-2 border border-transparent hover:border-dn-primary/50 transition-colors rounded-2xl flex items-center justify-between gap-5"
									>
										<EventCard event={fakeEvent} />
										<button
											type="button"
											onClick={() => setToRemove(related)}
											className="flex items-center justify-center rounded-full p-2 text-dn-error hover:bg-dn-error/10 transition-colors"
											title={t("events.removeRelation")}
										>
											<Icon name="link_off" className="text-xl" />
										</button>
									</div>
								);
							})}
						</div>
					) : (
						<EmptyState title={t("events.noRelatedEvents")} />
					)}
			</div>
		);
}
