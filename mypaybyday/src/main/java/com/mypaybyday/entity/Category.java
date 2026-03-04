package com.mypaybyday.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.validation.constraints.NotBlank;

@Entity
public class Category extends PanacheEntity {

    @NotBlank
    public String name;

    public String description;

    public Category() {}

    public Category(String name, String description) {
        this.name = name;
        this.description = description;
    }
}
