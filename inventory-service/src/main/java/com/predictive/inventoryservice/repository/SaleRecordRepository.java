package com.predictive.inventoryservice.repository;

import com.predictive.inventoryservice.model.SaleRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Provides access to the sale_record table for historical sales queries.
 * Results are used by the dashboard's Recent Activity sidebar and as
 * training data for the predictive velocity engine.
 */
@Repository
public interface SaleRecordRepository extends JpaRepository<SaleRecord, Long> {

    List<SaleRecord> findTop10ByOrderByIdDesc();

    List<SaleRecord> findBySkuOrderBySaleTimestampAsc(String sku);
}
