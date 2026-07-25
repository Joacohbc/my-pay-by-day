package com.mypaybyday.validation;

import java.math.BigDecimal;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.NodeProfile;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

@ApplicationScoped
public class FinanceNodeValidator {

    private static final BigDecimal FIRST_DAY_OF_MONTH = BigDecimal.ONE;
    private static final BigDecimal LAST_DAY_PRESENT_IN_EVERY_MONTH = BigDecimal.valueOf(28);

    private final RegexValidator regexValidator;
    private final NumberValidator numberValidator;
    private final Messages messages;

    public FinanceNodeValidator(RegexValidator regexValidator, NumberValidator numberValidator, Messages messages) {
        this.regexValidator = regexValidator;
        this.numberValidator = numberValidator;
        this.messages = messages;
    }

    public void validate(FinanceNodeEntity node) throws BusinessException {
        if (node == null) return;

        node.name = regexValidator.sanitize(node.name);
        node.description = regexValidator.sanitize(node.description);
        node.icon = regexValidator.sanitize(node.icon);
        node.color = regexValidator.sanitize(node.color);

        regexValidator.validateText(node.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateText(node.description, RegexValidator.LONG_MAX_LENGTH);
        regexValidator.validateIcon(node.icon);
        regexValidator.validateColor(node.color);

        validateProfile(node.profile);
    }

    /**
    * Validates only the capabilities the profile actually declares, so a node that opts
    * out of both stays valid.
    */
    private void validateProfile(NodeProfile profile) throws BusinessException {
        if (profile == null) return;

        numberValidator.validateNonZero(profile.balanceLimit);

        boolean isCycleHalfConfigured = (profile.cycleDay == null) != (profile.settlementDay == null);
        if (isCycleHalfConfigured) {
            throw messages.reject(MsgKey.NODE_CYCLE_INCOMPLETE);
        }

        validateDayOfMonth(profile.cycleDay);
        validateDayOfMonth(profile.settlementDay);
    }

    private void validateDayOfMonth(Integer day) throws BusinessException {
        if (day == null) return;
        numberValidator.validateRange(BigDecimal.valueOf(day), FIRST_DAY_OF_MONTH, LAST_DAY_PRESENT_IN_EVERY_MONTH);
    }
}
