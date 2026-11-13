package com.example.telecom.repository;

import com.example.telecom.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    List<Device> findByStatus(Device.Status status);

    long countByStatus(Device.Status status);

    boolean existsByCustomerId(Long customerId);

    @Query("SELECT d.status, COUNT(d) FROM Device d GROUP BY d.status")
    List<Object[]> countByStatus();
}
