package com.example.telecom.repository;

import com.example.telecom.model.UsageRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface UsageRecordRepository extends JpaRepository<UsageRecord, Long> {
    Page<UsageRecord> findByCustomerId(Long customerId, Pageable pageable);

    boolean existsByCustomerId(Long customerId);

    Page<UsageRecord> findAllByOrderByRecordedAtDesc(Pageable pageable);

    @Query("SELECT u.type, FUNCTION('date', u.recordedAt), SUM(u.quantity) FROM UsageRecord u WHERE u.recordedAt >= :since GROUP BY u.type, FUNCTION('date', u.recordedAt) ORDER BY FUNCTION('date', u.recordedAt)")
    List<Object[]> sumByTypeAndDate(@Param("since") Instant since);

    @Query("SELECT u FROM UsageRecord u WHERE " + "(:type IS NULL OR u.type = :type) AND "
            + "(:customerId IS NULL OR u.customer.id = :customerId) AND "
            + "(:dateFrom IS NULL OR u.recordedAt >= :dateFrom) AND " + "(:dateTo IS NULL OR u.recordedAt < :dateTo) "
            + "ORDER BY u.recordedAt DESC")
    Page<UsageRecord> findFiltered(@Param("type") UsageRecord.Type type, @Param("customerId") Long customerId,
            @Param("dateFrom") Instant dateFrom, @Param("dateTo") Instant dateTo, Pageable pageable);
}
