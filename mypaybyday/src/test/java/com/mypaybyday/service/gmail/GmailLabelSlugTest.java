package com.mypaybyday.service.gmail;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class GmailLabelSlugTest {

	@Test
	void slugifiesLabelNamesTheWayGmailSearchExpectsThem() {
		assertEquals("pagos---enviado", GmailIngestionService.labelSlug("Pagos - Enviado"));
		assertEquals("santander-pagos-crédito", GmailIngestionService.labelSlug("santander-pagos-crédito"));
		assertEquals("bancos-prex", GmailIngestionService.labelSlug("Bancos/Prex"));
	}
}
