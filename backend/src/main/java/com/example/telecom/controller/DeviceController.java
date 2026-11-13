package com.example.telecom.controller;

import com.example.telecom.model.Customer;
import com.example.telecom.model.Device;
import com.example.telecom.repository.CustomerRepository;
import com.example.telecom.repository.DeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private static final Logger LOG = LoggerFactory.getLogger(DeviceController.class);

    private final DeviceRepository repository;
    private final CustomerRepository customerRepository;

    public DeviceController(DeviceRepository repository, CustomerRepository customerRepository) {
        this.repository = repository;
        this.customerRepository = customerRepository;
    }

    @GetMapping
    public ResponseEntity<List<DeviceResponse>> getAllDevices(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        LOG.info("Fetching all devices");
        Page<Device> result = repository
                .findAll(PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 1000)), Sort.by("id")));
        List<DeviceResponse> devices = result.stream().map(DeviceResponse::from).toList();
        LOG.debug("Found {} devices", devices.size());
        return ResponseEntity.ok().header("X-Has-Next", Boolean.toString(result.hasNext()))
                .header("X-Total-Count", Long.toString(result.getTotalElements())).body(devices);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeviceResponse> getDevice(@PathVariable Long id) {
        LOG.info("Fetching device with id={}", id);
        return repository.findById(id).map(device -> {
            LOG.debug("Found device: id={}", device.getId());
            return ResponseEntity.ok(DeviceResponse.from(device));
        }).orElseGet(() -> {
            LOG.warn("Device not found: id={}", id);
            return ResponseEntity.notFound().build();
        });
    }

    @PostMapping
    public ResponseEntity<DeviceResponse> createDevice(@RequestBody DeviceRequest request) {
        LOG.info("Creating device");
        Customer customer = null;
        if (request.customerId() != null) {
            Optional<Customer> existing = customerRepository.findById(request.customerId());
            if (existing.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            customer = existing.get();
        }
        Device device = new Device(request.imei(), request.model(), request.simNumber());
        applyAssignment(device, customer, request.status());
        Device saved = repository.save(device);
        LOG.info("Device created: id={}", saved.getId());
        return ResponseEntity.ok(DeviceResponse.from(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeviceResponse> updateDevice(@PathVariable Long id, @RequestBody DeviceRequest request) {
        LOG.info("Updating device: id={}", id);
        Optional<Device> existing = repository.findById(id);
        if (existing.isEmpty()) {
            LOG.warn("Device not found for update: id={}", id);
            return ResponseEntity.notFound().build();
        }
        Device device = existing.get();
        // PUT replaces the assignment, including an explicitly cleared customer.
        Customer customer = null;
        if (request.customerId() != null) {
            Optional<Customer> requested = customerRepository.findById(request.customerId());
            if (requested.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            customer = requested.get();
        }
        applyAssignment(device, customer, request.status());
        device.setImei(request.imei());
        device.setModel(request.model());
        device.setSimNumber(request.simNumber());
        Device saved = repository.save(device);
        LOG.info("Device updated: id={}", saved.getId());
        return ResponseEntity.ok(DeviceResponse.from(saved));
    }

    private static void applyAssignment(Device device, Customer customer, String status) {
        Long oldCustomerId = device.getCustomer() == null ? null : device.getCustomer().getId();
        Long newCustomerId = customer == null ? null : customer.getId();
        boolean changed = !Objects.equals(oldCustomerId, newCustomerId);
        Device.Status newStatus = assignmentStatus(device, customer, status, changed);
        device.setStatus(newStatus);
        if (newStatus == Device.Status.AVAILABLE) {
            device.setCustomer(null);
            device.setAssignedAt(null);
        } else {
            device.setCustomer(customer);
            if (changed) {
                device.setAssignedAt(customer == null ? null : Instant.now().truncatedTo(ChronoUnit.MILLIS));
            }
        }
    }

    private static Device.Status assignmentStatus(Device device, Customer customer, String status, boolean changed) {
        Device.Status result = status == null ? device.getStatus() : Device.Status.valueOf(status);
        if (status == null && changed && customer != null) {
            result = Device.Status.ASSIGNED;
        }
        if (result == Device.Status.ASSIGNED && customer == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An assigned device requires a customer");
        }
        return result;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        LOG.info("Deleting device: id={}", id);
        if (!repository.existsById(id)) {
            LOG.warn("Device not found for deletion: id={}", id);
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        LOG.info("Device deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }

    public record DeviceRequest(String imei, String model, String simNumber, Long customerId, String status) {
    }

    public record DeviceResponse(Long id, String imei, String model, String sim_number, Long customer_id,
            String customer_name, String status, String assigned_at, String created_at) {
        public static DeviceResponse from(Device device) {
            return new DeviceResponse(device.getId(), device.getImei(), device.getModel(), device.getSimNumber(),
                    device.getCustomer() != null ? device.getCustomer().getId() : null,
                    device.getCustomer() != null
                            ? device.getCustomer().getFirstName() + " " + device.getCustomer().getLastName()
                            : null,
                    device.getStatus().name(),
                    device.getAssignedAt() != null ? device.getAssignedAt().toString() : null,
                    device.getCreatedAt() != null ? device.getCreatedAt().toString() : null);
        }
    }
}
