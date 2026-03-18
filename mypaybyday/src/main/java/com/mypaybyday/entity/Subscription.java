package com.mypaybyday.entity;

import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.ModifierType;
import com.mypaybyday.enums.RecurrenceFrequency;
import com.mypaybyday.enums.SubscriptionStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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
public class Subscription extends BaseEntity {

    @NotBlank
    public String name;

    public String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "origin_node_id")
    public FinanceNode originNode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "destination_node_id")
    public FinanceNode destinationNode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    public Category category;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "subscription_tag", joinColumns = @JoinColumn(name = "subscription_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @Builder.Default
    public List<Tag> tags = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    public EventType eventType;

    public BigDecimal modifierValue;

    @NotNull
    @Enumerated(EnumType.STRING)
    public RecurrenceFrequency recurrence;

    @NotNull
    public LocalDate nextExecutionDate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Builder.Default
    public SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Override
    public String toRagContent() {
        return String.format(
            "A recurring subscription named '%s' is scheduled with %s frequency. The next execution is planned for %s. It is configured for %s events in the category '%s'. It moves value from node '%s' to node '%s'. Its status is %s.",
            name, recurrence, nextExecutionDate, eventType,
            category != null ? category.name : "Uncategorized",
            originNode != null ? originNode.name : "unknown origin",
            destinationNode != null ? destinationNode.name : "unknown destination",
            status);
    }
}
