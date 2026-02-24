package com.predictive.inventoryservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching; // ⬅️ Import this

@SpringBootApplication
@EnableCaching // ⬅️ Turns on the Caching Engine
public class InventoryServiceApplication {
	public static void main(String[] args) {
		SpringApplication.run(InventoryServiceApplication.class, args);
	}
}