package com.mypaybyday.entity;

import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.RecurrenceFrequency;
import com.mypaybyday.enums.SubscriptionStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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

@Entity(name = "Subscription")
@Table(name = "Subscription")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionEntity extends BaseEntity {

    @NotBlank
    public String name;

    public String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "origin_node_id")
    public FinanceNodeEntity originNode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "destination_node_id")
    public FinanceNodeEntity destinationNode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    public CategoryEntity category;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "subscription_tag", joinColumns = @JoinColumn(name = "subscription_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @Builder.Default
    public List<TagEntity> tags = new ArrayList<>();

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

}

