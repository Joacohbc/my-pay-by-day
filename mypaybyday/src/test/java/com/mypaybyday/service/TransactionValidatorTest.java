package com.mypaybyday.service;

import com.mypaybyday.entity.FinanceTransaction;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TransactionValidatorTest {

    TransactionValidator validator;

    @BeforeEach
    void setUp() {
        validator = new TransactionValidator();
        validator.messages = new Messages() {
            @Override
            public String get(MsgKey key, Object... args) {
                return key.name();
            }
        };
    }

    @Test
    void validateDateNotInFuture_ThrowsException_WhenDateIsFuture() {
        FinanceTransaction transaction = new FinanceTransaction();
        transaction.transactionDate = LocalDateTime.now().plusDays(1);

        assertThrows(BusinessException.class, () -> validator.validateDateNotInFuture(transaction));
    }

    @Test
    void validateDateNotInFuture_DoesNotThrowException_WhenDateIsPast() {
        FinanceTransaction transaction = new FinanceTransaction();
        transaction.transactionDate = LocalDateTime.now().minusDays(1);

        assertDoesNotThrow(() -> validator.validateDateNotInFuture(transaction));
    }

    @Test
    void validateDateNotInFuture_DoesNotThrowException_WhenDateIsNull() {
        FinanceTransaction transaction = new FinanceTransaction();
        transaction.transactionDate = null;

        assertDoesNotThrow(() -> validator.validateDateNotInFuture(transaction));
    }
}
