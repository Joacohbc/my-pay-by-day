package com.mypaybyday.crypto;

import java.math.BigDecimal;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class BigDecimalEncryptionConverter implements AttributeConverter<BigDecimal, String> {

	private final EncryptionUtil encryptionUtil;

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
