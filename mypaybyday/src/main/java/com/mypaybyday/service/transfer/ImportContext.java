package com.mypaybyday.service.transfer;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

import com.mypaybyday.enums.DataSection;

/**
 * Carries the old-id to new-id translation across an import run.
 *
 * <p>
 * Every section is persisted with fresh identifiers so an archive can be restored next to existing
 * data, which means a later section can only resolve its foreign keys through what the earlier ones
 * recorded here. Sections therefore depend on this context rather than on each other's signatures.
 */
public final class ImportContext {

	private final Map<DataSection, Map<Long, Long>> remappedIdsBySection = new EnumMap<>(DataSection.class);
	private final String legacyCurrency;

	/**
	 * @param legacyCurrency the currency of every amount in an archive written before amounts carried
	 *                       one, chosen by the user when importing it
	 */
	public ImportContext(String legacyCurrency) {
		this.legacyCurrency = legacyCurrency;
	}

	/**
	 * Call only for an amount that exists: like the V7 migration, a currency is filled in next to an
	 * amount and left empty everywhere else.
	 *
	 * @return the archived currency, or the legacy currency when the archive predates currencies
	 */
	public String currencyOrLegacy(String archivedCurrency) {
		return archivedCurrency != null ? archivedCurrency : legacyCurrency;
	}

	public void rememberId(DataSection section, Long oldId, Long newId) {
		if (oldId == null || newId == null) return;
		remappedIdsBySection.computeIfAbsent(section, key -> new HashMap<>()).put(oldId, newId);
	}

	public Long remap(DataSection section, Long oldId) {
		if (oldId == null) return null;
		return remappedIdsBySection.getOrDefault(section, Map.of()).get(oldId);
	}

	public Map<Long, Long> remappedIds(DataSection section) {
		return Map.copyOf(remappedIdsBySection.getOrDefault(section, Map.of()));
	}
}
