package com.predictive.inventoryservice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface InventoryRepository extends JpaRepository<InventoryItem, Long> {
    Optional<InventoryItem> findBySku(String sku);

    @Modifying
    @Transactional
    @Query("UPDATE InventoryItem i SET i.aiVelocity = :aiVelocity WHERE i.sku = :sku")
    void updateAiVelocity(@Param("sku") String sku, @Param("aiVelocity") Double aiVelocity);

    // THE NEW FIX: Surgically add stock without overwriting velocity!
    @Modifying
    @Transactional
    @Query("UPDATE InventoryItem i SET i.quantity = i.quantity + :amount WHERE i.sku = :sku")
    void addStock(@Param("sku") String sku, @Param("amount") Integer amount);
}