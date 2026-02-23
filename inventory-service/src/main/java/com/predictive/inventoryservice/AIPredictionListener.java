package com.predictive.inventoryservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class AIPredictionListener {

    private final InventoryRepository inventoryRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SimpMessagingTemplate messagingTemplate; // 1. Add this!

    public AIPredictionListener(InventoryRepository inventoryRepository, SimpMessagingTemplate messagingTemplate) {
        this.inventoryRepository = inventoryRepository;
        this.messagingTemplate = messagingTemplate; // 2. Inject this!
    }

    @KafkaListener(topics = "smart-ai-predictions", groupId = "java-dashboard-group-v13")
    public void handleAIPrediction(String rawJson) {
        try {
            AIPredictionEvent event = objectMapper.readValue(rawJson, AIPredictionEvent.class);

            System.out.println("=================================================");
            System.out.println("🧠 AI UPDATE DETECTED!");

            inventoryRepository.updateAiVelocity(event.getSku(), event.getAi_velocity());

            // 3. BROADCAST TO THE FRONTEND!
            messagingTemplate.convertAndSend("/topic/ai-predictions", event);

            System.out.println("✅ AI Velocity Saved: " + event.getAi_velocity() + " units/min for " + event.getSku());
            System.out.println("=================================================");

        } catch (Exception e) {
            System.out.println("⚠️ Ignored old or unparseable AI message.");
        }
    }
}