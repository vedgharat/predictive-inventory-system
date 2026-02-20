from confluent_kafka import Consumer, Producer
import json
import time
import pandas as pd
from sklearn.linear_model import LinearRegression

broker = 'localhost:29092'
# Bumped to v7 to ensure clean read
consumer = Consumer({'bootstrap.servers': broker, 'group.id': 'ai-ml-group-v7', 'auto.offset.reset': 'earliest'})
producer = Producer({'bootstrap.servers': broker})

consumer.subscribe(['order-events'])

print("🤖 AI Machine Learning Service Booting Up...")
print("Listening to 'order-events' and Broadcasting to 'smart-ai-predictions'...\n")

data_store = []
start_time = time.time()
cumulative_sales = 0

try:
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None or msg.error():
            continue

        event = json.loads(msg.value().decode('utf-8'))
        sku = event.get('sku')
        qty = event.get('quantity')

        current_time_sec = int(time.time() - start_time)
        if current_time_sec == 0:
            current_time_sec = 1

        cumulative_sales += qty
        data_store.append([current_time_sec, cumulative_sales])

        if len(data_store) >= 3:
            df = pd.DataFrame(data_store, columns=['SecondsElapsed', 'TotalSold'])
            X = df[['SecondsElapsed']]
            y = df['TotalSold']

            model = LinearRegression()
            model.fit(X, y)

            sales_per_minute = model.coef_[0] * 60

            # Simple, clean JSON payload. No Spring Headers needed anymore!
            prediction_payload = {
                "sku": sku,
                "ai_velocity": float(round(sales_per_minute, 2))
            }

            producer.produce('smart-ai-predictions', value=json.dumps(prediction_payload).encode('utf-8'))
            producer.flush()

            print(f"📡 BROADCASTED: {prediction_payload}")
            print("-------------------------------------------------")

except KeyboardInterrupt:
    print("Shutting down AI service...")
finally:
    consumer.close()