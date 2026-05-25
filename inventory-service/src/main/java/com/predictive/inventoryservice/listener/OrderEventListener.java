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
 * Consumes order events from the 'order-events' Kafka topic, deducts stock,
 * records the sale, and broadcasts the updated inventory state via WebSocket.
 */
@Component
public class OrderEventListener {

    private static final Logger log = LoggerFactory.getLogger(OrderEventListener.class);

    private final InventoryService inventoryService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public OrderEventListener(InventoryService inventoryService,
                              SimpMessagingTemplate messagingTemplate) {
        this.inventoryService = inventoryService;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = new ObjectMapper();
    }

    @KafkaListener(topics = "order-events", groupId = "inventory-group")
    public void handleOrderEvent(String rawJson) {
        try {
            OrderEvent event = objectMapper.readValue(rawJson, OrderEvent.class);
            InventoryItem updated = inventoryService.processOrder(event.getSku(), event.getQuantity());
            messagingTemplate.convertAndSend("/topic/inventory", updated);
        } catch (Exception e) {
            log.error("Failed to process order event: {}", rawJson, e);
        }
    }
}
