package com.predictive.inventoryservice;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class SaleRecord {
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

    // Getters and Setters
    public Long getId() { return id; }
    public String getSku() { return sku; }
    public int getQuantitySold() { return quantitySold; }
    public LocalDateTime getSaleTimestamp() { return saleTimestamp; }
}