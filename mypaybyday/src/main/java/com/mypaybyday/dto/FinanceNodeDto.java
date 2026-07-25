package com.mypaybyday.dto;

import java.math.BigDecimal;

import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.NodeProfile;
import com.mypaybyday.enums.FinanceNodeType;

/**
 * Public contract for a {@link FinanceNodeEntity}.
 *
 * <p>
 * The node's optional capabilities are exposed as flat fields rather than a nested
 * object: {@link NodeProfile} is a persistence-mapping detail, and leaking it into the
 * REST contract would tie clients (and the generated OpenAPI schema) to that mapping.
 *
 * @param balanceLimit  signed boundary the balance should stay within — negative for a
 *                      floor (liability), positive for a ceiling (target). {@code null}
 *                      when the node declares no limit
 * @param cycleDay      day of month the node's cycle closes, or {@code null}
 * @param settlementDay day of month a closed cycle is settled, or {@code null}
 */
public record FinanceNodeDto(
		Long id,
		String name,
		FinanceNodeType type,
		String description,
		String icon,
		String color,
		boolean archived,
		BigDecimal balanceLimit,
		Integer cycleDay,
		Integer settlementDay
) {

	public static FinanceNodeDto from(FinanceNodeEntity node) {
		NodeProfile profile = node.profile != null ? node.profile : new NodeProfile();
		return new FinanceNodeDto(
				node.id,
				node.name,
				node.type,
				node.description,
				node.icon,
				node.color,
				node.archived,
				profile.balanceLimit,
				profile.cycleDay,
				profile.settlementDay);
	}


	public FinanceNodeEntity to() {
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.id = this.id;
		node.name = this.name;
		node.type = this.type;
		node.description = this.description;
		node.icon = this.icon;
		node.color = this.color;
		node.archived = this.archived;
		node.profile = this.toProfile();
		return node;
	}

	/**
	* Builds the embeddable carrying whichever capabilities this DTO declares.
	*/
	public NodeProfile toProfile() {
		NodeProfile profile = new NodeProfile();
		profile.balanceLimit = this.balanceLimit;
		profile.cycleDay = this.cycleDay;
		profile.settlementDay = this.settlementDay;
		return profile;
	}
}
