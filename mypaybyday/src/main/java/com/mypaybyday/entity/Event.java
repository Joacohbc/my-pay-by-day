package com.mypaybyday.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.validation.constraints.NotBlank;

@Entity
public class Event extends PanacheEntity {

    @NotBlank
    public String name;

    public String description;

    public String receiptUrl;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transaction_id")
    public Transaction transaction;

    public Event() {}
}
