package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import io.quarkus.arc.DefaultBean;

/**
 * The provider in place until a real quote source is wired in: any bean implementing
 * {@link ExchangeRateProvider} replaces it.
 */
@DefaultBean
@ApplicationScoped
public class UnconfiguredExchangeRateProvider implements ExchangeRateProvider {

	private final Messages messages;

	public UnconfiguredExchangeRateProvider(Messages messages) {
		this.messages = messages;
	}

	@Override
	public Map<String, BigDecimal> fetchUnitsPerBase(String baseCurrency, Set<String> currencies)
			throws BusinessException {
		throw messages.reject(MsgKey.EXCHANGE_RATE_PROVIDER_NOT_CONFIGURED);
	}
}
