package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Device;
import com.example.telecom.model.Plan;
import com.example.telecom.model.SupportTicket;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.DeviceRepository;
import com.example.telecom.repository.PlanRepository;
import com.example.telecom.repository.SupportTicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DashboardControllerTest {

    private final CustomerRepository customerRepository = mock(CustomerRepository.class);
    private final PlanRepository planRepository = mock(PlanRepository.class);
    private final DeviceRepository deviceRepository = mock(DeviceRepository.class);
    private final SupportTicketRepository ticketRepository = mock(SupportTicketRepository.class);

    private MockMvc mockMvc;

    private Customer activeBasicOne;
    private Customer activeBasicTwo;
    private Customer activeStandard;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(
                        new DashboardController(customerRepository, planRepository, deviceRepository, ticketRepository))
                .build();

        Plan basic = plan(1L, "Basic", "20.00");
        Plan standard = plan(2L, "Standard", "40.00");
        Plan premium = plan(3L, "Premium", "60.00");

        activeBasicOne = customer(1L, basic, Customer.Status.ACTIVE);
        activeBasicTwo = customer(2L, basic, Customer.Status.ACTIVE);
        activeStandard = customer(3L, standard, Customer.Status.ACTIVE);
        Customer suspendedPremium = customer(4L, premium, Customer.Status.SUSPENDED);

        when(customerRepository.countByStatus(Customer.Status.ACTIVE)).thenReturn(3L);
        when(customerRepository.findByStatus(Customer.Status.ACTIVE))
                .thenReturn(List.of(activeBasicOne, activeBasicTwo, activeStandard));
        // Also stubbed on purpose: a regression that aggregates over every customer
        // instead of the ACTIVE ones then returns a wrong number rather than an error.
        when(customerRepository.findAll())
                .thenReturn(List.of(activeBasicOne, activeBasicTwo, activeStandard, suspendedPremium));
        when(planRepository.findAll()).thenReturn(List.of(basic, standard, premium));
        when(ticketRepository.countByStatusIn(any())).thenReturn(5L);
        when(deviceRepository.countByStatus(Device.Status.ASSIGNED)).thenReturn(7L);
    }

    @Test
    void statsReturnsActiveCustomerCountAndMonthlyRevenue() throws Exception {
        mockMvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.active_customers").value(3))
                .andExpect(jsonPath("$.monthly_revenue").value(80.00)).andExpect(jsonPath("$.open_tickets").value(5))
                .andExpect(jsonPath("$.devices_in_use").value(7));
    }

    @Test
    void statsRevenueExcludesNonActiveCustomers() throws Exception {
        // The suspended customer sits on the 60.00 Premium plan. Billing counts ACTIVE
        // subscribers only, so revenue must stay 80.00 and never reach 140.00.
        mockMvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.monthly_revenue").value(80.00));
    }

    @Test
    void statsIgnoresActiveCustomersWithoutAPlan() throws Exception {
        Customer planless = customer(5L, null, Customer.Status.ACTIVE);
        when(customerRepository.findByStatus(Customer.Status.ACTIVE))
                .thenReturn(List.of(activeBasicOne, activeBasicTwo, activeStandard, planless));
        when(customerRepository.findAll())
                .thenReturn(List.of(activeBasicOne, activeBasicTwo, activeStandard, planless));

        mockMvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.monthly_revenue").value(80.00));
    }

    @Test
    void revenueByPlanOnlyIncludesPlansWithActiveCustomers() throws Exception {
        mockMvc.perform(get("/api/dashboard/revenue-by-plan")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].name").value("Basic"))
                .andExpect(jsonPath("$[1].name").value("Standard"));
    }

    @Test
    void revenueByPlanMultipliesPlanPriceByActiveCustomerCount() throws Exception {
        mockMvc.perform(get("/api/dashboard/revenue-by-plan")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].revenue").value(40.00)).andExpect(jsonPath("$[1].revenue").value(40.00));
    }

    @Test
    void revenueUsesPlanIdentityWhenNamesAreDuplicated() throws Exception {
        Plan first = plan(10L, "Same", "10.00");
        Plan second = plan(11L, "Same", "20.00");
        when(planRepository.findAll()).thenReturn(List.of(first, second));
        when(customerRepository.findByStatus(Customer.Status.ACTIVE)).thenReturn(
                List.of(customer(10L, first, Customer.Status.ACTIVE), customer(11L, second, Customer.Status.ACTIVE)));

        mockMvc.perform(get("/api/dashboard/revenue-by-plan")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].revenue").value(10)).andExpect(jsonPath("$[1].revenue").value(20));
    }

    @Test
    void customersByPlanReturnsOneEntryPerPlan() throws Exception {
        when(customerRepository.countByPlanName())
                .thenReturn(List.of(new Object[] {"Basic", 2L}, new Object[] {"Standard", 1L}));

        mockMvc.perform(get("/api/dashboard/customers-by-plan")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].name").value("Basic"))
                .andExpect(jsonPath("$[0].value").value(2));
    }

    @Test
    void devicesByStatusReturnsStatusNames() throws Exception {
        when(deviceRepository.countByStatus()).thenReturn(
                List.of(new Object[] {Device.Status.ASSIGNED, 7L}, new Object[] {Device.Status.AVAILABLE, 3L}));

        mockMvc.perform(get("/api/dashboard/devices-by-status")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].name").value("ASSIGNED"))
                .andExpect(jsonPath("$[1].value").value(3));
    }

    @Test
    void ticketsByStatusReturnsStatusNames() throws Exception {
        when(ticketRepository.countByStatus()).thenReturn(
                List.of(new Object[] {SupportTicket.Status.OPEN, 4L}, new Object[] {SupportTicket.Status.CLOSED, 9L}));

        mockMvc.perform(get("/api/dashboard/tickets-by-status")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].name").value("OPEN"))
                .andExpect(jsonPath("$[1].value").value(9));
    }

    private static Plan plan(Long id, String name, String price) {
        Plan plan = new Plan(name, new BigDecimal(price), 10, 500, 500);
        plan.setId(id);
        return plan;
    }

    private static Customer customer(Long id, Plan plan, Customer.Status status) {
        Customer customer = new Customer("First" + id, "Last" + id, "customer" + id + "@example.com", "555-000" + id,
                plan);
        customer.setId(id);
        customer.setStatus(status);
        return customer;
    }
}
