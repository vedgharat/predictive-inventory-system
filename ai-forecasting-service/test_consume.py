from confluent_kafka import Consumer
c = Consumer({"bootstrap.servers": "localhost:29092", "group.id": "test", "auto.offset.reset": "earliest"})
c.subscribe(["order-events"])
msg = c.poll(5.0)
if msg:
    print(msg.value())
