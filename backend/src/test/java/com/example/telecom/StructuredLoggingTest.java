package com.example.telecom;

import com.example.telecom.controller.PlanController;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.PlanRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@ExtendWith(OutputCaptureExtension.class)
class StructuredLoggingTest {

    private static final Logger LOG = LoggerFactory.getLogger(StructuredLoggingTest.class);
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void productionConfigWritesSingleLineJsonWithContextAndExceptions(CapturedOutput output) {
        // Load the deployment config, not the test datasource configuration that
        // shadows it.
        try (var context = new SpringApplicationBuilder(LoggingApplication.class).web(WebApplicationType.NONE)
                .run("--spring.config.location=file:src/main/resources/application.yaml")) {
            MDC.put("request_id", "logging-test");
            try {
                LOG.atInfo().addKeyValue("event", "logging_test").addKeyValue("count", 3)
                        .log("Message with \"quotes\"\nand a second line");
                LOG.error("Operation failed", new IllegalStateException("failure\nwith details"));
                LOG.debug("Debug should remain filtered");
            } finally {
                MDC.remove("request_id");
            }
            LOG.info("Context cleared");
        }

        List<JsonNode> records = parseRecords(output);
        JsonNode event = find(records, "Message with \"quotes\"\nand a second line");
        assertThat(event.path("level").asString()).isEqualTo("INFO");
        assertThat(event.path("logger_name").asString()).isEqualTo(StructuredLoggingTest.class.getName());
        assertThat(event.path("thread_name").asString()).isEqualTo(Thread.currentThread().getName());
        assertThat(Instant.parse(event.path("@timestamp").asString())).isNotNull();
        assertThat(event.path("event").asString()).isEqualTo("logging_test");
        assertThat(event.path("count").asInt()).isEqualTo(3);
        assertThat(event.path("request_id").asString()).isEqualTo("logging-test");

        JsonNode error = find(records, "Operation failed");
        assertThat(error.path("level").asString()).isEqualTo("ERROR");
        assertThat(error.path("stack_trace").asString()).contains("java.lang.IllegalStateException",
                "failure\nwith details", "StructuredLoggingTest");
        assertThat(find(records, "Context cleared").has("request_id")).isFalse();
        assertThat(records)
                .noneMatch(record -> record.path("message").asString().equals("Debug should remain filtered"));
    }

    @Test
    void existingControllerLogsUseTheStructuredConsole(CapturedOutput output) {
        try (var context = new SpringApplicationBuilder(LoggingApplication.class).web(WebApplicationType.NONE)
                .run("--spring.config.location=file:src/main/resources/application.yaml")) {
            var controller = new PlanController(mock(PlanRepository.class), mock(CustomerRepository.class));
            assertThat(controller.getPlan(404L).getStatusCode().value()).isEqualTo(404);
        }

        JsonNode warning = find(parseRecords(output), "Plan not found: id=404");
        assertThat(warning.path("level").asString()).isEqualTo("WARN");
        assertThat(warning.path("logger_name").asString()).isEqualTo(PlanController.class.getName());
    }

    private List<JsonNode> parseRecords(CapturedOutput output) {
        // Parse every stdout line, so banners, text prefixes, and unescaped newlines
        // fail the test.
        List<JsonNode> records = output.getOut().lines().map(mapper::readTree).toList();
        assertThat(records).isNotEmpty();
        return records;
    }

    private JsonNode find(List<JsonNode> records, String message) {
        return records.stream().filter(record -> record.path("message").asString().equals(message)).findFirst()
                .orElseThrow(() -> new AssertionError("Missing log event: " + message));
    }

    @Configuration(proxyBeanMethods = false)
    static class LoggingApplication {
    }
}
