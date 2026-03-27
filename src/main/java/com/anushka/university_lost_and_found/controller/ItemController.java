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
    public ResponseEntity<Item> getItemById(@PathVariable Long id) {
        Optional<Item> item = itemService.getItemById(id);
        return item.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteItem(@PathVariable Long id,
                                             @RequestHeader("Authorization") String authorization) {
        try {
            authService.getUserFromToken(authorization);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        Optional<Item> item = itemService.getItemById(id);
        if (item.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        itemService.deleteItem(id);
        return ResponseEntity.ok("Item deleted successfully");
    }

    private boolean isCloudinaryUrl(String url) {
        String value = url.toLowerCase();
        return value.startsWith("http://") || value.startsWith("https://")
            ? value.contains("cloudinary.com")
            : false;
    }
}
