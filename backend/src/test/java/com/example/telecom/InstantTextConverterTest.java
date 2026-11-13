package com.example.telecom;

import com.example.telecom.model.InstantTextConverter;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class InstantTextConverterTest {
    private final InstantTextConverter converter = new InstantTextConverter();

    @Test
    void writesUtcWithFixedMillisecondPrecision() {
        assertEquals("2025-01-02 12:34:56.123",
                converter.convertToDatabaseColumn(Instant.parse("2025-01-02T12:34:56.123456Z")));
        assertEquals("2025-01-02 00:00:00.000",
                converter.convertToDatabaseColumn(Instant.parse("2025-01-02T00:00:00Z")));
    }

    @Test
    void readsSeededTextAndLegacyJdbcValues() {
        Instant expected = Instant.parse("2025-01-02T12:34:56.123Z");
        assertEquals(expected, converter.convertToEntityAttribute("2025-01-02 12:34:56.123"));
        assertEquals(expected, converter.convertToEntityAttribute("2025-01-02T12:34:56.123Z"));
        assertEquals(expected, converter.convertToEntityAttribute(Long.toString(expected.toEpochMilli())));
        assertEquals(Instant.parse("2025-01-02T00:00:00Z"), converter.convertToEntityAttribute("2025-01-02 00:00:00"));
    }

    @Test
    void handlesNullValues() {
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
    }
}
