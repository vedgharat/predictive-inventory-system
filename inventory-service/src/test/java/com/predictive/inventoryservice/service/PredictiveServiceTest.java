package com.predictive.inventoryservice.service;

import com.predictive.inventoryservice.model.SaleRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link PredictiveService} covering velocity calculation edge cases
 * and depletion time estimates.
 */
class PredictiveServiceTest {

    private PredictiveService predictiveService;

    @BeforeEach
    void setUp() {
        predictiveService = new PredictiveService();
    }

    @Nested
    @DisplayName("calculateVelocity()")
    class CalculateVelocity {

        @Test
        @DisplayName("returns 0.0 when history is null")
        void returnsZeroForNullHistory() {
            assertEquals(0.0, predictiveService.calculateVelocity(null));
        }

        @Test
        @DisplayName("returns 0.0 when history is empty")
        void returnsZeroForEmptyHistory() {
            assertEquals(0.0, predictiveService.calculateVelocity(Collections.emptyList()));
        }

        @Test
        @DisplayName("returns 0.0 when only one sale record exists")
        void returnsZeroForSingleRecord() {
            List<SaleRecord> history = List.of(
                    new SaleRecord("SKU-A", 5, LocalDateTime.now())
            );
            assertEquals(0.0, predictiveService.calculateVelocity(history));
        }

        @Test
        @DisplayName("calculates correct velocity with two data points")
        void calculatesVelocityWithTwoRecords() {
            LocalDateTime baseTime = LocalDateTime.of(2025, 1, 1, 12, 0, 0);
            List<SaleRecord> history = Arrays.asList(
                    new SaleRecord("SKU-A", 10, baseTime),
                    new SaleRecord("SKU-A", 20, baseTime.plusSeconds(60))
            );

            double velocity = predictiveService.calculateVelocity(history);

            // Total sold = 10 + 20 = 30, elapsed = 60 seconds → 0.5 items/sec
            assertEquals(0.5, velocity, 0.001);
        }

        @Test
        @DisplayName("calculates velocity with multiple data points")
        void calculatesVelocityWithMultipleRecords() {
            LocalDateTime baseTime = LocalDateTime.of(2025, 1, 1, 12, 0, 0);
            List<SaleRecord> history = Arrays.asList(
                    new SaleRecord("SKU-B", 5, baseTime),
                    new SaleRecord("SKU-B", 10, baseTime.plusSeconds(30)),
                    new SaleRecord("SKU-B", 15, baseTime.plusSeconds(120))
            );

            double velocity = predictiveService.calculateVelocity(history);

            // Total sold = 30, elapsed = 120 seconds → 0.25 items/sec
            assertEquals(0.25, velocity, 0.001);
        }

        @Test
        @DisplayName("handles zero time gap gracefully (uses 1 second)")
        void handlesZeroTimeGap() {
            LocalDateTime sameTime = LocalDateTime.of(2025, 1, 1, 12, 0, 0);
            List<SaleRecord> history = Arrays.asList(
                    new SaleRecord("SKU-C", 5, sameTime),
                    new SaleRecord("SKU-C", 10, sameTime)
            );

            double velocity = predictiveService.calculateVelocity(history);

            // Total sold = 15, elapsed forced to 1 second → 15.0
            assertEquals(15.0, velocity, 0.001);
        }
    }

    @Nested
    @DisplayName("predictTimeToEmpty()")
    class PredictTimeToEmpty {

        @Test
        @DisplayName("returns 'Stable' when velocity is zero")
        void stableWhenVelocityIsZero() {
            assertEquals("Stable", predictiveService.predictTimeToEmpty(100, 0.0));
        }

        @Test
        @DisplayName("returns 'Stable' when velocity is negative")
        void stableWhenVelocityIsNegative() {
            assertEquals("Stable", predictiveService.predictTimeToEmpty(100, -1.0));
        }

        @Test
        @DisplayName("returns seconds when depletion is under a minute")
        void returnsSecondsForFastDepletion() {
            String result = predictiveService.predictTimeToEmpty(30, 1.0);
            assertTrue(result.contains("seconds left"), "Expected seconds, got: " + result);
        }

        @Test
        @DisplayName("returns minutes for moderate depletion time")
        void returnsMinutesForModerateDepletion() {
            // 600 stock / 1 per sec = 600 sec = 10 mins
            String result = predictiveService.predictTimeToEmpty(600, 1.0);
            assertTrue(result.contains("mins left"), "Expected mins, got: " + result);
        }

        @Test
        @DisplayName("returns hours for slow depletion time")
        void returnsHoursForSlowDepletion() {
            // 7200 stock / 1 per sec = 7200 sec = 2 hours
            String result = predictiveService.predictTimeToEmpty(7200, 1.0);
            assertTrue(result.contains("hours left"), "Expected hours, got: " + result);
        }
    }
}
