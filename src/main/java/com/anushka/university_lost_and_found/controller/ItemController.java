package com.anushka.university_lost_and_found.controller;

import com.anushka.university_lost_and_found.model.Item;
import com.anushka.university_lost_and_found.model.StudentUser;
import com.anushka.university_lost_and_found.service.AuthService;
import com.anushka.university_lost_and_found.service.ItemService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemService itemService;
    private final AuthService authService;

    public ItemController(ItemService itemService, AuthService authService) {
        this.itemService = itemService;
        this.authService = authService;
    }

    @PostMapping
    public ResponseEntity<?> addItem(@RequestBody Item item, @RequestHeader("Authorization") String authorization) {
        try {
            StudentUser user = authService.getUserFromToken(authorization);
            if (item.getImageUrl() != null && !item.getImageUrl().isBlank() && !isCloudinaryUrl(item.getImageUrl())) {
                return ResponseEntity.badRequest().body("Use a valid Cloudinary image link.");
            }
            if (item.getTitle() == null || item.getTitle().isBlank() || item.getTitle().length() > 200
                    || !("lost".equals(item.getType()) || "found".equals(item.getType()))) {
                return ResponseEntity.badRequest().body("Enter a title and choose lost or found.");
            }
            item.setId(null);
            item.setCreatedAt(null);
            item.setPostedBy(user.getEmail());
            if (item.getContactInfo() == null || item.getContactInfo().isBlank()) {
                item.setContactInfo(user.getEmail());
            }
            return ResponseEntity.ok(itemService.addItem(item));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public List<Item> getAllItems(@RequestParam(required = false) String type) {
        if (type != null && !type.isEmpty()) {
            return itemService.getItemsByType(type);
        }
        return itemService.getAllItems();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getItemById(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<Item> found = itemService.getItemById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        Item item = found.get();
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", item.getId()); result.put("title", item.getTitle());
        result.put("description", item.getDescription()); result.put("type", item.getType());
        result.put("location", item.getLocation()); result.put("imageUrl", item.getImageUrl());
        result.put("createdAt", item.getCreatedAt());
        if (authorization != null) {
            try {
                StudentUser user = authService.getUserFromToken(authorization);
                if (user.isAdmin() || user.getEmail().equals(item.getPostedBy())) result.put("contactInfo", item.getContactInfo());
            } catch (RuntimeException e) { return ResponseEntity.status(401).body(java.util.Map.of("message", "Sign in again.")); }
        }
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteItem(@PathVariable Long id,
                                             @RequestHeader("Authorization") String authorization) {
        try {
            StudentUser user = authService.getUserFromToken(authorization);
            Optional<Item> item = itemService.getItemById(id);
            if (item.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            if (!user.isAdmin() && !item.get().getPostedBy().equals(user.getEmail())) {
                return ResponseEntity.status(403).body("You do not have permission to delete this item.");
            }

            itemService.deleteItem(id);
            return ResponseEntity.ok("Item deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private boolean isCloudinaryUrl(String url) {
        try {
            java.net.URI value = java.net.URI.create(url);
            return "https".equalsIgnoreCase(value.getScheme()) && "res.cloudinary.com".equalsIgnoreCase(value.getHost());
        } catch (IllegalArgumentException e) { return false; }
    }
}

