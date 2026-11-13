package com.example.telecom.controller;

import com.example.telecom.model.Plan;
import com.example.telecom.repository.PlanRepository;
import com.example.telecom.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PlanControllerTest {

    private final PlanRepository repository = mock(PlanRepository.class);
    private final CustomerRepository customerRepository = mock(CustomerRepository.class);

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new PlanController(repository, customerRepository)).build();
    }

    @Test
    void getAllPlansReturnsSnakeCasePayload() throws Exception {
        when(repository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(plan(1L, "Basic", "20.00"))));

        mockMvc.perform(get("/api/plans")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(1)).andExpect(jsonPath("$[0].name").value("Basic"))
                .andExpect(jsonPath("$[0].monthly_price").value(20.00))
                .andExpect(jsonPath("$[0].data_limit_gb").value(10))
                .andExpect(jsonPath("$[0].minutes_limit").value(500)).andExpect(jsonPath("$[0].sms_limit").value(500))
                .andExpect(jsonPath("$[0].is_active").value(true));
    }

    @Test
    void getActivePlansDelegatesToActiveOnlyQuery() throws Exception {
        when(repository.findByIsActiveTrue()).thenReturn(List.of(plan(2L, "Standard", "40.00")));

        mockMvc.perform(get("/api/plans/active")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Standard"));

        verify(repository, never()).findAll();
    }

    @Test
    void getPlanReturnsNotFoundForUnknownId() throws Exception {
        when(repository.findById(anyLong())).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/plans/404")).andExpect(status().isNotFound());
    }

    @Test
    void createPlanPersistsRequestFields() throws Exception {
        when(repository.save(any(Plan.class))).thenAnswer(invocation -> {
            Plan saved = invocation.getArgument(0);
            saved.setId(9L);
            return saved;
        });

        String body = """
                {"name":"Student","monthlyPrice":15.50,"dataLimitGb":5,"minutesLimit":300,"smsLimit":300}
                """;

        mockMvc.perform(post("/api/plans").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(9))
                .andExpect(jsonPath("$.name").value("Student")).andExpect(jsonPath("$.monthly_price").value(15.50))
                .andExpect(jsonPath("$.is_active").value(true));
    }

    @Test
    void updatePlanLeavesActiveFlagAloneWhenOmitted() throws Exception {
        Plan existing = plan(3L, "Premium", "60.00");
        existing.setIsActive(false);
        when(repository.findById(3L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Plan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String body = """
                {"name":"Premium Plus","monthlyPrice":65.00,"dataLimitGb":50,"minutesLimit":1000,"smsLimit":1000}
                """;

        mockMvc.perform(put("/api/plans/3").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Premium Plus"))
                .andExpect(jsonPath("$.monthly_price").value(65.00)).andExpect(jsonPath("$.is_active").value(false));
    }

    @Test
    void deletePlanReturnsNoContentWhenPresent() throws Exception {
        when(repository.existsById(4L)).thenReturn(true);

        mockMvc.perform(delete("/api/plans/4")).andExpect(status().isNoContent());

        verify(repository).deleteById(4L);
    }

    @Test
    void deletePlanReturnsNotFoundWhenMissing() throws Exception {
        when(repository.existsById(404L)).thenReturn(false);

        mockMvc.perform(delete("/api/plans/404")).andExpect(status().isNotFound());

        verify(repository, never()).deleteById(anyLong());
    }

    @Test
    void deletePlanWithCustomersReturnsConflict() throws Exception {
        when(repository.existsById(4L)).thenReturn(true);
        when(customerRepository.existsByPlanId(4L)).thenReturn(true);

        mockMvc.perform(delete("/api/plans/4")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").exists());

        verify(repository, never()).deleteById(anyLong());
    }

    private static Plan plan(Long id, String name, String price) {
        Plan plan = new Plan(name, new BigDecimal(price), 10, 500, 500);
        plan.setId(id);
        return plan;
    }
}
