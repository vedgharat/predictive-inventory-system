package com.predictive.inventoryservice.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.predictive.inventoryservice.dto.AIPredictionEvent;
import com.predictive.inventoryservice.model.InventoryItem;
import com.predictive.inventoryservice.repository.InventoryRepository;
import com.predictive.inventoryservice.service.InventoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Consumes AI velocity predictions from the Python ML service, persists them,
 * pushes updates to the React dashboard, and triggers autonomous restocking
 * when depletion is imminent.
 *
 * <p>Autonomous restock rule: if predicted depletion time ≤ 10 minutes AND
 * current stock ≤ 30 units, an emergency restock event is published to the
 * 'warehouse-restock' Kafka topic.</p>
 */
@Component
public class AIPredictionListener {

    private static final Logger log = LoggerFactory.getLogger(AIPredictionListener.class);
    private static final double DEPLETION_THRESHOLD_MINUTES = 10.0;
    private static final int LOW_STOCK_THRESHOLD = 30;
    private static final int RESTOCK_QUANTITY = 100;

    private final InventoryService inventoryService;
    private final InventoryRepository inventoryRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public AIPredictionListener(InventoryService inventoryService,
                                InventoryRepository inventoryRepository,
                                SimpMessagingTemplate messagingTemplate,
                                KafkaTemplate<String, String> kafkaTemplate,
                                ObjectMapper objectMapper) {
        this.inventoryService = inventoryService;
        this.inventoryRepository = inventoryRepository;
        this.messagingTemplate = messagingTemplate;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "smart-ai-predictions", groupId = "java-dashboard-group")
    public void handleAIPrediction(String rawJson) {
        try {
            AIPredictionEvent event = objectMapper.readValue(rawJson, AIPredictionEvent.class);

            inventoryService.updateAiVelocity(event.getSku(), event.getAi_velocity());
            messagingTemplate.convertAndSend("/topic/ai-predictions", event);

            evaluateRestockNeed(event);
        } catch (Exception e) {
            log.error("Failed to process AI prediction: {}", rawJson, e);
        }
    }

    /**
     * Evaluates whether the current stock level requires an autonomous emergency restock.
     */
    private void evaluateRestockNeed(AIPredictionEvent event) {
        if (event.getAi_velocity() <= 0) return;

        inventoryRepository.findBySku(event.getSku()).ifPresent(item -> {
            if (item.getQuantity() <= 0) return;

            double minutesToDepletion = item.getQuantity() / event.getAi_velocity();

            if (minutesToDepletion <= DEPLETION_THRESHOLD_MINUTES
                    && item.getQuantity() <= LOW_STOCK_THRESHOLD) {
                log.warn("CRITICAL: {} depleting in {} mins — triggering autonomous restock",
                        event.getSku(), String.format("%.1f", minutesToDepletion));

                String restockEvent = String.format(
                        "{\"sku\":\"%s\", \"quantity\":%d}", event.getSku(), RESTOCK_QUANTITY
                );
                kafkaTemplate.send("warehouse-restock", restockEvent);
            }
        });
    }
}
