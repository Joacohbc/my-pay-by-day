package com.mypaybyday.crypto;

import java.math.BigDecimal;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
@ApplicationScoped
public class BigDecimalEncryptionConverter implements AttributeConverter<BigDecimal, String> {

	private final EncryptionUtil encryptionUtil;

	@Inject
	public BigDecimalEncryptionConverter(EncryptionUtil encryptionUtil) {
		this.encryptionUtil = encryptionUtil;
	}

	@Override
	public String convertToDatabaseColumn(BigDecimal attribute) {
		if (attribute == null) return null;
		return encryptionUtil.encrypt(attribute.toPlainString());
	}

	@Override
	public BigDecimal convertToEntityAttribute(String dbData) {
		if (dbData == null) return null;
		return new BigDecimal(encryptionUtil.decrypt(dbData));
	}
}
