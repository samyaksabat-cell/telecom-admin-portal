package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Device;
import com.example.telecom.model.SupportTicket;
import com.example.telecom.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private static final Logger LOG = LoggerFactory.getLogger(DashboardController.class);

    private final CustomerRepository customerRepository;
    private final PlanRepository planRepository;
    private final DeviceRepository deviceRepository;
    private final SupportTicketRepository ticketRepository;

    public DashboardController(CustomerRepository customerRepository, PlanRepository planRepository,
            DeviceRepository deviceRepository, SupportTicketRepository ticketRepository) {
        this.customerRepository = customerRepository;
        this.planRepository = planRepository;
        this.deviceRepository = deviceRepository;
        this.ticketRepository = ticketRepository;
    }

    @GetMapping("/stats")
    public DashboardStats getStats() {
        LOG.info("Fetching dashboard stats");
        long activeCustomers = customerRepository.countByStatus(Customer.Status.ACTIVE);

        BigDecimal monthlyRevenue = customerRepository.findByStatus(Customer.Status.ACTIVE).stream()
                .filter(c -> c.getPlan() != null).map(c -> c.getPlan().getMonthlyPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long openTickets = ticketRepository
                .countByStatusIn(List.of(SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS));

        long devicesInUse = deviceRepository.countByStatus(Device.Status.ASSIGNED);

        LOG.debug("Dashboard stats: activeCustomers={}, monthlyRevenue={}, openTickets={}, devicesInUse={}",
                activeCustomers, monthlyRevenue, openTickets, devicesInUse);
        return new DashboardStats(activeCustomers, monthlyRevenue, openTickets, devicesInUse);
    }

    @GetMapping("/customers-by-plan")
    public List<ChartData> getCustomersByPlan() {
        LOG.info("Fetching customers by plan chart data");
        List<ChartData> data = customerRepository.countByPlanName().stream()
                .map(row -> new ChartData((String) row[0], ((Number) row[1]).longValue())).toList();
        LOG.debug("Found {} plan categories", data.size());
        return data;
    }

    @GetMapping("/devices-by-status")
    public List<ChartData> getDevicesByStatus() {
        LOG.info("Fetching devices by status chart data");
        List<ChartData> data = deviceRepository.countByStatus().stream()
                .map(row -> new ChartData(((Device.Status) row[0]).name(), ((Number) row[1]).longValue())).toList();
        LOG.debug("Found {} device status categories", data.size());
        return data;
    }

    @GetMapping("/tickets-by-status")
    public List<ChartData> getTicketsByStatus() {
        LOG.info("Fetching tickets by status chart data");
        List<ChartData> data = ticketRepository.countByStatus().stream()
                .map(row -> new ChartData(((SupportTicket.Status) row[0]).name(), ((Number) row[1]).longValue()))
                .toList();
        LOG.debug("Found {} ticket status categories", data.size());
        return data;
    }

    @GetMapping("/revenue-by-plan")
    public List<RevenueData> getRevenueByPlan() {
        LOG.info("Fetching revenue by plan chart data");
        Map<Long, Long> customerCounts = customerRepository.findByStatus(Customer.Status.ACTIVE).stream()
                .filter(c -> c.getPlan() != null)
                .collect(Collectors.groupingBy(c -> c.getPlan().getId(), Collectors.counting()));

        List<RevenueData> data = planRepository.findAll().stream()
                .filter(plan -> customerCounts.containsKey(plan.getId()))
                .map(plan -> new RevenueData(plan.getName(),
                        plan.getMonthlyPrice().multiply(BigDecimal.valueOf(customerCounts.get(plan.getId())))))
                .toList();
        LOG.debug("Found {} plans with revenue data", data.size());
        return data;
    }

    public record DashboardStats(long active_customers, BigDecimal monthly_revenue, long open_tickets,
            long devices_in_use) {
    }

    public record ChartData(String name, long value) {
    }

    public record RevenueData(String name, BigDecimal revenue) {
    }
}
