package com.mypaybyday.service.transfer;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import io.quarkus.logging.Log;

/**
 * Imports the items of one section, keeping a refusal local to the item that caused it.
 *
 * <p>
 * A restore is worth more partially than not at all: one row an archive carried from an older
 * schema, or one the user hand-edited, must not cost them everything else in the file. The reasons
 * are collected instead of thrown so the import screen can show exactly what did not come back.
 */
@ApplicationScoped
public class ArchivedItemImporter {

	private final Messages messages;

	public ArchivedItemImporter(Messages messages) {
		this.messages = messages;
	}

	@FunctionalInterface
	public interface ItemImporter<T> {
		void importItem(T item) throws BusinessException;
	}

	public <T> SectionImportResult importEach(
			DataSection section,
			List<T> items,
			Function<T, String> itemLabel,
			ItemImporter<T> importItem) {

		if (items == null || items.isEmpty()) {
			return SectionImportResult.none(section);
		}

		int imported = 0;
		List<String> skipped = new ArrayList<>();
		for (T item : items) {
			try {
				importItem.importItem(item);
				imported++;
			} catch (RuntimeException e) {
				String label = itemLabel.apply(item);
				Log.warnf("Skipped %s item '%s': %s", section, label, e.getMessage());
				skipped.add(messages.get(MsgKey.DATA_TRANSFER_ITEM_SKIPPED, label, e.getMessage()));
			}
		}
		return new SectionImportResult(section, imported, List.copyOf(skipped));
	}
}
