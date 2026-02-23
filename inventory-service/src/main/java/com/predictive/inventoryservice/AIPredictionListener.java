package com.predictive.inventoryservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class AIPredictionListener {

    private final InventoryRepository inventoryRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate; // We can now send messages!
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AIPredictionListener(InventoryRepository inventoryRepository,
                                SimpMessagingTemplate messagingTemplate,
                                KafkaTemplate<String, String> kafkaTemplate) {
        this.inventoryRepository = inventoryRepository;
        this.messagingTemplate = messagingTemplate;
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = "smart-ai-predictions", groupId = "java-dashboard-group-v13")
    public void handleAIPrediction(String rawJson) {
        try {
            AIPredictionEvent event = objectMapper.readValue(rawJson, AIPredictionEvent.class);
            inventoryRepository.updateAiVelocity(event.getSku(), event.getAi_velocity());
            messagingTemplate.convertAndSend("/topic/ai-predictions", event);

            // --- THE AUTONOMOUS BRAIN ---
            inventoryRepository.findBySku(event.getSku()).ifPresent(item -> {
                if (event.getAi_velocity() > 0 && item.getQuantity() > 0) {

                    double timeToZero = item.getQuantity() / event.getAi_velocity();

                    // RULE: If we run out in less than 10 mins AND stock is below 30
                    if (timeToZero <= 10.0 && item.getQuantity() <= 30) {
                        System.out.println("🚨 CRITICAL WARNING: " + event.getSku() + " depleting in " + String.format("%.1f", timeToZero) + " mins!");
                        System.out.println("🤖 AUTONOMOUS SYSTEM ENGAGED: Dispatching emergency restock order...");

                        // Fire a message to the new 'warehouse-restock' topic!
                        String restockEvent = String.format("{\"sku\":\"%s\", \"quantity\":100}", event.getSku());
                        kafkaTemplate.send("warehouse-restock", restockEvent);
                    }
                }
            });

        } catch (Exception e) {
            System.out.println("⚠️ Ignored old or unparseable AI message.");
        }
    }
}