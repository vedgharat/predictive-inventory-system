package com.predictive.inventoryservice;

import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.List;

@Service
public class PredictiveService {

    public double calculateVelocity(List<SaleRecord> history) {
        // 1. We need at least 2 sales to draw a line graph (a trend)
        if (history == null || history.size() < 2) {
            System.out.println("🧠 Brain needs more data! Only " + (history == null ? 0 : history.size()) + " sales logged.");
            return 0.0;
        }

        // 2. Add up all the items we've sold so far
        int totalSold = history.stream().mapToInt(SaleRecord::getQuantitySold).sum();

        // 3. Bulletproof Time Math: Compare the first order's time to the newest order's time
        SaleRecord firstSale = history.get(0);
        SaleRecord newestSale = history.get(history.size() - 1);

        long secondsElapsed = Duration.between(firstSale.getSaleTimestamp(), newestSale.getSaleTimestamp()).getSeconds();

        // Prevent division by zero if you run the curl commands too fast!
        if (secondsElapsed <= 0) {
            secondsElapsed = 1;
        }

        // 4. Calculate Velocity (Items per second)
        double velocityPerSecond = (double) totalSold / secondsElapsed;

        System.out.println("🧠 Brain Math -> Total Sold: " + totalSold + " | Seconds Elapsed: " + secondsElapsed + " | Velocity/sec: " + velocityPerSecond);

        return velocityPerSecond;
    }

    public String predictTimeToEmpty(int currentStock, double velocity) {
        if (velocity <= 0) return "Stable";

        long secondsLeft = (long) (currentStock / velocity);
        if (secondsLeft > 3600) return (secondsLeft / 3600) + " hours left";
        if (secondsLeft > 60) return (secondsLeft / 60) + " mins left";
        return secondsLeft + " seconds left";
    }
}