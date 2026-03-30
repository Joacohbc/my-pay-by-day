package com.mypaybyday.dto;

import com.mypaybyday.enums.EventType;

/**
 * Query parameters for {@link com.mypaybyday.service.EventService#listAll}.
 * Use {@link #builder()} to construct instances with only the filters you need.
 */
public record EventQuery(
    int page,
    int size,
    String search,
    String startDate,
    String endDate,
    DateField dateField,
    EventType type,
    Long categoryId,
    Long tagId
) {
    public enum DateField { TRANSACTION, CREATED, UPDATED }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int page = 0;
        private int size = 20;
        private String search;
        private String startDate;
        private String endDate;
        private DateField dateField;
        private EventType type;
        private Long categoryId;
        private Long tagId;

        public Builder page(int page)                  { this.page = page; return this; }
        public Builder size(int size)                  { this.size = size; return this; }
        public Builder search(String search)           { this.search = search; return this; }
        public Builder startDate(String startDate)     { this.startDate = startDate; return this; }
        public Builder endDate(String endDate)         { this.endDate = endDate; return this; }
        public Builder dateField(DateField dateField)  { this.dateField = dateField; return this; }
        public Builder type(EventType type)            { this.type = type; return this; }
        public Builder categoryId(Long categoryId)     { this.categoryId = categoryId; return this; }
        public Builder tagId(Long tagId)               { this.tagId = tagId; return this; }

        public EventQuery build() {
            return new EventQuery(page, size, search, startDate, endDate, dateField, type, categoryId, tagId);
        }
    }
}
