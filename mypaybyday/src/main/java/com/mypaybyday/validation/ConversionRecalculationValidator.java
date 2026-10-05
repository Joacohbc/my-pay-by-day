package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.ConversionRecalculationEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

@ApplicationScoped
public class ConversionRecalculationValidator {

	private final CurrencyValidator currencyValidator;
	private final DateValidator dateValidator;
	private final Messages messages;

	public ConversionRecalculationValidator(CurrencyValidator currencyValidator, DateValidator dateValidator,
			Messages messages) {
		this.currencyValidator = currencyValidator;
		this.dateValidator = dateValidator;
		this.messages = messages;
	}

	/**
	 * Normalises both currency codes in place.
	 *
	 * @throws BusinessException if a code is unknown, both codes are the same, the rate is not
	 *                           positive, or the date range ends before it starts
	 */
	public void validate(ConversionRecalculationEntity recalculation) throws BusinessException {
		recalculation.sourceCurrency = currencyValidator.validateRequired(recalculation.sourceCurrency);
		recalculation.targetCurrency = currencyValidator.validateRequired(recalculation.targetCurrency);
		if (recalculation.sourceCurrency.equals(recalculation.targetCurrency)) {
			throw messages.reject(MsgKey.CONVERSION_RECALCULATION_SAME_CURRENCY, recalculation.sourceCurrency);
		}
		boolean isPositiveRate = recalculation.rate != null && recalculation.rate.signum() > 0;
		if (!isPositiveRate) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_INVALID);
		}
		dateValidator.validateDateRange(recalculation.startDate, recalculation.endDate);
	}
}
