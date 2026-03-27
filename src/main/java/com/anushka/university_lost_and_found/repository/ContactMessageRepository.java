package com.anushka.university_lost_and_found.repository;

import com.anushka.university_lost_and_found.model.ContactMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {
}
