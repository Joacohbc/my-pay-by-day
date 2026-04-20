package com.mypaybyday.entity;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("CATEGORY")
@Getter
@Setter
public class DuplicateCategoryRecordEntity extends DuplicateRecordEntity {

}
