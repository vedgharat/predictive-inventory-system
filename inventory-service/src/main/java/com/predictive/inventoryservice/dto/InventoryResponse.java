package com.predictive.inventoryservice.dto;

/**
 * Response DTO for inventory queries, enriching the raw entity with computed fields
 * such as depletion time and status classification.
 */
public class InventoryResponse {

    private Long id;
    private String sku;
    private Integer quantity;
    private Double aiVelocity;
    private String depletionEstimate;
    private String status;

    public InventoryResponse() {}

    public InventoryResponse(Long id, String sku, Integer quantity, Double aiVelocity,
                             String depletionEstimate, String status) {
        this.id = id;
        this.sku = sku;
        this.quantity = quantity;
        this.aiVelocity = aiVelocity;
        this.depletionEstimate = depletionEstimate;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Double getAiVelocity() { return aiVelocity; }
    public void setAiVelocity(Double aiVelocity) { this.aiVelocity = aiVelocity; }

    public String getDepletionEstimate() { return depletionEstimate; }
    public void setDepletionEstimate(String depletionEstimate) { this.depletionEstimate = depletionEstimate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
