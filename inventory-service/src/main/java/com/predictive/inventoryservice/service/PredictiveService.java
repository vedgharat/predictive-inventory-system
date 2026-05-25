package com.predictive.inventoryservice.service;

import com.predictive.inventoryservice.model.SaleRecord;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

/**
 * Calculates sales velocity and stock depletion estimates from historical sale data.
 * Uses a simple linear velocity model: total items sold divided by elapsed time.
 *
 * <p>This server-side engine complements the Python ML service by providing
 * a lightweight fallback prediction when real-time Kafka predictions are unavailable.</p>
 */
@Service
public class PredictiveService {

    /**
     * Computes the average sales velocity (items per second) from a list of sale records.
     *
     * @param history chronologically ordered sale records for a single SKU
     * @return sales velocity in items per second, or 0.0 if insufficient data
     */
    public double calculateVelocity(List<SaleRecord> history) {
        if (history == null || history.size() < 2) {
            return 0.0;
        }

        int totalSold = history.stream().mapToInt(SaleRecord::getQuantitySold).sum();

        SaleRecord firstSale = history.get(0);
        SaleRecord newestSale = history.get(history.size() - 1);

        long secondsElapsed = Duration.between(
                firstSale.getSaleTimestamp(), newestSale.getSaleTimestamp()
        ).getSeconds();

        if (secondsElapsed <= 0) {
            secondsElapsed = 1;
        }

        return (double) totalSold / secondsElapsed;
    }

    /**
     * Estimates the time until stock reaches zero at the given velocity.
     *
     * @param currentStock current number of units in stock
     * @param velocity     sales velocity in items per second
     * @return human-readable depletion estimate (e.g., "45 mins left") or "Stable" if velocity is zero
     */
    public String predictTimeToEmpty(int currentStock, double velocity) {
        if (velocity <= 0) return "Stable";

        long secondsLeft = (long) (currentStock / velocity);
        if (secondsLeft > 3600) return (secondsLeft / 3600) + " hours left";
        if (secondsLeft > 60) return (secondsLeft / 60) + " mins left";
        return secondsLeft + " seconds left";
    }
}
