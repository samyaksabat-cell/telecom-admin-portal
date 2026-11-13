package com.example.telecom.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;

/**
 * Stores every {@link Instant} as UTC text in the seeder's format
 * ({@code yyyy-MM-dd HH:mm:ss.SSS}).
 *
 * <p>
 * SQLite orders values by storage class before value, so epoch-millis integers
 * written by the JDBC driver never compared or sorted correctly against the
 * seeded text timestamps. Keeping one fixed-width text format makes string
 * order equal time order, including for query parameters, which Hibernate
 * converts with the attribute's converter.
 */
@Converter(autoApply = true)
public class InstantTextConverter implements AttributeConverter<Instant, String> {

    private static final DateTimeFormatter WRITE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
            .withZone(ZoneOffset.UTC);

    private static final DateTimeFormatter READ_FORMAT = new DateTimeFormatterBuilder()
            .appendPattern("yyyy-MM-dd HH:mm:ss").optionalStart().appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true)
            .optionalEnd().toFormatter();

    @Override
    public String convertToDatabaseColumn(Instant value) {
        return value == null ? null : WRITE_FORMAT.format(value);
    }

    @Override
    public Instant convertToEntityAttribute(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String text = value.trim();
        // Rows written before this converter existed hold epoch milliseconds.
        if (text.chars().allMatch(Character::isDigit)) {
            return Instant.ofEpochMilli(Long.parseLong(text));
        }
        String normalized = text.replace('T', ' ');
        if (normalized.endsWith("Z")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return LocalDateTime.parse(normalized, READ_FORMAT).toInstant(ZoneOffset.UTC);
    }
}
