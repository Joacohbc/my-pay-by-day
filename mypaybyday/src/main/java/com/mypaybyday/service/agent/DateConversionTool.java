package com.mypaybyday.service.agent;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import io.quarkus.runtime.annotations.RegisterForReflection;

import com.mypaybyday.service.ai.AgentToolKind;

@RegisterForReflection
public class DateConversionTool {

    private final ZoneId serverZone;
    private final ZoneId clientZone;

    public DateConversionTool(String clientTimezone) {
        this.serverZone = ZoneId.systemDefault();
        this.clientZone = ZoneId.of(clientTimezone);
    }

    public static String formatNow(String timezoneId) {
        ZoneId z = ZoneId.of(timezoneId != null ? timezoneId : "UTC");
        return LocalDateTime.now(z).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                + " (" + z.getId() + ")";
    }

    @Tool("Convert a date/time from the server's timezone to the user's local timezone. " +
         "Use this whenever you need to display a date/time retrieved from the database. " +
         "Input must be ISO-8601 format (e.g. '2024-01-15T14:30:00'). " +
         "Returns the converted date/time as a human-readable string with timezone label.")
    @AgentToolKind(AgentToolKind.Kind.META)
    public String convertToClientTimezone(
            @P("Date/time string in ISO-8601 format as retrieved from the database") String isoDateTime) {
        LocalDateTime ldt = LocalDateTime.parse(isoDateTime);
        ZonedDateTime serverZdt = ldt.atZone(serverZone);
        ZonedDateTime clientZdt = serverZdt.withZoneSameInstant(clientZone);
        return clientZdt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                + " (" + clientZone.getId() + ")";
    }

    @Tool("Convert a date/time from the user's local timezone to the server's timezone. " +
         "Use this before persisting any date/time provided by the user or inferred from user context. " +
         "Input must be ISO-8601 format (e.g. '2024-01-15T14:30:00') in the user's local timezone. " +
         "Returns the ISO-8601 date/time string adjusted to the server's timezone, ready to be stored.")
    @AgentToolKind(AgentToolKind.Kind.META)
    public String convertToServerTimezone(
            @P("Date/time string in ISO-8601 format in the user's local timezone") String isoDateTime) {
        LocalDateTime ldt = LocalDateTime.parse(isoDateTime);
        ZonedDateTime clientZdt = ldt.atZone(clientZone);
        ZonedDateTime serverZdt = clientZdt.withZoneSameInstant(serverZone);
        return serverZdt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
