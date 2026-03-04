package com.mypaybyday.entity;

import com.mypaybyday.enums.FinanceNodeType;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
public class FinanceNode extends PanacheEntity {

    @NotBlank
    public String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    public FinanceNodeType type;

    public boolean archived = false;

    // Constructors
    public FinanceNode() {}

    public FinanceNode(String name, FinanceNodeType type) {
        this.name = name;
        this.type = type;
    }

    // Since it's PanacheEntity, id is inherited and fields are public.
    // balance is calculated on the fly in the service layer, so no field here.
}
