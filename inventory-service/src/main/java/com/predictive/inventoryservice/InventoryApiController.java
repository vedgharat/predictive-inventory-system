package com.predictive.inventoryservice;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController // Notice this is @RestController, not just @Controller!
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*") // This allows React (port 5173) to securely ask for data
public class InventoryApiController {

    private final InventoryRepository inventoryRepository;

    public InventoryApiController(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    // When React asks on boot, hand over the entire database table as JSON
    @GetMapping
    public List<InventoryItem> getAllInventory() {
        return inventoryRepository.findAll();
    }
}