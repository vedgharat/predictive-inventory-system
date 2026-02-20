package com.predictive.inventoryservice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface InventoryRepository extends JpaRepository<InventoryItem, Long> {
    Optional<InventoryItem> findBySku(String sku);

    // This forces Hibernate to ONLY touch the aiVelocity column!
    @Modifying
    @Transactional
    @Query("UPDATE InventoryItem i SET i.aiVelocity = :aiVelocity WHERE i.sku = :sku")
    void updateAiVelocity(@Param("sku") String sku, @Param("aiVelocity") Double aiVelocity);
}