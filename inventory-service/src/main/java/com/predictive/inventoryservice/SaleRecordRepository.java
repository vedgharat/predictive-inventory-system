package com.predictive.inventoryservice;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SaleRecordRepository extends JpaRepository<SaleRecord, Long> {
    List<SaleRecord> findBySku(String sku);
}