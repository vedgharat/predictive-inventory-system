package com.predictive.orderservice.controller;

import com.predictive.orderservice.dto.OrderResponse;
import com.predictive.orderservice.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST API for placing customer orders. Accepts order requests and publishes them
 * as events to Kafka, returning immediately with a confirmation response.
 */
@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    /**
     * Places an order by publishing an event to Kafka for async processing.
     *
     * @param sku      the product SKU (required, non-blank)
     * @param quantity the number of units to order (must be >= 1)
     * @return 202 Accepted with order confirmation
     */
    @PostMapping("/place")
    public ResponseEntity<OrderResponse> placeOrder(
            @RequestParam String sku,
            @RequestParam int quantity) {

        if (sku == null || sku.isBlank()) {
            return ResponseEntity.badRequest().body(
                    new OrderResponse(sku, quantity, "REJECTED: SKU must not be blank")
            );
        }
        if (quantity < 1) {
            return ResponseEntity.badRequest().body(
                    new OrderResponse(sku, quantity, "REJECTED: Quantity must be at least 1")
            );
        }

        orderService.publishOrder(sku, quantity);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(
                new OrderResponse(sku, quantity, "ACCEPTED")
        );
    }
}
