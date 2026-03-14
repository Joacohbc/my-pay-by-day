package com.mypaybyday.entity;

import com.mypaybyday.crypto.StringEncryptionConverter;
import com.mypaybyday.enums.FinanceNodeType;

import jakarta.persistence.Convert;
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
public class FinanceNode extends BaseEntity {

    /**
     * Display name of this node (e.g., "BBVA cuenta sueldo", "Visa 4567").
     *
     * <p>
     * <b>Encrypted at rest</b> via AES-256-GCM. Cannot be used in JPQL/SQL
     * {@code WHERE}, {@code LIKE}, or {@code ORDER BY} clauses — filter or sort
     * in memory after loading.
     */
    @NotBlank
    @Convert(converter = StringEncryptionConverter.class)
    public String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    public FinanceNodeType type;

    @Builder.Default
    public boolean archived = false;

    @Override
    public String toRagContent() {
        return String.format("A finance node named '%s' (ID: %s) is defined as a %s. Its current status is %s.",
                name, id != null ? id : "NEW", type, archived ? "archived" : "active");
    }
}
