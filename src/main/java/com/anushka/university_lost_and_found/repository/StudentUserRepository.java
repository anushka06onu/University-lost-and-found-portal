package com.anushka.university_lost_and_found.repository;

import com.anushka.university_lost_and_found.model.StudentUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudentUserRepository extends JpaRepository<StudentUser, Long> {
    Optional<StudentUser> findByEmail(String email);
    Optional<StudentUser> findBySessionToken(String sessionToken);
}
