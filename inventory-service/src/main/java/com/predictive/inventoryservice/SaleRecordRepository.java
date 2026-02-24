package com.predictive.inventoryservice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SaleRecordRepository extends JpaRepository<SaleRecord, Long> {

    // Fetches the last 10 sales, ordered by ID descending to get the newest first
    List<SaleRecord> findTop10ByOrderByIdDesc();
}