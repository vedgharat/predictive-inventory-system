package com.predictive.inventoryservice.controller;

import com.predictive.inventoryservice.dto.InventoryResponse;
import com.predictive.inventoryservice.model.InventoryItem;
import com.predictive.inventoryservice.model.SaleRecord;
import com.predictive.inventoryservice.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST API for inventory queries. Serves the React dashboard with current stock
 * levels and recent sales history. High-frequency reads are cached in Redis.
 */
@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class InventoryApiController {

    private final InventoryService inventoryService;

    public InventoryApiController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public ResponseEntity<List<InventoryItem>> getAllInventory() {
        return ResponseEntity.ok(inventoryService.getAllInventory());
    }

    @GetMapping("/{sku}")
    public ResponseEntity<InventoryResponse> getInventoryBySku(@PathVariable String sku) {
        InventoryItem item = inventoryService.getInventoryBySku(sku);
        return ResponseEntity.ok(inventoryService.toResponse(item));
    }

    @GetMapping("/sales")
    public ResponseEntity<List<SaleRecord>> getRecentSales() {
        return ResponseEntity.ok(inventoryService.getRecentSales());
    }
}
