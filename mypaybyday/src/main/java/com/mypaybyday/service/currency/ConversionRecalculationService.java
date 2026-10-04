package com.mypaybyday.service.currency;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.ConversionRecalculationDto;
import com.mypaybyday.dto.RequestConversionRecalculationDto;
import com.mypaybyday.entity.ConversionRecalculationEntity;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.ConversionRecalculationRepository;
import com.mypaybyday.repository.CurrencyRepository;
import com.mypaybyday.validation.ConversionRecalculationValidator;
import io.quarkus.logging.Log;

/**
 * Lets the user re-price past transactions with a rate of their choice.
 *
 * <p>Recording a quote never touches a rate already frozen on a transaction. When a frozen rate
 * turns out to be wrong (a quote entered late, a typo, a parallel rate the user prefers), the user
 * asks for a recalculation instead: it is queued here and the scheduler works through the affected
 * transactions in the background, marking each conversion it replaces as recalculated.
 */
@ApplicationScoped
public class ConversionRecalculationService {

	static final int RECENT_RECALCULATIONS_LIMIT = 20;

	/** The message column is a VARCHAR(255). */
	private static final int MESSAGE_MAX_LENGTH = 255;

	private final ConversionRecalculationRepository conversionRecalculationRepository;
	private final CurrencyRepository currencyRepository;
	private final ConversionRecalculationValidator conversionRecalculationValidator;
	private final Messages messages;

	public ConversionRecalculationService(
			ConversionRecalculationRepository conversionRecalculationRepository,
			CurrencyRepository currencyRepository,
			ConversionRecalculationValidator conversionRecalculationValidator,
			Messages messages) {
		this.conversionRecalculationRepository = conversionRecalculationRepository;
		this.currencyRepository = currencyRepository;
		this.conversionRecalculationValidator = conversionRecalculationValidator;
		this.messages = messages;
	}

	/**
	 * Queues the recalculation; the transactions are re-priced afterwards, in the background.
	 *
	 * @throws BusinessException if the request is invalid, or the target is not a principal currency,
	 *                           since only principal currencies hold a conversion
	 */
	@Transactional
	public ConversionRecalculationDto request(RequestConversionRecalculationDto request) throws BusinessException {
		ConversionRecalculationEntity recalculation = new ConversionRecalculationEntity();
		recalculation.sourceCurrency = request.sourceCurrency();
		recalculation.targetCurrency = request.targetCurrency();
		recalculation.rate = request.rate();
		recalculation.startDate = request.startDate();
		recalculation.endDate = request.endDate();
		recalculation.status = JobStatus.PENDING;
		conversionRecalculationValidator.validate(recalculation);

		boolean isTargetPrincipal = currencyRepository.listPrincipalCodes().contains(recalculation.targetCurrency);
		if (!isTargetPrincipal) {
			throw messages.reject(MsgKey.CONVERSION_RECALCULATION_TARGET_NOT_PRINCIPAL, recalculation.targetCurrency);
		}

		conversionRecalculationRepository.persist(recalculation);
		Log.infof("Queued conversion recalculation %d: 1 %s = %s %s between %s and %s",
				recalculation.id, recalculation.sourceCurrency, recalculation.rate.toPlainString(),
				recalculation.targetCurrency, recalculation.startDate, recalculation.endDate);
		return ConversionRecalculationDto.from(recalculation);
	}

	/** The most recent recalculations, newest first. */
	@Transactional
	public List<ConversionRecalculationDto> listRecent() {
		return conversionRecalculationRepository.listNewestFirst(RECENT_RECALCULATIONS_LIMIT).stream()
				.map(ConversionRecalculationDto::from)
				.toList();
	}

	@Transactional
	public List<ConversionRecalculationDto> listPending() {
		return conversionRecalculationRepository.listPendingOldestFirst().stream()
				.map(ConversionRecalculationDto::from)
				.toList();
	}

	@Transactional
	public boolean isPendingInto(String targetCurrency) {
		return conversionRecalculationRepository.existsPendingInto(targetCurrency);
	}

	@Transactional
	public void complete(Long id, int recalculatedCount) {
		finish(id, JobStatus.COMPLETED, recalculatedCount, null);
	}

	@Transactional
	public void fail(Long id, int recalculatedCount, String reason) {
		String message = reason != null && reason.length() > MESSAGE_MAX_LENGTH
				? reason.substring(0, MESSAGE_MAX_LENGTH)
				: reason;
		finish(id, JobStatus.FAILED, recalculatedCount, message);
	}

	private void finish(Long id, JobStatus status, int recalculatedCount, String message) {
		ConversionRecalculationEntity recalculation = conversionRecalculationRepository.findById(id);
		if (recalculation == null) return;
		recalculation.status = status;
		recalculation.recalculatedCount = recalculatedCount;
		recalculation.message = message;
	}
}
