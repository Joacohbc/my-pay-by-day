package com.mypaybyday.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.mypaybyday.enums.ModifierType;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Entity
public class TemplateLineItem extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    @JsonIgnore
    public Template template;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "finance_node_id")
    public FinanceNode financeNode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    public Category category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tag_id")
    public Tag tag;

    @NotNull
    @Enumerated(EnumType.STRING)
    public ModifierType modifierType;

    @NotNull
    public BigDecimal modifierValue;

    public TemplateLineItem() {}
}
