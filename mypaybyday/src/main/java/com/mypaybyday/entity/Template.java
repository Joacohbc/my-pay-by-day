package com.mypaybyday.entity;

import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.ModifierType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Template extends BaseEntity {

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
    @JoinTable(name = "template_tag", joinColumns = @JoinColumn(name = "template_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @Builder.Default
    public List<Tag> tags = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    public EventType eventType;

    @Enumerated(EnumType.STRING)
    public ModifierType modifierType;

    public BigDecimal modifierValue;

    @Override
    public String toRagContent() {
        return String.format(
                "A template named '%s' is configured for %s events in the category '%s'. It moves value from node '%s' to node '%s'.",
                name, eventType,
                category != null ? category.name : "Uncategorized",
                originNode != null ? originNode.name : "unknown origin",
                destinationNode != null ? destinationNode.name : "unknown destination");
    }
}
