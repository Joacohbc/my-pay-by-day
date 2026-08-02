package com.mypaybyday.service.transfer;

import java.util.List;

import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.exception.BusinessException;

/**
 * Lets a service own the export and import of the data it already governs, so an archive is built
 * and restored through the same validation the regular CRUD paths apply.
 *
 * <p>
 * Implementations are discovered by {@code DataTransferService}, which requires exactly one per
 * {@link DataSection} and walks them in the enum's declaration order.
 *
 * @param <T> the DTO this section carries in the archive
 */
public interface DataSectionTransfer<T> {

	DataSection section();

	/**
	 * Rows this section would export. Kept separate from {@link #exportData()} so a preview can be
	 * answered with counting queries instead of serialising the whole database.
	 */
	long countForExport();

	List<T> exportData();

	/**
	 * Persists the archived items as new rows, recording every old-to-new id in {@code context} for
	 * the sections that come after, and reporting per-item refusals rather than failing the run.
	 */
	SectionImportResult importData(List<T> items, ImportContext context) throws BusinessException;

	/**
	 * Resolves self-references or cross-references that require all items in the section to be persisted first.
	 */
	default void linkDeferredReferences(ImportContext context) throws BusinessException {}
}
