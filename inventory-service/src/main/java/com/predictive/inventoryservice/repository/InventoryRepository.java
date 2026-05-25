package com.predictive.inventoryservice.repository;

import com.predictive.inventoryservice.model.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Provides CRUD and custom query access to the inventory_items table.
 * Includes atomic update operations for AI velocity and stock replenishment
 * to prevent race conditions in the concurrent event-driven pipeline.
 */
public interface InventoryRepository extends JpaRepository<InventoryItem, Long> {

    Optional<InventoryItem> findBySku(String sku);

    @Modifying
    @Transactional
    @Query("UPDATE InventoryItem i SET i.aiVelocity = :aiVelocity WHERE i.sku = :sku")
    void updateAiVelocity(@Param("sku") String sku, @Param("aiVelocity") Double aiVelocity);

    @Modifying
    @Transactional
    @Query("UPDATE InventoryItem i SET i.quantity = i.quantity + :amount WHERE i.sku = :sku")
    void addStock(@Param("sku") String sku, @Param("amount") Integer amount);
}
