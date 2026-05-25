from confluent_kafka import Consumer
c = Consumer({"bootstrap.servers": "localhost:29092", "group.id": "test2", "auto.offset.reset": "earliest"})
c.subscribe(["smart-ai-predictions"])
while True:
    msg = c.poll(1.0)
    if not msg:
        break
    print(msg.value())
