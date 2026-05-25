package com.predictive.inventoryservice.model;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Records an individual sale event with the SKU, quantity sold, and timestamp.
 * Used for sales history display and as training data for velocity predictions.
 */
@Entity
public class SaleRecord implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sku;
    private int quantitySold;
    private LocalDateTime saleTimestamp;

    public SaleRecord() {}

    public SaleRecord(String sku, int quantitySold, LocalDateTime saleTimestamp) {
        this.sku = sku;
        this.quantitySold = quantitySold;
        this.saleTimestamp = saleTimestamp;
    }

    public Long getId() { return id; }
    public String getSku() { return sku; }
    public int getQuantitySold() { return quantitySold; }
    public LocalDateTime getSaleTimestamp() { return saleTimestamp; }
}
