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
        user.setOtpCode(generateRandomOtp());
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        studentUserRepository.save(user);

        response.put("message", "Registration started. Please check your email for the OTP.");
        response.put("devOtp", user.getOtpCode());
        return response;
    }

    private String generateRandomOtp() {
        return String.valueOf((int) (Math.random() * 900000) + 100000);
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
        response.put("isAdmin", user.isAdmin());
        return response;
    }

    public Map<String, Object> updateProfile(String authHeader, String fullName, String profilePictureUrl) {
        StudentUser user = getUserFromToken(authHeader);
        if (fullName != null) user.setFullName(fullName);
        if (profilePictureUrl != null) user.setProfilePictureUrl(profilePictureUrl);
        studentUserRepository.save(user);
        
        return Map.of(
            "message", "Profile updated successfully.",
            "fullName", user.getFullName(),
            "profilePictureUrl", user.getProfilePictureUrl() != null ? user.getProfilePictureUrl() : "",
            "isAdmin", user.isAdmin()
        );
    }

    public Map<String, Object> changePassword(String authHeader, String oldPassword, String newPassword) {
        StudentUser user = getUserFromToken(authHeader);
        
        if (!hashPassword(oldPassword).equals(user.getPassword())) {
            throw new RuntimeException("Old password does not match.");
        }
        
        user.setPassword(hashPassword(newPassword));
        studentUserRepository.save(user);
        
        return Map.of("message", "Password changed successfully.");
    }

    public Map<String, String> forgotPassword(String email) {
        StudentUser user = studentUserRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));
        
        String otp = generateRandomOtp();
        user.setOtpCode(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        studentUserRepository.save(user);
        
        // In a real app, send the email here
        System.out.println("Forgot Password OTP for " + email + ": " + otp);
        
        return Map.of("message", "OTP sent to your email.", "devOtp", otp);
    }

    public Map<String, String> resetPassword(String email, String otp, String newPassword) {
        StudentUser user = studentUserRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));
        
        if (user.getOtpCode() == null || !user.getOtpCode().equals(otp) || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Invalid or expired OTP.");
        }
        
        user.setPassword(hashPassword(newPassword));
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        studentUserRepository.save(user);
        
        return Map.of("message", "Password reset successfully.");
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
