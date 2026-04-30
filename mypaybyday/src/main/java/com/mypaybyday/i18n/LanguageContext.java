package com.mypaybyday.i18n;

import jakarta.enterprise.context.RequestScoped;

@RequestScoped
public class LanguageContext {

	private String lang = "en";

	public String getDefaultLanguage() {
		return "en";
	}

	public String getLang() {
		return lang;
	}

	public void setLang(String lang) {
		this.lang = lang;
	}

	public String getLanguageName() {
		return switch (lang.toLowerCase()) {
			case "es" -> "Spanish";
			case "en" -> "English";
			default -> lang;
		};
	}
}
