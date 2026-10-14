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
@org.springframework.transaction.annotation.Transactional
public class AuthService {

    private static final Pattern DIU_EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@diu\\.edu\\.bd$");

    private final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    private final java.security.SecureRandom random = new java.security.SecureRandom();
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
        validatePassword(password);
        String normalizedEmail = normalize(email);
        if (fullName == null || fullName.isBlank() || fullName.length() > 120) throw new IllegalArgumentException("Enter your name.");
        if (studentUserRepository.findByEmail(normalizedEmail).isPresent()) throw new IllegalArgumentException("Account already exists. Sign in or reset your password.");
        requireMail();

        if (!isValidDiuEmail(normalizedEmail)) {
            response.put("message", "Enter a valid diu.edu.bd email address.");
            return response;
        }

        StudentUser user = new StudentUser();
        user.setFullName(fullName);
        user.setEmail(normalizedEmail);
        user.setPassword(encoder.encode(password));
        user.setVerified(false);
        user.setSessionToken(null);
        user.setOtpCode(generateRandomOtp());
        user.setOtpPurpose("register");
        user.setOtpAttempts(0);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        emailService.sendOtp(normalizedEmail, user.getOtpCode());
        studentUserRepository.save(user);
        response.put("message", "Registration started. Please check your email for the OTP.");
        return response;
    }

    private String generateRandomOtp() {
        return String.valueOf(random.nextInt(900000) + 100000);
    }

    @org.springframework.transaction.annotation.Transactional(noRollbackFor = IllegalArgumentException.class)
    public Map<String, String> verifyOtp(String email, String otp) {
        Map<String, String> response = new HashMap<>();
        Optional<StudentUser> optionalUser = studentUserRepository.findByEmail(normalize(email));

        if (optionalUser.isEmpty()) {
            response.put("message", "User not found.");
            return response;
        }

        StudentUser user = optionalUser.get();

        if (!validOtp(user, otp, "register")) {
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
        Optional<StudentUser> optionalUser = studentUserRepository.findByEmail(normalize(email));

        if (optionalUser.isEmpty()) {
            response.put("message", "User not found.");
            return response;
        }

        StudentUser user = optionalUser.get();

        if (!user.isVerified()) {
            response.put("message", "Please verify your email first.");
            return response;
        }

        if (!matches(password, user.getPassword())) {
            response.put("message", "Wrong password.");
            return response;
        }

        String token = UUID.randomUUID().toString();
        user.setSessionToken(token);
        user.setSessionExpiry(LocalDateTime.now().plusHours(12));
        user.setPassword(encoder.encode(password));
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
        if (profilePictureUrl != null) {
            if (!profilePictureUrl.isBlank()) {
                java.net.URI uri = java.net.URI.create(profilePictureUrl);
                if (!"https".equalsIgnoreCase(uri.getScheme()) || !"res.cloudinary.com".equalsIgnoreCase(uri.getHost()))
                    throw new IllegalArgumentException("Use a valid HTTPS Cloudinary image URL.");
            }
            user.setProfilePictureUrl(profilePictureUrl);
        }
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
        
        if (!matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Old password does not match.");
        }
        
        validatePassword(newPassword);
        user.setPassword(encoder.encode(newPassword));
        user.setSessionToken(null);
        user.setSessionExpiry(null);
        studentUserRepository.save(user);
        
        return Map.of("message", "Password changed successfully.");
    }

    public Map<String, String> forgotPassword(String email) {
        StudentUser user = studentUserRepository.findByEmail(normalize(email))
                .orElseThrow(() -> new RuntimeException("User not found."));
        
        requireMail();
        String otp = generateRandomOtp();
        user.setOtpPurpose("reset");
        user.setOtpAttempts(0);
        user.setOtpCode(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        studentUserRepository.save(user);
        
        emailService.sendOtp(user.getEmail(), otp);
        
        return Map.of("message", "OTP sent to your email.");
    }

    @org.springframework.transaction.annotation.Transactional(noRollbackFor = IllegalArgumentException.class)
    public Map<String, String> resetPassword(String email, String otp, String newPassword) {
        StudentUser user = studentUserRepository.findByEmail(normalize(email))
                .orElseThrow(() -> new RuntimeException("User not found."));
        
        if (!validOtp(user, otp, "reset")) {
            throw new IllegalArgumentException("Invalid or expired OTP.");
        }
        
        validatePassword(newPassword);
        user.setPassword(encoder.encode(newPassword));
        user.setSessionToken(null);
        user.setSessionExpiry(null);
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        studentUserRepository.save(user);
        
        return Map.of("message", "Password reset successfully.");
    }

    public Map<String, String> logout(String header) {
        StudentUser user = getUserFromToken(header);
        user.setSessionToken(null); user.setSessionExpiry(null); studentUserRepository.save(user);
        return Map.of("message", "Signed out.");
    }

    public StudentUser getUserFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Login required.");
        }

        String token = authHeader.substring(7);
        return studentUserRepository.findBySessionToken(token)
                .filter(StudentUser::isVerified)
                .filter(u -> u.getSessionExpiry() != null && u.getSessionExpiry().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new RuntimeException("Invalid session."));
    }

    private String normalize(String email) {
        if (email == null) throw new IllegalArgumentException("Email is required.");
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }
    private void validatePassword(String password) {
        if (password == null || password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("Password must be 8 to 72 UTF-8 bytes.");
    }
    private void requireMail() {
        if (!emailService.canSendRealMail()) throw new IllegalStateException("Email service is unavailable. Contact the administrator.");
    }
    private boolean validOtp(StudentUser user, String otp, String purpose) {
        if (!purpose.equals(user.getOtpPurpose()) || user.getOtpCode() == null || user.getOtpExpiry() == null
                || !user.getOtpExpiry().isAfter(LocalDateTime.now()) || user.getOtpAttempts() >= 5) return false;
        user.setOtpAttempts(user.getOtpAttempts() + 1);
        studentUserRepository.save(user);
        return otp != null && MessageDigest.isEqual(user.getOtpCode().getBytes(StandardCharsets.UTF_8), otp.trim().getBytes(StandardCharsets.UTF_8));
    }
    private boolean matches(String password, String stored) {
        if (password == null || stored == null || password.getBytes(StandardCharsets.UTF_8).length > 72) return false;
        if (stored.startsWith("$2")) return encoder.matches(password, stored);
        // Upgrade historical SHA-256 accounts only after a successful login.
        if (!stored.matches("[a-f0-9]{64}")) return false;
        try {
            String legacy = java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(password.getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(legacy.getBytes(StandardCharsets.UTF_8), stored.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException("Password processing unavailable."); }
    }
    private boolean isValidDiuEmail(String email) {
        return email != null && DIU_EMAIL_PATTERN.matcher(email).matches();
    }
}
