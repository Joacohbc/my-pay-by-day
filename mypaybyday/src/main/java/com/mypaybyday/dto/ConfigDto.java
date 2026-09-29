package com.mypaybyday.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigDto {
	public String timezone;

	/**
	 * Currency the UI preselects for a new amount. It is a default, not a base currency: the
	 * server never converts into it, and every stored amount keeps whatever code it was
	 * recorded with.
	 */
	public String defaultCurrency;
}
