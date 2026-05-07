package com.anushka.university_lost_and_found.config;

import com.anushka.university_lost_and_found.model.Item;
import com.anushka.university_lost_and_found.model.StudentUser;
import com.anushka.university_lost_and_found.repository.ItemRepository;
import com.anushka.university_lost_and_found.repository.StudentUserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DataInitializer {

    private final ItemRepository itemRepository;
    private final StudentUserRepository userRepository;

    public DataInitializer(ItemRepository itemRepository, StudentUserRepository userRepository) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void init() {
        if (itemRepository.count() == 0) {
            // Create a dummy user
            StudentUser admin = new StudentUser();
            admin.setFullName("System Admin");
            admin.setEmail("admin@diu.edu.bd");
            admin.setVerified(true);
            admin.setPassword("admin123"); 
            admin.setIsAdmin(true);
            admin.setProfilePictureUrl("https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg");
            userRepository.save(admin);

            // Add dummy items with realistic DIU context and high-quality sample images
            Item item1 = new Item();
            item1.setTitle("DIU Student ID Card");
            item1.setType("found");
            item1.setDescription("Found a student ID card near the Knowledge Tower entrance. Name: Tanvir Rahman, Dept: CSE.");
            item1.setLocation("Knowledge Tower, Level 0");
            item1.setContactInfo("017XXXXXXXX");
            item1.setPostedBy(admin.getEmail());
            item1.setImageUrl(null);

            Item item2 = new Item();
            item2.setTitle("Casio Scientific Calculator");
            item2.setType("lost");
            item2.setDescription("Lost my Casio fx-991EX calculator in Building 4, Lab 502 during the morning shift.");
            item2.setLocation("Building 4, Room 502");
            item2.setContactInfo("018XXXXXXXX");
            item2.setPostedBy(admin.getEmail());
            item2.setImageUrl(null);

            Item item3 = new Item();
            item3.setTitle("Dell 65W Laptop Charger");
            item3.setType("found");
            item3.setDescription("Found a black laptop charger plugged in at the Library reading zone.");
            item3.setLocation("Library, Main Building");
            item3.setContactInfo("019XXXXXXXX");
            item3.setPostedBy(admin.getEmail());
            item3.setImageUrl(null);

            Item item4 = new Item();
            item4.setTitle("Blue Milton Water Bottle");
            item4.setType("lost");
            item4.setDescription("Lost a blue water bottle near the basketball court area.");
            item4.setLocation("Sports Zone, DSC");
            item4.setContactInfo("016XXXXXXXX");
            item4.setPostedBy(admin.getEmail());
            item4.setImageUrl(null);

            Item item5 = new Item();
            item5.setTitle("House Keys with Keychain");
            item5.setType("found");
            item5.setDescription("Found a bunch of keys with a 'Super Mario' keychain in the Cafeteria.");
            item5.setLocation("Main Cafeteria, Level 1");
            item5.setContactInfo("015XXXXXXXX");
            item5.setPostedBy(admin.getEmail());
            item5.setImageUrl(null);

            itemRepository.saveAll(List.of(item1, item2, item3, item4, item5));
        }
    }
}
