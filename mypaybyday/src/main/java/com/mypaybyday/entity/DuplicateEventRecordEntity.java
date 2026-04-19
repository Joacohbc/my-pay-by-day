package com.mypaybyday.entity;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("EVENT")
@Getter
@Setter
public class DuplicateEventRecordEntity extends DuplicateRecordEntity {

	public Double dateScore;
	public Double amountScore;
	public Double nodeScore;
	public Double categoryScore;
	public Double tagScore;
	public Double nameScore;

}
