package com.anushka.university_lost_and_found.controller;

import com.anushka.university_lost_and_found.model.ContactMessage;
import com.anushka.university_lost_and_found.service.ContactMessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/contact")
public class ContactMessageController {

    private final ContactMessageService contactMessageService;

    public ContactMessageController(ContactMessageService contactMessageService) {
        this.contactMessageService = contactMessageService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> saveContactMessage(@RequestBody ContactMessage contactMessage) {
        contactMessageService.saveMessage(contactMessage);
        return ResponseEntity.ok(Map.of("message", "Message sent successfully."));
    }
}
