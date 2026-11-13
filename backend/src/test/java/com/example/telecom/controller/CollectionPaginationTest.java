package com.example.telecom.controller;

import com.example.telecom.model.*;
import com.example.telecom.repository.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.IntStream;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CollectionPaginationTest {
    @ParameterizedTest
    @ValueSource(strings = {"customers", "devices", "plans"})
    void collectionsExposeContinuationPastTheirFormerCaps(String collection) throws Exception {
        var plans = mock(PlanRepository.class);
        var customers = mock(CustomerRepository.class);
        var devices = mock(DeviceRepository.class);
        int size = "plans".equals(collection) ? 100 : 1000;
        Plan plan = new Plan("Test", BigDecimal.TEN, 1, 1, 1);
        List<Plan> planRows = IntStream.rangeClosed(1, 101).mapToObj(id -> {
            Plan row = new Plan("Plan" + id, BigDecimal.TEN, 1, 1, 1);
            row.setId((long) id);
            return row;
        }).toList();
        List<Customer> customerRows = IntStream.rangeClosed(1, 1001).mapToObj(id -> {
            Customer row = new Customer("First", "Last", "test" + id + "@example.test", "555", plan);
            row.setId((long) id);
            return row;
        }).toList();
        List<Device> deviceRows = IntStream.rangeClosed(1, 1001).mapToObj(id -> {
            Device row = new Device("imei" + id, "Test", "sim" + id);
            row.setId((long) id);
            return row;
        }).toList();
        when(plans.findAll(any(Pageable.class))).thenAnswer(call -> page(planRows, call.getArgument(0)));
        when(customers.findAll(any(Pageable.class))).thenAnswer(call -> page(customerRows, call.getArgument(0)));
        when(devices.findAll(any(Pageable.class))).thenAnswer(call -> page(deviceRows, call.getArgument(0)));
        MockMvc mvc = MockMvcBuilders
                .standaloneSetup(new PlanController(plans, customers),
                        new CustomerController(customers, plans, mock(UsageRecordRepository.class),
                                mock(SupportTicketRepository.class), devices),
                        new DeviceController(devices, customers))
                .build();
        String url = "/api/" + collection;
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(size))
                .andExpect(header().string("X-Has-Next", "true"))
                .andExpect(header().string("X-Total-Count", Integer.toString(size + 1)));
        mvc.perform(get(url).param("page", "1")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(size + 1)).andExpect(header().string("X-Has-Next", "false"));
    }

    private static <T> PageImpl<T> page(List<T> rows, Pageable pageable) {
        int start = (int) pageable.getOffset();
        return new PageImpl<>(rows.subList(start, Math.min(rows.size(), start + pageable.getPageSize())), pageable,
                rows.size());
    }
}
