package com.mypaybyday.crypto;

import jakarta.inject.Inject;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class StringEncryptionConverter implements AttributeConverter<String, String> {

    @Inject
    EncryptionUtil encryptionUtil;

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        return encryptionUtil.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        return encryptionUtil.decrypt(dbData);
    }
}
