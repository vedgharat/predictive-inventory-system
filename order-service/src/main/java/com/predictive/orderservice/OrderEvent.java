package com.predictive.orderservice;

public class OrderEvent {
    private String sku;
    private int quantity;

    // Default constructor is required for Spring to convert JSON
    public OrderEvent() {
    }

    public OrderEvent(String sku, int quantity) {
        this.sku = sku;
        this.quantity = quantity;
    }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
}