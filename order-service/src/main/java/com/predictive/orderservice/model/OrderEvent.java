package com.predictive.orderservice.model;

/**
 * Kafka event payload representing a customer order.
 * Serialized to JSON by Spring's JsonSerializer and published to the 'order-events' topic.
 */
public class OrderEvent {

    private String sku;
    private int quantity;

    public OrderEvent() {}

    public OrderEvent(String sku, int quantity) {
        this.sku = sku;
        this.quantity = quantity;
    }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
}
