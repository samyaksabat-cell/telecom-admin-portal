package com.example.telecom.controller;

import com.example.telecom.model.Plan;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.PlanRepository;
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

@RestController
@RequestMapping("/api/plans")
public class PlanController {

    private static final Logger LOG = LoggerFactory.getLogger(PlanController.class);

    private final PlanRepository repository;
    private final CustomerRepository customerRepository;

    public PlanController(PlanRepository repository, CustomerRepository customerRepository) {
        this.repository = repository;
        this.customerRepository = customerRepository;
    }

    @GetMapping
    public ResponseEntity<List<PlanResponse>> getAllPlans(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        LOG.info("Fetching all plans");
        Page<Plan> result = repository
                .findAll(PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 1000)), Sort.by("id")));
        List<PlanResponse> plans = result.stream().map(PlanResponse::from).toList();
        LOG.debug("Found {} plans", plans.size());
        return ResponseEntity.ok().header("X-Has-Next", Boolean.toString(result.hasNext()))
                .header("X-Total-Count", Long.toString(result.getTotalElements())).body(plans);
    }

    @GetMapping("/active")
    public List<PlanResponse> getActivePlans() {
        LOG.info("Fetching active plans");
        List<PlanResponse> plans = repository.findByIsActiveTrue().stream().map(PlanResponse::from).toList();
        LOG.debug("Found {} active plans", plans.size());
        return plans;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlanResponse> getPlan(@PathVariable Long id) {
        LOG.info("Fetching plan with id={}", id);
        return repository.findById(id).map(plan -> {
            LOG.debug("Found plan: id={}", plan.getId());
            return ResponseEntity.ok(PlanResponse.from(plan));
        }).orElseGet(() -> {
            LOG.warn("Plan not found: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @PostMapping
    public PlanResponse createPlan(@RequestBody PlanRequest request) {
        LOG.info("Creating plan");
        Plan plan = new Plan(request.name(), request.monthlyPrice(), request.dataLimitGb(), request.minutesLimit(),
                request.smsLimit());
        Plan saved = repository.save(plan);
        LOG.info("Plan created: id={}", saved.getId());
        return PlanResponse.from(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlanResponse> updatePlan(@PathVariable Long id, @RequestBody PlanRequest request) {
        LOG.info("Updating plan: id={}", id);
        return repository.findById(id).map(plan -> {
            plan.setName(request.name());
            plan.setMonthlyPrice(request.monthlyPrice());
            plan.setDataLimitGb(request.dataLimitGb());
            plan.setMinutesLimit(request.minutesLimit());
            plan.setSmsLimit(request.smsLimit());
            if (request.isActive() != null) {
                plan.setIsActive(request.isActive());
            }
            Plan saved = repository.save(plan);
            LOG.info("Plan updated: id={}", saved.getId());
            return ResponseEntity.ok(PlanResponse.from(saved));
        }).orElseGet(() -> {
            LOG.warn("Plan not found for update: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ProblemDetail> deletePlan(@PathVariable Long id) {
        LOG.info("Deleting plan: id={}", id);
        if (!repository.existsById(id)) {
            LOG.warn("Plan not found for deletion: id={}", id);
            return ResponseEntity.notFound().build();
        }
        if (customerRepository.existsByPlanId(id)) {
            LOG.warn("Plan still has customers, refusing deletion: id={}", id);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                    "Plan still has customers; move them to another plan before deleting it"));
        }
        repository.deleteById(id);
        LOG.info("Plan deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }

    public record PlanRequest(String name, BigDecimal monthlyPrice, Integer dataLimitGb, Integer minutesLimit,
            Integer smsLimit, Boolean isActive) {
    }

    public record PlanResponse(Long id, String name, BigDecimal monthly_price, Integer data_limit_gb,
            Integer minutes_limit, Integer sms_limit, Boolean is_active) {
        public static PlanResponse from(Plan plan) {
            return new PlanResponse(plan.getId(), plan.getName(), plan.getMonthlyPrice(), plan.getDataLimitGb(),
                    plan.getMinutesLimit(), plan.getSmsLimit(), plan.getIsActive());
        }
    }
}
