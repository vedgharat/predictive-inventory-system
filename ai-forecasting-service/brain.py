"""
AI Forecasting Service — Predictive Sales Velocity Engine

Consumes *new* order events from Kafka (starting from the end of the log),
records each event with the current wall-clock time, and publishes per-SKU
velocity predictions (units/minute) back to Kafka.

Algorithm: sliding-window rate calculation.
  - Keeps a deque of (wall_clock_seconds, quantity) for each SKU.
  - Only events within the last WINDOW_SECONDS are considered.
  - velocity = total_units_in_window / elapsed_minutes.
  - Handles burst orders gracefully (treats all events in a burst as
    spread over a minimum of 1 second to avoid divide-by-zero).

Heartbeat: every HEARTBEAT_INTERVAL seconds, publishes a velocity prediction
  for every known SKU even with no new orders. This lets the Java inventory
  service trigger restocking on zero-velocity / out-of-stock items.
"""

import json
import logging
import os
import sys
import time
from collections import defaultdict, deque

from confluent_kafka import Consumer, Producer, KafkaError, TopicPartition, OFFSET_END

# -- Configuration ----------------------------------------------------------

KAFKA_BROKER      = os.getenv("KAFKA_BROKER", "localhost:29092")
CONSUMER_GROUP    = os.getenv("CONSUMER_GROUP", "ai-ml-group-v4")
INPUT_TOPIC       = "order-events"
OUTPUT_TOPIC      = "smart-ai-predictions"
WINDOW_SECONDS    = int(os.getenv("VELOCITY_WINDOW_SECONDS", "300"))  # 5 minutes
HEARTBEAT_INTERVAL = 30  # seconds between idle predictions for all known SKUs

# -- Logging ----------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("ai-forecasting")

# -- Kafka Clients ----------------------------------------------------------

consumer = Consumer({
    "bootstrap.servers": KAFKA_BROKER,
    "group.id": CONSUMER_GROUP,
    # Don't use auto.offset.reset here — we assign manually below
})
producer = Producer({"bootstrap.servers": KAFKA_BROKER})

# Seek to end of every partition so we only process events that arrive
# AFTER this process starts. This avoids replaying old bursts of orders
# that were placed within the same second (which would distort velocity).
def seek_to_end(kafka_consumer: Consumer, topic: str) -> None:
    meta = kafka_consumer.list_topics(topic, timeout=10)
    partitions = [
        TopicPartition(topic, p)
        for p in meta.topics[topic].partitions
    ]
    kafka_consumer.assign(partitions)
    # poll once to trigger assignment, then seek each partition to end
    kafka_consumer.poll(timeout=0)
    for tp in partitions:
        # get high watermark (end offset)
        low, high = kafka_consumer.get_watermark_offsets(tp, timeout=5)
        tp.offset = high
    kafka_consumer.assign(partitions)   # re-assign with explicit offsets
    for tp in partitions:
        kafka_consumer.seek(tp)
    log.info("Seeked to end of %s (partitions: %d)", topic, len(partitions))


seek_to_end(consumer, INPUT_TOPIC)

# -- Per-SKU State ----------------------------------------------------------

# Maps sku -> deque of (wall_clock_time_seconds, quantity)
sku_events: dict[str, deque] = defaultdict(lambda: deque())
sku_totals: dict[str, int]   = defaultdict(int)
sku_first_seen: dict[str, float] = {}


def compute_velocity(sku: str) -> float:
    events = sku_events[sku]
    if not events:
        return 0.0

    now = time.time()
    cutoff = now - WINDOW_SECONDS

    # Drop events outside the sliding window
    while events and events[0][0] < cutoff:
        events.popleft()

    if not events:
        # Fall back to all-time average
        age_minutes = max((now - sku_first_seen.get(sku, now)) / 60.0, 1 / 60.0)
        return round(sku_totals[sku] / age_minutes, 4)

    units = sum(q for _, q in events)
    # Elapsed = now - time of oldest event in window; min 1s to handle bursts
    elapsed_minutes = max((now - events[0][0]) / 60.0, 1 / 60.0)
    return round(units / elapsed_minutes, 4)


def publish_prediction(sku: str, velocity: float) -> None:
    """Publish a velocity prediction for one SKU to the output Kafka topic."""
    prediction = {
        "sku": sku,
        "ai_velocity": velocity,
        "total_sold": sku_totals[sku],
        "window_seconds": WINDOW_SECONDS,
    }
    producer.produce(OUTPUT_TOPIC, value=json.dumps(prediction).encode("utf-8"))
    producer.flush()


# -- Main Loop --------------------------------------------------------------


def run():
    log.info(
        "AI Forecasting Service ready | broker=%s | window=%ds | listening on %s",
        KAFKA_BROKER, WINDOW_SECONDS, INPUT_TOPIC,
    )

    last_heartbeat = time.time()

    try:
        while True:
            msg = consumer.poll(timeout=1.0)

            # Periodic heartbeat: publish a prediction for every known SKU so
            # the inventory-service can evaluate restocking even for items with
            # no recent order activity (e.g. out-of-stock with velocity=0).
            now = time.time()
            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                for sku in list(sku_first_seen.keys()):
                    velocity = compute_velocity(sku)
                    publish_prediction(sku, velocity)
                    log.debug("Heartbeat: sku=%-20s velocity=%.2f", sku, velocity)
                last_heartbeat = now

            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                log.error("Kafka error: %s", msg.error())
                continue

            try:
                event = json.loads(msg.value().decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                log.warning("Skipping unparseable message: %s", e)
                continue

            sku = event.get("sku")
            qty = event.get("quantity")

            if not sku or not isinstance(qty, (int, float)) or qty <= 0:
                log.warning("Skipping invalid event: %s", event)
                continue

            qty = int(qty)
            now = time.time()

            if sku not in sku_first_seen:
                sku_first_seen[sku] = now
                log.info("New SKU observed: %s", sku)

            sku_events[sku].append((now, qty))
            sku_totals[sku] += qty

            velocity = compute_velocity(sku)
            publish_prediction(sku, velocity)

            log.info(
                "Prediction: sku=%-20s velocity=%8.2f u/m  total_sold=%d",
                sku, velocity, sku_totals[sku],
            )

    except KeyboardInterrupt:
        log.info("Shutting down AI Forecasting Service")
    finally:
        consumer.close()


if __name__ == "__main__":
    run()