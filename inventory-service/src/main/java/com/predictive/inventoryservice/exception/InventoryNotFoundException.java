package com.predictive.inventoryservice.exception;

/**
 * Thrown when a requested SKU does not exist in the inventory table.
 */
public class InventoryNotFoundException extends RuntimeException {

    public InventoryNotFoundException(String message) {
        super(message);
    }
}
