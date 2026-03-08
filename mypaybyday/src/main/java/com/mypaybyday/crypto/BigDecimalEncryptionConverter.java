package com.mypaybyday.crypto;

import jakarta.inject.Inject;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.math.BigDecimal;

@Converter
public class BigDecimalEncryptionConverter implements AttributeConverter<BigDecimal, String> {

    @Inject
    EncryptionUtil encryptionUtil;

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
