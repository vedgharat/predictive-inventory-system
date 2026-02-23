package com.predictive.inventoryservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RestockListener {

    private final InventoryRepository inventoryRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RestockListener(InventoryRepository inventoryRepository, SimpMessagingTemplate messagingTemplate) {
        this.inventoryRepository = inventoryRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @KafkaListener(topics = "warehouse-restock", groupId = "restock-group-v1")
    public void handleRestock(String rawJson) {
        try {
            // We can reuse our OrderEvent class to parse the JSON
            OrderEvent restockEvent = objectMapper.readValue(rawJson, OrderEvent.class);

            System.out.println("🚛 WAREHOUSE WOKE UP! Delivering " + restockEvent.getQuantity() + " units of " + restockEvent.getSku());

            // 1. Surgically add the stock
            inventoryRepository.addStock(restockEvent.getSku(), restockEvent.getQuantity());

            // 2. Fetch the fresh item and broadcast it to React
            inventoryRepository.findBySku(restockEvent.getSku()).ifPresent(item -> {
                messagingTemplate.convertAndSend("/topic/inventory", item);
                System.out.println("✅ RESTOCK COMPLETE! " + item.getSku() + " is back up to " + item.getQuantity());
                System.out.println("=================================================");
            });

        } catch (Exception e) {
            System.out.println("⚠️ Failed to process restock event.");
        }
    }
}