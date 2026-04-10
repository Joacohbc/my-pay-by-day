package com.mypaybyday.entity;

import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "SystemJob")
@Table(name = "SystemJob")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemJobEntity extends BaseEntity {

	@NotNull
	@Enumerated(EnumType.STRING)
	public JobCategory jobCategory;

	@NotNull
	@Enumerated(EnumType.STRING)
	public JobStatus status;

	@NotNull
	public LocalDate nextExecutionDate;

	public String entityId;

	public String message;

}
