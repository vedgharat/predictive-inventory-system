package com.predictive.inventoryservice.service;

import com.predictive.inventoryservice.dto.InventoryResponse;
import com.predictive.inventoryservice.exception.InventoryNotFoundException;
import com.predictive.inventoryservice.model.InventoryItem;
import com.predictive.inventoryservice.model.SaleRecord;
import com.predictive.inventoryservice.repository.InventoryRepository;
import com.predictive.inventoryservice.repository.SaleRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Core business logic for inventory operations including stock updates,
 * sale recording, and cache management. Serves as the single source of truth
 * for inventory mutations, ensuring cache consistency via {@code @CacheEvict}.
 */
@Service
public class InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);

    private final InventoryRepository inventoryRepository;
    private final SaleRecordRepository saleRecordRepository;
    private final PredictiveService predictiveService;

    public InventoryService(InventoryRepository inventoryRepository,
                            SaleRecordRepository saleRecordRepository,
                            PredictiveService predictiveService) {
        this.inventoryRepository = inventoryRepository;
        this.saleRecordRepository = saleRecordRepository;
        this.predictiveService = predictiveService;
    }

    /**
     * Returns all inventory items, each enriched with a stock status classification.
     */
    public List<InventoryItem> getAllInventory() {
        return inventoryRepository.findAll();
    }

    /**
     * Returns a single inventory item by SKU, or throws if not found.
     */
    public InventoryItem getInventoryBySku(String sku) {
        return inventoryRepository.findBySku(sku)
                .orElseThrow(() -> new InventoryNotFoundException("No inventory found for SKU: " + sku));
    }

    /**
     * Returns the 10 most recent sales, served from Redis cache when available.
     * Cache is evicted whenever a new order is processed.
     */
    @Cacheable("recentSales")
    public List<SaleRecord> getRecentSales() {
        log.info("Cache miss: fetching recent sales from PostgreSQL");
        return saleRecordRepository.findTop10ByOrderByIdDesc();
    }

    /**
     * Processes a stock reduction from a customer order and records the sale.
     * Evicts the recentSales cache to ensure dashboard consistency.
     *
     * @param sku      the product SKU
     * @param quantity the number of units purchased
     * @return the updated InventoryItem
     */
    @Transactional
    @CacheEvict(value = "recentSales", allEntries = true)
    public InventoryItem processOrder(String sku, int quantity) {
        InventoryItem item = inventoryRepository.findBySku(sku)
                .orElseGet(() -> new InventoryItem(sku, 100));

        int newTotal = Math.max(0, item.getQuantity() - quantity);
        item.setQuantity(newTotal);
        inventoryRepository.save(item);

        SaleRecord sale = new SaleRecord(sku, quantity, LocalDateTime.now());
        saleRecordRepository.save(sale);

        log.info("Order processed: {} x{} | Remaining stock: {}", sku, quantity, newTotal);
        return item;
    }

    /**
     * Atomically adds stock to an existing SKU (used by the autonomous restock flow).
     */
    @Transactional
    public InventoryItem addStock(String sku, int amount) {
        inventoryRepository.addStock(sku, amount);
        InventoryItem item = inventoryRepository.findBySku(sku)
                .orElseThrow(() -> new InventoryNotFoundException("Cannot restock unknown SKU: " + sku));
        log.info("Restocked {} with {} units | New total: {}", sku, amount, item.getQuantity());
        return item;
    }

    /**
     * Updates the AI-predicted velocity for a given SKU.
     */
    @Transactional
    public void updateAiVelocity(String sku, double velocity) {
        inventoryRepository.updateAiVelocity(sku, velocity);
    }

    /**
     * Builds an enriched response DTO with depletion estimate and status.
     */
    public InventoryResponse toResponse(InventoryItem item) {
        String status;
        if (item.getQuantity() <= 0) {
            status = "OUT_OF_STOCK";
        } else if (item.getQuantity() < 20) {
            status = "LOW_STOCK";
        } else {
            status = "IN_STOCK";
        }

        String depletion = predictiveService.predictTimeToEmpty(
                item.getQuantity(),
                item.getAiVelocity() != null ? item.getAiVelocity() / 60.0 : 0.0
        );

        return new InventoryResponse(
                item.getId(), item.getSku(), item.getQuantity(),
                item.getAiVelocity(), depletion, status
        );
    }
}
