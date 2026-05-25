package com.predictive.inventoryservice.service;

import com.predictive.inventoryservice.exception.InventoryNotFoundException;
import com.predictive.inventoryservice.model.InventoryItem;
import com.predictive.inventoryservice.model.SaleRecord;
import com.predictive.inventoryservice.repository.InventoryRepository;
import com.predictive.inventoryservice.repository.SaleRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link InventoryService} with mocked repositories.
 */
@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private SaleRecordRepository saleRecordRepository;

    @Mock
    private PredictiveService predictiveService;

    @InjectMocks
    private InventoryService inventoryService;

    private InventoryItem testItem;

    @BeforeEach
    void setUp() {
        testItem = new InventoryItem("LAPTOP-001", 100);
        testItem.setId(1L);
    }

    @Nested
    @DisplayName("getAllInventory()")
    class GetAllInventory {

        @Test
        @DisplayName("returns all inventory items")
        void returnsAllItems() {
            InventoryItem item2 = new InventoryItem("PHONE-001", 50);
            when(inventoryRepository.findAll()).thenReturn(Arrays.asList(testItem, item2));

            List<InventoryItem> result = inventoryService.getAllInventory();

            assertEquals(2, result.size());
            verify(inventoryRepository).findAll();
        }
    }

    @Nested
    @DisplayName("getInventoryBySku()")
    class GetInventoryBySku {

        @Test
        @DisplayName("returns item when SKU exists")
        void returnsItemWhenFound() {
            when(inventoryRepository.findBySku("LAPTOP-001")).thenReturn(Optional.of(testItem));

            InventoryItem result = inventoryService.getInventoryBySku("LAPTOP-001");

            assertEquals("LAPTOP-001", result.getSku());
            assertEquals(100, result.getQuantity());
        }

        @Test
        @DisplayName("throws InventoryNotFoundException when SKU does not exist")
        void throwsWhenNotFound() {
            when(inventoryRepository.findBySku("UNKNOWN")).thenReturn(Optional.empty());

            assertThrows(InventoryNotFoundException.class,
                    () -> inventoryService.getInventoryBySku("UNKNOWN"));
        }
    }

    @Nested
    @DisplayName("processOrder()")
    class ProcessOrder {

        @Test
        @DisplayName("deducts stock and saves sale record for existing item")
        void deductsStockForExistingItem() {
            when(inventoryRepository.findBySku("LAPTOP-001")).thenReturn(Optional.of(testItem));
            when(inventoryRepository.save(any())).thenReturn(testItem);

            InventoryItem result = inventoryService.processOrder("LAPTOP-001", 15);

            assertEquals(85, result.getQuantity());
            verify(saleRecordRepository).save(any(SaleRecord.class));
        }

        @Test
        @DisplayName("creates new item with default stock when SKU is unknown")
        void createsNewItemForUnknownSku() {
            when(inventoryRepository.findBySku("NEW-SKU")).thenReturn(Optional.empty());
            when(inventoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            InventoryItem result = inventoryService.processOrder("NEW-SKU", 10);

            assertEquals(90, result.getQuantity());
        }

        @Test
        @DisplayName("clamps stock at zero when order exceeds available quantity")
        void clampsAtZero() {
            testItem.setQuantity(5);
            when(inventoryRepository.findBySku("LAPTOP-001")).thenReturn(Optional.of(testItem));
            when(inventoryRepository.save(any())).thenReturn(testItem);

            InventoryItem result = inventoryService.processOrder("LAPTOP-001", 20);

            assertEquals(0, result.getQuantity());
        }

        @Test
        @DisplayName("records a sale with correct SKU and quantity")
        void recordsSale() {
            when(inventoryRepository.findBySku("LAPTOP-001")).thenReturn(Optional.of(testItem));
            when(inventoryRepository.save(any())).thenReturn(testItem);

            inventoryService.processOrder("LAPTOP-001", 5);

            ArgumentCaptor<SaleRecord> captor = ArgumentCaptor.forClass(SaleRecord.class);
            verify(saleRecordRepository).save(captor.capture());
            assertEquals("LAPTOP-001", captor.getValue().getSku());
            assertEquals(5, captor.getValue().getQuantitySold());
        }
    }

    @Nested
    @DisplayName("addStock()")
    class AddStock {

        @Test
        @DisplayName("adds stock and returns updated item")
        void addsStock() {
            testItem.setQuantity(150);
            when(inventoryRepository.findBySku("LAPTOP-001")).thenReturn(Optional.of(testItem));

            InventoryItem result = inventoryService.addStock("LAPTOP-001", 50);

            verify(inventoryRepository).addStock("LAPTOP-001", 50);
            assertEquals(150, result.getQuantity());
        }

        @Test
        @DisplayName("throws when restocking unknown SKU")
        void throwsForUnknownSku() {
            when(inventoryRepository.findBySku("UNKNOWN")).thenReturn(Optional.empty());

            assertThrows(InventoryNotFoundException.class,
                    () -> inventoryService.addStock("UNKNOWN", 50));
        }
    }
}
