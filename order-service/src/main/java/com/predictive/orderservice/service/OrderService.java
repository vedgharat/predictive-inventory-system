package com.predictive.orderservice.service;

import com.predictive.orderservice.model.OrderEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

/**
 * Publishes order events to the 'order-events' Kafka topic for asynchronous processing
 * by downstream consumers (Inventory Service, AI Forecasting Service).
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final String ORDER_EVENTS_TOPIC = "order-events";

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public OrderService(KafkaTemplate<String, OrderEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Publishes an order event to Kafka and returns immediately.
     * The actual stock deduction happens asynchronously in the Inventory Service.
     *
     * @param sku      the product SKU
     * @param quantity the number of units ordered
     */
    public void publishOrder(String sku, int quantity) {
        OrderEvent event = new OrderEvent(sku, quantity);
        kafkaTemplate.send(ORDER_EVENTS_TOPIC, event);
        log.info("Order published: {} x{}", sku, quantity);
    }
}
