package com.predictive.inventoryservice.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.predictive.inventoryservice.dto.OrderEvent;
import com.predictive.inventoryservice.model.InventoryItem;
import com.predictive.inventoryservice.service.InventoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Consumes restock events from the 'warehouse-restock' Kafka topic and
 * replenishes inventory. Broadcasts the updated stock level to the dashboard.
 */
@Component
public class RestockListener {

    private static final Logger log = LoggerFactory.getLogger(RestockListener.class);

    private final InventoryService inventoryService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public RestockListener(InventoryService inventoryService,
                           SimpMessagingTemplate messagingTemplate) {
        this.inventoryService = inventoryService;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = new ObjectMapper();
    }

    @KafkaListener(topics = "warehouse-restock", groupId = "restock-group")
    public void handleRestock(String rawJson) {
        try {
            OrderEvent restockEvent = objectMapper.readValue(rawJson, OrderEvent.class);
            log.info("Restock received: {} x{}", restockEvent.getSku(), restockEvent.getQuantity());

            InventoryItem updated = inventoryService.addStock(
                    restockEvent.getSku(), restockEvent.getQuantity()
            );
            messagingTemplate.convertAndSend("/topic/inventory", updated);
        } catch (Exception e) {
            log.error("Failed to process restock event: {}", rawJson, e);
        }
    }
}
