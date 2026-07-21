package com.openopportunity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OpenOpportunityApplication {

	public static void main(String[] args) {
		SpringApplication.run(OpenOpportunityApplication.class, args);
	}

}
