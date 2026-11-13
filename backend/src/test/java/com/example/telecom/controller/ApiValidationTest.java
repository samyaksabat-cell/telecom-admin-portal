package com.example.telecom.controller;

import com.example.telecom.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

class ApiValidationTest {
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new UsageRecordController(mock(UsageRecordRepository.class)),
                new SupportTicketController(mock(SupportTicketRepository.class), mock(CustomerRepository.class)),
                new CustomerController(mock(CustomerRepository.class), mock(PlanRepository.class),
                        mock(UsageRecordRepository.class), mock(SupportTicketRepository.class),
                        mock(DeviceRepository.class)))
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/usage?dateFrom=2025-02-30", "/api/usage?dateTo=not-a-date", "/api/usage?type=INVALID",
            "/api/tickets?priority=INVALID", "/api/tickets?status=INVALID"})
    void malformedFiltersAreClientErrors(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").exists());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/customers", "/api/tickets"})
    void missingRequiredCreationIdsAreClientErrors(String path) throws Exception {
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }
}
