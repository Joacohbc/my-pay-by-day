package com.mypaybyday.service;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import jakarta.enterprise.context.ApplicationScoped;
import io.quarkus.arc.All;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.StreamingOutput;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mypaybyday.dto.DataExportSummaryDto;
import com.mypaybyday.dto.DataTransferDto;
import com.mypaybyday.dto.DataTransferResult;
import com.mypaybyday.dto.SectionCountDto;
import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FileRepository;
import com.mypaybyday.service.transfer.DataSectionTransfer;
import com.mypaybyday.service.transfer.ImportContext;
import com.mypaybyday.validation.CurrencyValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class DataTransferService {

	/**
	 * Easily modifiable version of the Data Transfer & Backup archive schema.
	 */
	public static final String CURRENT_VERSION = "1.1";

	private final Map<DataSection, DataSectionTransfer<?>> transfersBySection;
	private final FileRepository fileRepository;
	private final Messages messages;
	private final CurrencyValidator currencyValidator;
	private final String defaultCurrency;

	public DataTransferService(
			@All List<DataSectionTransfer<?>> transfers,
			FileRepository fileRepository,
			Messages messages,
			CurrencyValidator currencyValidator,
			@ConfigProperty(name = "mypaybyday.default-currency") String defaultCurrency) {
		this.fileRepository = fileRepository;
		this.messages = messages;
		this.currencyValidator = currencyValidator;
		this.defaultCurrency = defaultCurrency;
		this.transfersBySection = new EnumMap<>(DataSection.class);

		for (DataSectionTransfer<?> transfer : transfers) {
			DataSection section = transfer.section();
			if (transfersBySection.containsKey(section)) {
				throw new IllegalStateException("Duplicate DataSectionTransfer bean for " + section);
			}
			transfersBySection.put(section, transfer);
		}

		for (DataSection section : DataSection.values()) {
			if (!transfersBySection.containsKey(section)) {
				throw new IllegalStateException("Missing DataSectionTransfer bean for section " + section);
			}
		}
	}

	@Transactional
	public DataExportSummaryDto summary() {
		List<SectionCountDto> counts = new ArrayList<>();
		for (DataSection section : DataSection.values()) {
			DataSectionTransfer<?> transfer = transfersBySection.get(section);
			counts.add(new SectionCountDto(section, transfer.countForExport()));
		}
		long binaryFileCount = fileRepository.count();
		return new DataExportSummaryDto(DataTransferDto.CURRENT_VERSION, LocalDateTime.now(ZoneOffset.UTC), counts, binaryFileCount);
	}

	public StreamingOutput exportAsZip() {
		return os -> {
			try (ZipOutputStream zos = new ZipOutputStream(os)) {
				zos.putNextEntry(new ZipEntry("data.json"));
				DataTransferDto dto = exportAllWithoutBase64();
				ObjectMapper mapper = new ObjectMapper();
				mapper.registerModule(new JavaTimeModule());
				byte[] jsonBytes = mapper.writeValueAsBytes(dto);
				zos.write(jsonBytes);
				zos.closeEntry();

				try (java.util.stream.Stream<FileEntity> filesStream = fileRepository.streamAll()) {
					filesStream.forEach(file -> {
						if (file.data != null) {
							try {
								zos.putNextEntry(new ZipEntry("files/" + file.id));
								zos.write(file.data);
								zos.closeEntry();
							} catch (Exception e) {
								throw new RuntimeException(e);
							}
						}
					});
				}
			}
		};
	}

	@Transactional
	public DataTransferDto exportAllWithoutBase64() {
		Map<DataSection, List<?>> sections = new EnumMap<>(DataSection.class);
		for (DataSection section : DataSection.values()) {
			DataSectionTransfer<?> transfer = transfersBySection.get(section);
			sections.put(section, transfer.exportData());
		}
		return DataTransferDto.from(sections);
	}

	/**
	 * @param legacyCurrency the currency of the amounts in an archive exported before amounts carried
	 *                       one; {@code null} means the configured default currency
	 * @throws BusinessException if the archive is unreadable or the legacy currency is unknown
	 */
	public DataTransferResult importFromZip(InputStream zipStream, String legacyCurrency) throws BusinessException {
		ImportContext context = new ImportContext(resolveLegacyCurrency(legacyCurrency));
		try (ZipInputStream zis = new ZipInputStream(zipStream)) {
			ZipEntry entry;
			DataTransferDto dto = null;
			DataTransferResult result = null;

			while ((entry = zis.getNextEntry()) != null) {
				if (entry.getName().equals("data.json")) {
					ObjectMapper mapper = new ObjectMapper();
					mapper.registerModule(new JavaTimeModule());
					mapper.configure(com.fasterxml.jackson.core.JsonParser.Feature.AUTO_CLOSE_SOURCE, false);
					dto = mapper.readValue(zis, DataTransferDto.class);
					Log.infof("Importing backup archive version=%s exportedAt=%s", dto.version(), dto.exportedAt());
					result = importAllWithContext(dto, context);
				} else if (entry.getName().startsWith("files/")) {
					String oldIdStr = entry.getName().substring(6);
					Long oldId = Long.parseLong(oldIdStr);
					Long newId = context.remap(DataSection.FILES, oldId);
					if (newId != null) {
						byte[] data = zis.readAllBytes();
						updateFileData(newId, data);
					}
				}
				zis.closeEntry();
			}
			if (dto == null) {
				throw new BusinessException(messages.get(MsgKey.DATA_TRANSFER_MANIFEST_MISSING));
			}
			return result != null ? result : new DataTransferResult(List.of());
		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			Log.errorf(e, "Import from zip failed");
			throw new BusinessException(messages.get(MsgKey.DATA_TRANSFER_ARCHIVE_UNREADABLE));
		}
	}

	@Transactional
	public DataTransferResult importAll(DataTransferDto dto) throws BusinessException {
		return importAllWithContext(dto, new ImportContext(defaultCurrency));
	}

	private String resolveLegacyCurrency(String legacyCurrency) throws BusinessException {
		String chosen = currencyValidator.validateOptional(legacyCurrency);
		return chosen != null ? chosen : currencyValidator.validateRequired(defaultCurrency);
	}

	@Transactional
	public DataTransferResult importAllWithContext(DataTransferDto dto, ImportContext context) throws BusinessException {
		if (dto == null) {
			throw new BusinessException(messages.get(MsgKey.DATA_TRANSFER_MANIFEST_MISSING));
		}
		if (dto.version() != null && dto.version().compareTo(CURRENT_VERSION) > 0) {
			throw new BusinessException(messages.get(MsgKey.DATA_TRANSFER_VERSION_UNSUPPORTED, dto.version()));
		}

		List<SectionImportResult> results = new ArrayList<>();
		for (DataSection section : DataSection.values()) {
			DataSectionTransfer<?> transfer = transfersBySection.get(section);
			List<?> items = dto.section(section);
			SectionImportResult sectionResult = importSectionUnchecked(transfer, items, context);
			results.add(sectionResult);
		}

		for (DataSection section : DataSection.values()) {
			DataSectionTransfer<?> transfer = transfersBySection.get(section);
			transfer.linkDeferredReferences(context);
		}

		return new DataTransferResult(results);
	}

	@SuppressWarnings("unchecked")
	private SectionImportResult importSectionUnchecked(DataSectionTransfer<?> transfer, List<?> items, ImportContext context) throws BusinessException {
		return ((DataSectionTransfer<Object>) transfer).importData((List<Object>) items, context);
	}

	@Transactional
	public void updateFileData(Long newId, byte[] data) {
		FileEntity entity = fileRepository.findById(newId);
		if (entity != null) {
			entity.data = data;
			try {
				java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
				byte[] hashBytes = md.digest(entity.data);
				entity.hash = java.util.HexFormat.of().formatHex(hashBytes);
			} catch (java.security.NoSuchAlgorithmException e) {
				throw new RuntimeException(e);
			}
		}
	}
}
