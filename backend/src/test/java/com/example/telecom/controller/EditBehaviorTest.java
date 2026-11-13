package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Device;
import com.example.telecom.model.SupportTicket;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.DeviceRepository;
import com.example.telecom.repository.SupportTicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class EditBehaviorTest {
    private static final Instant ORIGINAL_TIME = Instant.parse("2025-01-01T12:00:00Z");
    private final DeviceRepository devices = mock(DeviceRepository.class);
    private final CustomerRepository customers = mock(CustomerRepository.class);
    private final SupportTicketRepository tickets = mock(SupportTicketRepository.class);
    private final Customer customer = customer(1L);
    private Device device;
    private SupportTicket ticket;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        device = new Device("imei", "model", "sim");
        device.setId(1L);
        device.setCustomer(customer);
        device.setStatus(Device.Status.ASSIGNED);
        device.setAssignedAt(ORIGINAL_TIME);
        ticket = new SupportTicket(customer, "Subject", "Description", SupportTicket.Priority.LOW);
        ticket.setId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(devices.findById(1L)).thenReturn(Optional.of(device));
        when(tickets.findById(1L)).thenReturn(Optional.of(ticket));
        when(devices.save(any(Device.class))).thenAnswer(i -> i.getArgument(0));
        when(tickets.save(any(SupportTicket.class))).thenAnswer(i -> i.getArgument(0));
        mvc = MockMvcBuilders.standaloneSetup(new DeviceController(devices, customers),
                new SupportTicketController(tickets, customers)).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"LOST", "DAMAGED", "ASSIGNED"})
    void deviceEditHonorsStatusAndPreservesAssignmentTime(String status) throws Exception {
        updateDevice(status, 1L);
        assertEquals(Device.Status.valueOf(status), device.getStatus());
        assertEquals(ORIGINAL_TIME, device.getAssignedAt());
        assertSame(customer, device.getCustomer());
        updateDevice(status, 1L);
        assertEquals(ORIGINAL_TIME, device.getAssignedAt());
    }

    @Test
    void availableClearsAssignmentEvenWithCustomerId() throws Exception {
        updateDevice("AVAILABLE", 1L);
        assertNull(device.getCustomer());
        assertNull(device.getAssignedAt());
        assertEquals(Device.Status.AVAILABLE, device.getStatus());
    }

    @Test
    void reassignmentSetsTimeOnceAndDefaultsToAssigned() throws Exception {
        Customer other = customer(2L);
        when(customers.findById(2L)).thenReturn(Optional.of(other));
        updateDevice(null, 2L);
        assertSame(other, device.getCustomer());
        assertNotEquals(ORIGINAL_TIME, device.getAssignedAt());
        Instant reassignedAt = device.getAssignedAt();
        updateDevice(null, 2L);
        assertEquals(reassignedAt, device.getAssignedAt());
        assertEquals(Device.Status.ASSIGNED, device.getStatus());
    }

    @Test
    void omittedStatusPreservesLostStateForSameCustomer() throws Exception {
        device.setStatus(Device.Status.LOST);
        updateDevice(null, 1L);
        assertEquals(Device.Status.LOST, device.getStatus());
        assertEquals(ORIGINAL_TIME, device.getAssignedAt());
    }

    @Test
    void creationHonorsExplicitStatus() throws Exception {
        mvc.perform(post("/api/devices").contentType(MediaType.APPLICATION_JSON).content(deviceBody("DAMAGED", 1L)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DAMAGED"))
                .andExpect(jsonPath("$.customer_id").value(1));
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT"})
    void unknownCustomerIsRejectedBeforeSaving(String method) throws Exception {
        mvc.perform((method.equals("POST") ? post("/api/devices") : put("/api/devices/1"))
                .contentType(MediaType.APPLICATION_JSON).content(deviceBody("LOST", 99L)))
                .andExpect(status().isBadRequest());
        verify(devices, never()).save(any(Device.class));
        assertEquals(Device.Status.ASSIGNED, device.getStatus());
        assertEquals(ORIGINAL_TIME, device.getAssignedAt());
    }

    @Test
    void resolvedTicketEditsAndClosingPreserveResolutionTime() throws Exception {
        ticket.setStatus(SupportTicket.Status.RESOLVED);
        ticket.setResolvedAt(ORIGINAL_TIME);
        updateTicket("RESOLVED");
        assertEquals(ORIGINAL_TIME, ticket.getResolvedAt());
        updateTicket("CLOSED");
        assertEquals(ORIGINAL_TIME, ticket.getResolvedAt());
    }

    @Test
    void reopeningClearsResolutionAndResolvingAgainSetsNewTime() throws Exception {
        ticket.setStatus(SupportTicket.Status.CLOSED);
        ticket.setResolvedAt(ORIGINAL_TIME);
        updateTicket("OPEN");
        assertNull(ticket.getResolvedAt());
        updateTicket("RESOLVED");
        assertNotNull(ticket.getResolvedAt());
        assertNotEquals(ORIGINAL_TIME, ticket.getResolvedAt());
        Instant resolvedAt = ticket.getResolvedAt();
        updateTicket("RESOLVED");
        assertEquals(resolvedAt, ticket.getResolvedAt());
    }

    @Test
    void closingOpenTicketSetsResolutionTime() throws Exception {
        updateTicket("CLOSED");
        assertNotNull(ticket.getResolvedAt());
    }

    private void updateDevice(String status, Long customerId) throws Exception {
        mvc.perform(
                put("/api/devices/1").contentType(MediaType.APPLICATION_JSON).content(deviceBody(status, customerId)))
                .andExpect(status().isOk());
    }

    private static String deviceBody(String status, Long customerId) {
        return """
                {"imei":"imei","model":"model","simNumber":"sim","customerId":%d,"status":%s}
                """.formatted(customerId, status == null ? "null" : "\"" + status + "\"");
    }

    private void updateTicket(String status) throws Exception {
        mvc.perform(put("/api/tickets/1").contentType(MediaType.APPLICATION_JSON).content("""
                {"subject":"Edited","description":"Edited","status":"%s"}
                """.formatted(status))).andExpect(status().isOk());
    }

    private static Customer customer(Long id) {
        Customer customer = new Customer("First", "Last", "test@example.com", "555", null);
        customer.setId(id);
        return customer;
    }
}
