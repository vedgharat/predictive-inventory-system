package com.predictive.inventoryservice.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.DynamicUpdate;

import java.io.Serializable;

/**
 * Represents a product's current inventory state, including AI-predicted velocity.
 * Persisted to PostgreSQL and cached in Redis for high-frequency dashboard reads.
 */
@Entity
@Table(name = "inventory_items")
@DynamicUpdate
public class InventoryItem implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sku;
    private Integer quantity;
    private Double aiVelocity = 0.0;

    public InventoryItem() {}

    public InventoryItem(String sku, Integer quantity) {
        this.sku = sku;
        this.quantity = quantity;
        this.aiVelocity = 0.0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Double getAiVelocity() { return aiVelocity; }
    public void setAiVelocity(Double aiVelocity) { this.aiVelocity = aiVelocity; }
}
