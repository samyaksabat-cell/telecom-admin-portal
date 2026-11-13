package com.example.telecom;

import com.example.telecom.controller.UsageRecordController;
import com.example.telecom.controller.DeviceController;
import com.example.telecom.controller.SupportTicketController;
import com.example.telecom.model.*;
import com.example.telecom.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"spring.jpa.hibernate.ddl-auto=none", "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:seed-schema.sql"})
@Transactional
class TimestampPersistenceTest {
    @Autowired
    private PlanRepository plans;
    @Autowired
    private CustomerRepository customers;
    @Autowired
    private UsageRecordRepository usage;
    @Autowired
    private SupportTicketRepository tickets;
    @Autowired
    private DeviceRepository devices;
    @Autowired
    private UsageRecordController usageController;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private DeviceController deviceController;
    @Autowired
    private SupportTicketController ticketController;
    private Customer customer;

    @BeforeEach
    void setUp() {
        Plan plan = plans.saveAndFlush(new Plan("Test", BigDecimal.TEN, 10, 10, 10));
        customer = customers.saveAndFlush(new Customer("First", "Last", "test@example.com", "555", plan));
    }

    @Test
    void dateFiltersIncludeSeededTextAndExcludeNextMidnight() {
        insertSeededUsage("2025-01-02 00:00:00.000");
        insertSeededUsage("2025-01-02 23:59:59.999");
        insertSeededUsage("2025-01-03 00:00:00.000");
        usage.saveAndFlush(new UsageRecord(customer, UsageRecord.Type.DATA, BigDecimal.ONE, BigDecimal.ZERO,
                Instant.parse("2025-01-02T12:00:00Z")));

        var result = usageController.getUsageRecords(0, 100, null, null, "2025-01-02", "2025-01-02");
        assertEquals(3, result.totalElements());
        assertEquals("2025-01-02T23:59:59.999Z", result.content().get(0).recorded_at());
        assertEquals("2025-01-02T12:00:00Z", result.content().get(1).recorded_at());
        assertEquals("2025-01-02T00:00:00Z", result.content().get(2).recorded_at());
        assertEquals(3, usageController.getUsageRecords(0, 100, null, null, null, "2025-01-02").totalElements());
        assertEquals(1, usageController.getUsageRecords(0, 100, null, null, "2025-01-03", null).totalElements());
        assertFalse(usage.sumByTypeAndDate(Instant.parse("2025-01-02T00:00:00Z")).isEmpty());
    }

    @Test
    void newTicketsSortAheadOfSeededTicketsAndAllInstantsUseText() {
        jdbc.update("""
                INSERT INTO support_tickets(customer_id, subject, description, priority, status, created_at)
                VALUES (?, 'Seeded', 'Description', 'LOW', 'OPEN', '2025-01-01 00:00:00.000')
                """, customer.getId());
        SupportTicket ticket = tickets
                .saveAndFlush(new SupportTicket(customer, "New", "Description", SupportTicket.Priority.LOW));
        Device device = new Device("imei", "model", "sim");
        device.setCustomer(customer);
        device.setStatus(Device.Status.ASSIGNED);
        device.setAssignedAt(Instant.parse("2025-01-02T12:00:00Z"));
        devices.saveAndFlush(device);

        assertEquals(ticket.getId(),
                tickets.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 10)).getContent().get(0).getId());
        assertEquals("text", jdbc.queryForObject("SELECT typeof(created_at) FROM support_tickets WHERE id = ?",
                String.class, ticket.getId()));
        assertEquals("text", jdbc.queryForObject("SELECT typeof(created_at) FROM customers WHERE id = ?", String.class,
                customer.getId()));
        assertEquals("2025-01-02 12:00:00.000",
                jdbc.queryForObject("SELECT assigned_at FROM devices WHERE id = ?", String.class, device.getId()));
    }

    @Test
    void foreignKeysPreventOrphansEvenOutsideControllers() {
        assertEquals(1, jdbc.queryForObject("PRAGMA foreign_keys", Integer.class));
        assertThrows(DataAccessException.class,
                () -> jdbc.update("DELETE FROM plans WHERE id = ?", customer.getPlan().getId()));
        insertSeededUsage("2025-01-02 00:00:00.000");
        assertThrows(DataAccessException.class,
                () -> jdbc.update("DELETE FROM customers WHERE id = ?", customer.getId()));
        assertEquals(1L, customers.count());
        assertEquals(1L, usage.count());
    }

    @Test
    void generatedTimestampsStayIdenticalAcrossReloadsAndEdits() {
        var request = new DeviceController.DeviceRequest("test-imei", "Test", "test-sim", customer.getId(), null);
        var created = deviceController.createDevice(request).getBody();
        assertNotNull(created);
        entityManager.flush();
        entityManager.clear();
        assertEquals(created, deviceController.getDevice(created.id()).getBody());
        var lost = new DeviceController.DeviceRequest("test-imei", "Test", "test-sim", customer.getId(), "LOST");
        assertEquals(created.assigned_at(), deviceController.updateDevice(created.id(), lost).getBody().assigned_at());

        var ticketRequest = new SupportTicketController.TicketRequest(customer.getId(), "Test", "Test", "LOW", null);
        var createdTicket = ticketController.createTicket(ticketRequest).getBody();
        assertNotNull(createdTicket);
        entityManager.flush();
        entityManager.clear();
        assertEquals(createdTicket, ticketController.getTicket(createdTicket.id()).getBody());
        var resolved = new SupportTicketController.TicketRequest(customer.getId(), "Edited", "Test", "LOW", "RESOLVED");
        var resolvedAt = ticketController.updateTicket(createdTicket.id(), resolved).getBody().resolved_at();
        entityManager.flush();
        entityManager.clear();
        assertEquals(resolvedAt, ticketController.updateTicket(createdTicket.id(), resolved).getBody().resolved_at());
        assertEquals(customer.getCreatedAt(), customers.findById(customer.getId()).orElseThrow().getCreatedAt());
        assertEquals(customer.getActivatedAt(), customers.findById(customer.getId()).orElseThrow().getActivatedAt());
    }

    private void insertSeededUsage(String timestamp) {
        jdbc.update("""
                INSERT INTO usage_records(customer_id, type, quantity, cost, recorded_at)
                VALUES (?, 'DATA', 1, 0, ?)
                """, customer.getId(), timestamp);
    }
}
