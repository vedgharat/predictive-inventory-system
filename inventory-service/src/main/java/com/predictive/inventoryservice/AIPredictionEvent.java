package com.predictive.inventoryservice;

public class AIPredictionEvent {
    private String sku;
    private double ai_velocity;

    public AIPredictionEvent() {}

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public double getAi_velocity() { return ai_velocity; }
    public void setAi_velocity(double ai_velocity) { this.ai_velocity = ai_velocity; }
}