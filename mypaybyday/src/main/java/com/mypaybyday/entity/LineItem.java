package com.mypaybyday.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
public class LineItem extends PanacheEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    @JsonIgnore
    public Transaction transaction;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "finance_node_id")
    public FinanceNode financeNode;

    @NotNull
    public BigDecimal amount;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    public Category category;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "line_item_tag",
        joinColumns = @JoinColumn(name = "line_item_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    public List<Tag> tags = new ArrayList<>();

    public LineItem() {}
}
