package com.predictive.orderservice.service;

import com.predictive.orderservice.model.OrderEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/**
 * Unit tests for {@link OrderService} verifying Kafka event publishing.
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @InjectMocks
    private OrderService orderService;

    @Test
    @DisplayName("publishes order event to correct Kafka topic")
    void publishesEventToKafka() {
        orderService.publishOrder("LAPTOP-001", 10);

        ArgumentCaptor<OrderEvent> captor = ArgumentCaptor.forClass(OrderEvent.class);
        verify(kafkaTemplate).send(eq("order-events"), captor.capture());

        OrderEvent published = captor.getValue();
        assertEquals("LAPTOP-001", published.getSku());
        assertEquals(10, published.getQuantity());
    }

    @Test
    @DisplayName("publishes with correct SKU and quantity for different inputs")
    void publishesCorrectData() {
        orderService.publishOrder("PHONE-002", 3);

        ArgumentCaptor<OrderEvent> captor = ArgumentCaptor.forClass(OrderEvent.class);
        verify(kafkaTemplate).send(eq("order-events"), captor.capture());

        assertEquals("PHONE-002", captor.getValue().getSku());
        assertEquals(3, captor.getValue().getQuantity());
    }
}
