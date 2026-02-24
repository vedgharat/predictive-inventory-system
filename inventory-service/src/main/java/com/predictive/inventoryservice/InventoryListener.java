package com.predictive.inventoryservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.CacheEvict; // ⬅️ 1. Import this

import java.time.LocalDateTime;

@Service
public class InventoryListener {

    private final InventoryRepository inventoryRepository;
    private final SaleRecordRepository saleRecordRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SimpMessagingTemplate messagingTemplate;

    public InventoryListener(InventoryRepository inventoryRepository, SaleRecordRepository saleRecordRepository, SimpMessagingTemplate messagingTemplate) {
        this.inventoryRepository = inventoryRepository;
        this.saleRecordRepository = saleRecordRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // ⬅️ 2. Add this annotation right below your KafkaListener
    @KafkaListener(topics = "order-events", groupId = "inventory-group-v4")
    @CacheEvict(value = "recentSales", allEntries = true)
    public void handleOrderEvent(String rawJson) {
        try {
            OrderEvent orderEvent = objectMapper.readValue(rawJson, OrderEvent.class);

            System.out.println("-------------------------------------------------");
            System.out.println("🚨 INVENTORY SERVICE RECEIVED TICKET!");

            InventoryItem item = inventoryRepository.findBySku(orderEvent.getSku())
                    .orElseGet(() -> new InventoryItem(orderEvent.getSku(), 100));

            int newTotal = item.getQuantity() - orderEvent.getQuantity();
            if (newTotal < 0) newTotal = 0;

            item.setQuantity(newTotal);
            inventoryRepository.save(item);

            SaleRecord newSale = new SaleRecord(orderEvent.getSku(), orderEvent.getQuantity(), LocalDateTime.now());
            saleRecordRepository.save(newSale);

            // BROADCAST TO THE FRONTEND!
            messagingTemplate.convertAndSend("/topic/inventory", item);

            System.out.println("✅ DATABASE UPDATED! Remaining " + item.getSku() + " stock: " + item.getQuantity());
            System.out.println("🧹 CACHE CLEARED: Outdated history removed from Redis!"); // ⬅️ 3. Added proof
            System.out.println("-------------------------------------------------");

        } catch (Exception e) {
            System.out.println("⚠️ Ignored invalid order event format.");
        }
    }
}