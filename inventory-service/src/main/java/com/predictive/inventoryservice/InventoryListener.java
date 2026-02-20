package com.predictive.inventoryservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class InventoryListener {

    private final InventoryRepository inventoryRepository;
    private final SaleRecordRepository saleRecordRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InventoryListener(InventoryRepository inventoryRepository, SaleRecordRepository saleRecordRepository) {
        this.inventoryRepository = inventoryRepository;
        this.saleRecordRepository = saleRecordRepository;
    }

    // Keeping v4 so it continues cleanly
    @KafkaListener(topics = "order-events", groupId = "inventory-group-v4")
    public void handleOrderEvent(String rawJson) {
        try {
            // Manually map the raw string to the Object
            OrderEvent orderEvent = objectMapper.readValue(rawJson, OrderEvent.class);

            System.out.println("-------------------------------------------------");
            System.out.println("🚨 INVENTORY SERVICE RECEIVED TICKET!");
            System.out.println("Item: " + orderEvent.getSku() + " | Qty to deduct: " + orderEvent.getQuantity());

            InventoryItem item = inventoryRepository.findBySku(orderEvent.getSku())
                    .orElseGet(() -> {
                        System.out.println("📦 Brand new item detected! Adding 100 " + orderEvent.getSku() + "s to the database.");
                        return new InventoryItem(orderEvent.getSku(), 100);
                    });

            // THE GUARDRAIL: Do the math, but floor it at zero
            int newTotal = item.getQuantity() - orderEvent.getQuantity();

            if (newTotal < 0) {
                System.out.println("⚠️ WARNING: Stock cannot drop below zero. Flooring at 0.");
                newTotal = 0;
            }

            item.setQuantity(newTotal);
            inventoryRepository.save(item);

            SaleRecord newSale = new SaleRecord(orderEvent.getSku(), orderEvent.getQuantity(), LocalDateTime.now());
            saleRecordRepository.save(newSale);

            System.out.println("✅ DATABASE UPDATED! Remaining " + item.getSku() + " stock: " + item.getQuantity());
            System.out.println("-------------------------------------------------");

        } catch (Exception e) {
            System.out.println("⚠️ Ignored invalid order event format.");
        }
    }
}