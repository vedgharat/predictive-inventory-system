package com.predictive.orderservice;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*") // ⬅️ ADD THIS LINE to allow React button clicks!
public class OrderController {

    // Notice we changed <String, String> to <String, OrderEvent>
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public OrderController(KafkaTemplate<String, OrderEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @PostMapping("/place")
    public String placeOrder(@RequestParam String sku, @RequestParam int quantity) {

        // 1. Create your real Java data object
        OrderEvent event = new OrderEvent(sku, quantity);

        // 2. Send the object directly to Kafka (Spring turns it into JSON for you!)
        kafkaTemplate.send("order-events", event);

        return "Order placed and JSON event published to Kafka!";
    }
}