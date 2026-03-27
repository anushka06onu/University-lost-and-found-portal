package com.anushka.university_lost_and_found.repository;

import com.anushka.university_lost_and_found.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {
    List<Item> findByTypeIgnoreCase(String type);
}
