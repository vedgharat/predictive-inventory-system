package com.predictive.inventoryservice.dto;

/**
 * Deserialized from Kafka 'smart-ai-predictions' topic messages produced by the Python ML service.
 * Contains the SKU and the AI-predicted sales velocity (units per minute).
 */
public class AIPredictionEvent {

    private String sku;
    private double ai_velocity;

    public AIPredictionEvent() {}

    public AIPredictionEvent(String sku, double aiVelocity) {
        this.sku = sku;
        this.ai_velocity = aiVelocity;
    }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public double getAi_velocity() { return ai_velocity; }
    public void setAi_velocity(double ai_velocity) { this.ai_velocity = ai_velocity; }
}
