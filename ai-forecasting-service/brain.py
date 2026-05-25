"""
AI Forecasting Service — Predictive Sales Velocity Engine

Consumes order events from Kafka, trains a per-SKU linear regression model
on cumulative sales over time, and publishes velocity predictions (units/min)
back to Kafka for the Inventory Service to act on.
"""

import json
import logging
import os
import sys
import time

import pandas as pd
from confluent_kafka import Consumer, Producer, KafkaError
from sklearn.linear_model import LinearRegression

# ── Configuration ──────────────────────────────────────────────

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:29092")
CONSUMER_GROUP = os.getenv("CONSUMER_GROUP", "ai-ml-group")
INPUT_TOPIC = "order-events"
OUTPUT_TOPIC = "smart-ai-predictions"
MIN_DATA_POINTS = 3

# ── Logging ────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("ai-forecasting")

# ── Kafka Clients ──────────────────────────────────────────────

consumer = Consumer({
    "bootstrap.servers": KAFKA_BROKER,
    "group.id": CONSUMER_GROUP,
    "auto.offset.reset": "earliest",
})
producer = Producer({"bootstrap.servers": KAFKA_BROKER})

consumer.subscribe([INPUT_TOPIC])

# ── Per-SKU State ──────────────────────────────────────────────


class SkuTracker:
    """Tracks cumulative sales and timestamps for a single SKU."""

    def __init__(self):
        self.data_points = []
        self.cumulative_sales = 0
        self.start_time = time.time()

    def record_sale(self, quantity: int) -> None:
        elapsed = max(1, int(time.time() - self.start_time))
        self.cumulative_sales += quantity
        self.data_points.append([elapsed, self.cumulative_sales])

    def predict_velocity(self) -> float | None:
        """Returns predicted sales per minute, or None if insufficient data."""
        if len(self.data_points) < MIN_DATA_POINTS:
            return None

        df = pd.DataFrame(self.data_points, columns=["SecondsElapsed", "TotalSold"])
        model = LinearRegression()
        model.fit(df[["SecondsElapsed"]], df["TotalSold"])

        return round(float(model.coef_[0] * 60), 2)


sku_trackers: dict[str, SkuTracker] = {}

# ── Main Loop ──────────────────────────────────────────────────


def run():
    log.info("AI Forecasting Service starting | broker=%s | topics=%s→%s",
             KAFKA_BROKER, INPUT_TOPIC, OUTPUT_TOPIC)

    try:
        while True:
            msg = consumer.poll(timeout=1.0)

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

            # Get or create per-SKU tracker
            if sku not in sku_trackers:
                sku_trackers[sku] = SkuTracker()
                log.info("New SKU detected: %s", sku)

            tracker = sku_trackers[sku]
            tracker.record_sale(int(qty))

            velocity = tracker.predict_velocity()
            if velocity is not None:
                prediction = {"sku": sku, "ai_velocity": velocity}

                producer.produce(
                    OUTPUT_TOPIC,
                    value=json.dumps(prediction).encode("utf-8"),
                )
                producer.flush()

                log.info("Prediction: sku=%s velocity=%.2f units/min (data_points=%d)",
                         sku, velocity, len(tracker.data_points))

    except KeyboardInterrupt:
        log.info("Shutting down AI Forecasting Service")
    finally:
        consumer.close()


if __name__ == "__main__":
    run()