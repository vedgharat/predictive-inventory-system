package com.predictive.inventoryservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class AIPredictionListener {

    private final InventoryRepository inventoryRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Constructor injection is safer here
    public AIPredictionListener(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    // Bumped to v13 to clear out old messages
    @KafkaListener(topics = "smart-ai-predictions", groupId = "java-dashboard-group-v13")
    public void handleAIPrediction(String rawJson) {
        try {
            AIPredictionEvent event = objectMapper.readValue(rawJson, AIPredictionEvent.class);

            System.out.println("=================================================");
            System.out.println("🧠 AI UPDATE DETECTED!");

            // THE FIX: Direct Database Strike! No reading the old quantity.
            inventoryRepository.updateAiVelocity(event.getSku(), event.getAi_velocity());

            System.out.println("✅ AI Velocity Saved: " + event.getAi_velocity() + " units/min for " + event.getSku());
            System.out.println("=================================================");

        } catch (Exception e) {
            System.out.println("⚠️ Ignored old or unparseable AI message.");
        }
    }
}