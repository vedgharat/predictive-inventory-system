package com.predictive.inventoryservice;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.cache.annotation.Cacheable; // Add this import
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*") // Allows React to fetch data safely
public class InventoryApiController {

    private final InventoryRepository inventoryRepository;
    private final SaleRecordRepository saleRecordRepository; // ⬅️ Injecting the history repo

    public InventoryApiController(InventoryRepository inventoryRepository,
                                  SaleRecordRepository saleRecordRepository) {
        this.inventoryRepository = inventoryRepository;
        this.saleRecordRepository = saleRecordRepository;
    }

    // Endpoint 1: Hydrate the main dashboard cards
    @GetMapping
    public List<InventoryItem> getAllInventory() {
        return inventoryRepository.findAll();
    }

    // Endpoint 2: Hydrate the Recent Activity sidebar
    @GetMapping("/sales")
    @Cacheable("recentSales") // ⬅️ THE MAGIC LINE
    public List<SaleRecord> getRecentSales() {
        System.out.println("⚠️ CACHE MISS: Fetching from heavy PostgreSQL Database...");
        return saleRecordRepository.findTop10ByOrderByIdDesc();
    }
}