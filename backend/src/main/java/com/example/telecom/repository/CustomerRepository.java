package com.example.telecom.repository;

import com.example.telecom.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByStatus(Customer.Status status);

    long countByStatus(Customer.Status status);

    boolean existsByPlanId(Long planId);

    @Query("SELECT c.plan.name, COUNT(c) FROM Customer c WHERE c.status = 'ACTIVE' GROUP BY c.plan.name")
    List<Object[]> countByPlanName();

    @Query("SELECT FUNCTION('strftime', '%Y-%m', c.createdAt), COUNT(c) FROM Customer c GROUP BY FUNCTION('strftime', '%Y-%m', c.createdAt) ORDER BY FUNCTION('strftime', '%Y-%m', c.createdAt) DESC")
    List<Object[]> countByMonth();
}
