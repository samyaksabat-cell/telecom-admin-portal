package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Plan;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.DeviceRepository;
import com.example.telecom.repository.PlanRepository;
import com.example.telecom.repository.SupportTicketRepository;
import com.example.telecom.repository.UsageRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private static final Logger LOG = LoggerFactory.getLogger(CustomerController.class);

    private final CustomerRepository repository;
    private final PlanRepository planRepository;
    private final UsageRecordRepository usageRecordRepository;
    private final SupportTicketRepository ticketRepository;
    private final DeviceRepository deviceRepository;

    public CustomerController(CustomerRepository repository, PlanRepository planRepository,
            UsageRecordRepository usageRecordRepository, SupportTicketRepository ticketRepository,
            DeviceRepository deviceRepository) {
        this.repository = repository;
        this.planRepository = planRepository;
        this.usageRecordRepository = usageRecordRepository;
        this.ticketRepository = ticketRepository;
        this.deviceRepository = deviceRepository;
    }

    @GetMapping
    public ResponseEntity<List<CustomerResponse>> getAllCustomers(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        LOG.info("Fetching all customers");
        Page<Customer> result = repository
                .findAll(PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 1000)), Sort.by("id")));
        List<CustomerResponse> customers = result.stream().map(CustomerResponse::from).toList();
        LOG.debug("Found {} customers", customers.size());
        return ResponseEntity.ok().header("X-Has-Next", Boolean.toString(result.hasNext()))
                .header("X-Total-Count", Long.toString(result.getTotalElements())).body(customers);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponse> getCustomer(@PathVariable Long id) {
        LOG.info("Fetching customer with id={}", id);
        return repository.findById(id).map(customer -> {
            LOG.debug("Found customer: id={}", customer.getId());
            return ResponseEntity.ok(CustomerResponse.from(customer));
        }).orElseGet(() -> {
            LOG.warn("Customer not found: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @PostMapping
    public ResponseEntity<CustomerResponse> createCustomer(@RequestBody CustomerRequest request) {
        LOG.info("Creating customer");
        if (request.planId() == null) {
            return ResponseEntity.badRequest().build();
        }
        Plan plan = planRepository.findById(request.planId()).orElse(null);
        if (plan == null) {
            LOG.warn("Plan not found for customer creation: planId={}", request.planId());
            return ResponseEntity.badRequest().build();
        }
        Customer customer = new Customer(request.firstName(), request.lastName(), request.email(), request.phone(),
                plan);
        if (request.balance() != null) {
            customer.setBalance(request.balance());
        }
        Customer saved = repository.save(customer);
        LOG.info("Customer created: id={}", saved.getId());
        return ResponseEntity.ok(CustomerResponse.from(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerResponse> updateCustomer(@PathVariable Long id,
            @RequestBody CustomerRequest request) {
        LOG.info("Updating customer: id={}", id);
        Optional<Customer> existing = repository.findById(id);
        if (existing.isEmpty()) {
            LOG.warn("Customer not found for update: id={}", id);
            return ResponseEntity.notFound().build();
        }
        Optional<Plan> plan = Optional.empty();
        if (request.planId() != null) {
            plan = planRepository.findById(request.planId());
            if (plan.isEmpty()) {
                LOG.warn("Plan not found for customer update: planId={}", request.planId());
                return ResponseEntity.badRequest().build();
            }
        }
        Customer customer = existing.get();
        customer.setFirstName(request.firstName());
        customer.setLastName(request.lastName());
        customer.setEmail(request.email());
        customer.setPhone(request.phone());
        plan.ifPresent(customer::setPlan);
        if (request.status() != null) {
            customer.setStatus(Customer.Status.valueOf(request.status()));
        }
        if (request.balance() != null) {
            customer.setBalance(request.balance());
        }
        Customer saved = repository.save(customer);
        LOG.info("Customer updated: id={}", saved.getId());
        return ResponseEntity.ok(CustomerResponse.from(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ProblemDetail> deleteCustomer(@PathVariable Long id) {
        LOG.info("Deleting customer: id={}", id);
        if (!repository.existsById(id)) {
            LOG.warn("Customer not found for deletion: id={}", id);
            return ResponseEntity.notFound().build();
        }
        if (hasHistory(id)) {
            LOG.warn("Customer has history, refusing deletion: id={}", id);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                    "Customer has usage records, support tickets, or devices and cannot be deleted"));
        }
        repository.deleteById(id);
        LOG.info("Customer deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }

    private boolean hasHistory(Long customerId) {
        return usageRecordRepository.existsByCustomerId(customerId) || ticketRepository.existsByCustomerId(customerId)
                || deviceRepository.existsByCustomerId(customerId);
    }

    public record CustomerRequest(String firstName, String lastName, String email, String phone, Long planId,
            String status, BigDecimal balance) {
    }

    public record CustomerResponse(Long id, String first_name, String last_name, String email, String phone,
            Long plan_id, String plan_name, String status, BigDecimal balance, String activated_at, String created_at) {
        public static CustomerResponse from(Customer customer) {
            return new CustomerResponse(customer.getId(), customer.getFirstName(), customer.getLastName(),
                    customer.getEmail(), customer.getPhone(),
                    customer.getPlan() != null ? customer.getPlan().getId() : null,
                    customer.getPlan() != null ? customer.getPlan().getName() : null, customer.getStatus().name(),
                    customer.getBalance(),
                    customer.getActivatedAt() != null ? customer.getActivatedAt().toString() : null,
                    customer.getCreatedAt() != null ? customer.getCreatedAt().toString() : null);
        }
    }
}
