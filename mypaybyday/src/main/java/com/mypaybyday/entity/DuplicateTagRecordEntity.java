package com.mypaybyday.entity;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("TAG")
@Getter
@Setter
public class DuplicateTagRecordEntity extends DuplicateRecordEntity {

}
