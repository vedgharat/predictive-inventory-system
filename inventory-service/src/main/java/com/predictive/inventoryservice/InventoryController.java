package com.predictive.inventoryservice;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/dashboard")
public class InventoryController {

    private final InventoryRepository inventoryRepository;
    private final SaleRecordRepository saleRecordRepository;
    private final PredictiveService predictiveService;

    // Inject the basic inventory, the new history memory, and the predictive brain
    public InventoryController(InventoryRepository inventoryRepository,
                               SaleRecordRepository saleRecordRepository,
                               PredictiveService predictiveService) {
        this.inventoryRepository = inventoryRepository;
        this.saleRecordRepository = saleRecordRepository;
        this.predictiveService = predictiveService;
    }

    @GetMapping
    public String getDashboard(Model model) {
        // 1. Fetch all current inventory items (the shelves)
        model.addAttribute("items", inventoryRepository.findAll());

        // 2. Pass the history and the predictive brain directly to the HTML template
        // This allows Thymeleaf to calculate the live forecast for every single row!
        model.addAttribute("historyRepo", saleRecordRepository);
        model.addAttribute("predictiveService", predictiveService);

        return "inventory-dashboard";
    }
}