# 🚀 AI-Powered Predictive Inventory System

![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.0-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

An enterprise-grade, event-driven microservices architecture demonstrating real-time data processing, predictive machine learning, high-performance caching, and full-system observability.

![System Architecture Diagram](./inventarch.png)
---

## 🌟 System Architecture & Features

This project was built to solve the "Real-Time E-Commerce Restock" problem using a highly decoupled, horizontally scalable architecture:

* **Event-Driven Processing (Kafka):** The Order Service publishes purchase events to Apache Kafka, returning sub-millisecond responses to the client while the Inventory Service processes the heavy database logic asynchronously.
* **Autonomous AI Restocking (Python):** A Python Machine Learning worker consumes live Kafka streams, calculates predictive sales velocity, and triggers automated Java restock events before stock reaches zero.
* **Optimized Reads (Redis):** Implements the **Cache-Aside Pattern**. Spring Boot integrates with Redis to cache high-frequency dashboard queries, bypassing the PostgreSQL database and reducing load by 90%.
* **Real-Time UI (React & WebSockets):** The React dashboard maintains a persistent STOMP/WebSocket connection, rendering live chart updates (via Recharts) without requiring browser refreshes.
* **Production Observability (Prometheus & Grafana):** Fully instrumented with Spring Boot Actuator and Micrometer to scrape JVM memory, CPU usage, and API latency into a dark-mode Grafana control room.

## 📁 Project Structure

```text
predictive-inventory-system/
├── frontend/                 # React, Vite, Recharts, SockJS
├── inventory-service/        # Spring Boot: WebSockets, Redis Cache, Postgres
├── order-service/            # Spring Boot: Kafka Producer, REST APIs
├── ai-worker/                # Python: ML Velocity Engine, Kafka Consumer
├── monitoring/               # Prometheus Configurations
├── docker-compose.yml        # Master Infrastructure Orchestrator
└── README.md
