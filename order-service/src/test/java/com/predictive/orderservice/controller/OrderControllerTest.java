package com.predictive.orderservice.controller;

import com.predictive.orderservice.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for {@link OrderController} using MockMvc.
 * Verifies input validation, HTTP status codes, and service delegation.
 */
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @Nested
    @DisplayName("POST /api/orders/place")
    class PlaceOrder {

        @Test
        @DisplayName("returns 202 Accepted for valid order")
        void acceptsValidOrder() throws Exception {
            mockMvc.perform(post("/api/orders/place")
                            .param("sku", "LAPTOP-001")
                            .param("quantity", "5"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.sku").value("LAPTOP-001"))
                    .andExpect(jsonPath("$.quantity").value(5))
                    .andExpect(jsonPath("$.status").value("ACCEPTED"));

            verify(orderService).publishOrder("LAPTOP-001", 5);
        }

        @Test
        @DisplayName("returns 400 for blank SKU")
        void rejectsBlankSku() throws Exception {
            mockMvc.perform(post("/api/orders/place")
                            .param("sku", "")
                            .param("quantity", "5"))
                    .andExpect(status().isBadRequest());

            verify(orderService, never()).publishOrder(anyString(), anyInt());
        }

        @Test
        @DisplayName("returns 400 for zero quantity")
        void rejectsZeroQuantity() throws Exception {
            mockMvc.perform(post("/api/orders/place")
                            .param("sku", "LAPTOP-001")
                            .param("quantity", "0"))
                    .andExpect(status().isBadRequest());

            verify(orderService, never()).publishOrder(anyString(), anyInt());
        }

        @Test
        @DisplayName("returns 400 for negative quantity")
        void rejectsNegativeQuantity() throws Exception {
            mockMvc.perform(post("/api/orders/place")
                            .param("sku", "LAPTOP-001")
                            .param("quantity", "-5"))
                    .andExpect(status().isBadRequest());

            verify(orderService, never()).publishOrder(anyString(), anyInt());
        }

        @Test
        @DisplayName("publishes event to Kafka via OrderService")
        void delegatesToService() throws Exception {
            mockMvc.perform(post("/api/orders/place")
                            .param("sku", "PHONE-001")
                            .param("quantity", "3"))
                    .andExpect(status().isAccepted());

            verify(orderService, times(1)).publishOrder("PHONE-001", 3);
        }
    }
}
