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

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Consumes AI velocity predictions from the Python ML service, persists them,
 * pushes updates to the React dashboard, and triggers autonomous restocking
 * when stock is critically low.
 *
 * <p>Autonomous restock rules (any one is sufficient):
 * <ol>
 *   <li>Stock is depleted (qty == 0) — unconditional emergency restock</li>
 *   <li>Stock &le; CRITICAL_THRESHOLD (10) — safety net, no velocity needed</li>
 *   <li>Stock &le; LOW_STOCK_THRESHOLD (30) AND predicted depletion &le; 10 min</li>
 * </ol>
 * A per-SKU cooldown of 2 minutes prevents restock event spam on the Kafka topic.
 */
@Component
public class AIPredictionListener {

    private static final Logger log = LoggerFactory.getLogger(AIPredictionListener.class);
    private static final double DEPLETION_THRESHOLD_MINUTES = 10.0;
    private static final int LOW_STOCK_THRESHOLD = 30;
    private static final int CRITICAL_THRESHOLD = 10;
    private static final int RESTOCK_QUANTITY = 100;
    private static final long RESTOCK_COOLDOWN_SECONDS = 120; // 2 min between restocks per SKU

    private final InventoryService inventoryService;
    private final InventoryRepository inventoryRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    /** Tracks the last restock time per SKU to enforce cooldown. */
    private final Map<String, Instant> lastRestockTime = new ConcurrentHashMap<>();

    public AIPredictionListener(InventoryService inventoryService,
                                InventoryRepository inventoryRepository,
                                SimpMessagingTemplate messagingTemplate,
                                KafkaTemplate<String, String> kafkaTemplate) {
        this.inventoryService = inventoryService;
        this.inventoryRepository = inventoryRepository;
        this.messagingTemplate = messagingTemplate;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = new ObjectMapper();
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
     * Evaluates whether the current stock level requires an autonomous restock.
     * Three triggers, each protected by a per-SKU cooldown:
     *   1. Out of stock (qty == 0) — unconditional
     *   2. Critical stock (qty <= CRITICAL_THRESHOLD) — safety net, velocity not required
     *   3. Low stock (qty <= LOW_STOCK_THRESHOLD) + velocity-based imminent depletion
     */
    private void evaluateRestockNeed(AIPredictionEvent event) {
        inventoryRepository.findBySku(event.getSku()).ifPresent(item -> {
            int qty = item.getQuantity();
            double vel = event.getAi_velocity();

            boolean outOfStock      = qty <= 0;
            boolean criticalStock   = qty <= CRITICAL_THRESHOLD;
            boolean velocityTrigger = vel > 0
                    && qty <= LOW_STOCK_THRESHOLD
                    && (qty / vel) <= DEPLETION_THRESHOLD_MINUTES;

            if (!outOfStock && !criticalStock && !velocityTrigger) return;

            // Enforce per-SKU cooldown to avoid flooding the warehouse topic
            Instant now = Instant.now();
            Instant last = lastRestockTime.get(event.getSku());
            if (last != null && now.minusSeconds(RESTOCK_COOLDOWN_SECONDS).isBefore(last)) {
                log.debug("Restock cooldown active for {}, skipping trigger", event.getSku());
                return;
            }

            String reason = outOfStock    ? "OUT_OF_STOCK"
                    : criticalStock       ? "CRITICAL_STOCK (qty=" + qty + ")"
                    : String.format("VELOCITY_DEPLETION (vel=%.1f u/m, ~%.1fm left)", vel, qty / vel);

            log.warn("RESTOCK TRIGGERED for {} — reason: {}", event.getSku(), reason);

            lastRestockTime.put(event.getSku(), now);
            String restockPayload = String.format(
                    "{\"sku\":\"%s\", \"quantity\":%d}", event.getSku(), RESTOCK_QUANTITY
            );
            kafkaTemplate.send("warehouse-restock", restockPayload);
        });
    }
}
