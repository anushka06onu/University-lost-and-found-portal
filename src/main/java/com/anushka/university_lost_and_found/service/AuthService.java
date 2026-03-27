package com.anushka.university_lost_and_found.service;

import com.anushka.university_lost_and_found.model.StudentUser;
import com.anushka.university_lost_and_found.repository.StudentUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern DIU_EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@diu\\.edu\\.bd$");

    private final StudentUserRepository studentUserRepository;
    private final EmailService emailService;

    @Value("${app.otp.expiry-minutes:5}")
    private long otpExpiryMinutes;

    public AuthService(StudentUserRepository studentUserRepository,
                       EmailService emailService) {
        this.studentUserRepository = studentUserRepository;
        this.emailService = emailService;
    }

    public Map<String, Object> register(String fullName, String email, String password) {
        Map<String, Object> response = new HashMap<>();
        String normalizedEmail = email.trim().toLowerCase();

        if (!isValidDiuEmail(normalizedEmail)) {
            response.put("message", "Enter a valid diu.edu.bd email address.");
            return response;
        }

        StudentUser user = studentUserRepository.findByEmail(normalizedEmail).orElseGet(StudentUser::new);
        user.setFullName(fullName);
        user.setEmail(normalizedEmail);
        user.setPassword(hashPassword(password));
        user.setVerified(false);
        user.setSessionToken(null);
        user.setOtpCode("123456");
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        studentUserRepository.save(user);

        response.put("message", "Registration started. Use OTP 123456 to verify.");
        response.put("devOtp", user.getOtpCode());
        return response;
    }

    public Map<String, String> verifyOtp(String email, String otp) {
        Map<String, String> response = new HashMap<>();
        Optional<StudentUser> optionalUser = studentUserRepository.findByEmail(email.trim().toLowerCase());

        if (optionalUser.isEmpty()) {
            response.put("message", "User not found.");
            return response;
        }

        StudentUser user = optionalUser.get();

        if (user.getOtpCode() == null || !user.getOtpCode().equals(otp.trim())) {
            response.put("message", "Invalid OTP.");
            return response;
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            response.put("message", "OTP expired. Register again.");
            return response;
        }

        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        studentUserRepository.save(user);
        response.put("message", "Registration completed. Please login.");
        return response;
    }

    public Map<String, Object> login(String email, String password) {
        Map<String, Object> response = new HashMap<>();
        Optional<StudentUser> optionalUser = studentUserRepository.findByEmail(email.trim().toLowerCase());

        if (optionalUser.isEmpty()) {
            response.put("message", "User not found.");
            return response;
        }

        StudentUser user = optionalUser.get();

        if (!user.isVerified()) {
            response.put("message", "Please verify your email first.");
            return response;
        }

        if (!hashPassword(password).equals(user.getPassword())) {
            response.put("message", "Wrong password.");
            return response;
        }

        String token = UUID.randomUUID().toString();
        user.setSessionToken(token);
        studentUserRepository.save(user);

        response.put("message", "Login successful.");
        response.put("token", token);
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        return response;
    }

    public StudentUser getUserFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Login required.");
        }

        String token = authHeader.substring(7);
        return studentUserRepository.findBySessionToken(token)
                .filter(StudentUser::isVerified)
                .orElseThrow(() -> new RuntimeException("Invalid session."));
    }

    private String hashPassword(String password) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            byte[] hash = messageDigest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();

            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }

            return builder.toString();
        } catch (Exception e) {
            throw new RuntimeException("Could not process password.");
        }
    }

    private boolean isValidDiuEmail(String email) {
        return email != null && DIU_EMAIL_PATTERN.matcher(email).matches();
    }
}
