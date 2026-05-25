package com.predictive.orderservice.dto;

/**
 * Response DTO returned after successfully placing an order.
 */
public class OrderResponse {

    private String sku;
    private int quantity;
    private String status;
    private String timestamp;

    public OrderResponse() {}

    public OrderResponse(String sku, int quantity, String status) {
        this.sku = sku;
        this.quantity = quantity;
        this.status = status;
        this.timestamp = java.time.Instant.now().toString();
    }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
