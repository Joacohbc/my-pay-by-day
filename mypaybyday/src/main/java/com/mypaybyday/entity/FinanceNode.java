package com.mypaybyday.entity;

import com.mypaybyday.enums.FinanceNodeType;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceNode extends PanacheEntity {

    @NotBlank
    public String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    public FinanceNodeType type;

    @Builder.Default
    public boolean archived = false;
}
