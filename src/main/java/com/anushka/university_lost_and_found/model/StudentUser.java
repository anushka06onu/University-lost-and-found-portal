package com.anushka.university_lost_and_found.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDateTime;

@Entity
public class StudentUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;
    @jakarta.persistence.Column(unique = true)
    private String email;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String password;
    private boolean verified;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String otpCode;
    private LocalDateTime otpExpiry;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String sessionToken;
    private LocalDateTime sessionExpiry;
    private String otpPurpose;
    private int otpAttempts;
    public LocalDateTime getSessionExpiry() { return sessionExpiry; }
    public void setSessionExpiry(LocalDateTime value) { sessionExpiry = value; }
    public String getOtpPurpose() { return otpPurpose; }
    public void setOtpPurpose(String value) { otpPurpose = value; }
    public int getOtpAttempts() { return otpAttempts; }
    public void setOtpAttempts(int value) { otpAttempts = value; }
    private String profilePictureUrl;
    private boolean isAdmin;

    public StudentUser() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public String getOtpCode() {
        return otpCode;
    }

    public void setOtpCode(String otpCode) {
        this.otpCode = otpCode;
    }

    public LocalDateTime getOtpExpiry() {
        return otpExpiry;
    }

    public void setOtpExpiry(LocalDateTime otpExpiry) {
        this.otpExpiry = otpExpiry;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public String getProfilePictureUrl() {
        return profilePictureUrl;
    }

    public void setProfilePictureUrl(String profilePictureUrl) {
        this.profilePictureUrl = profilePictureUrl;
    }

    public boolean isAdmin() {
        return isAdmin;
    }

    public void setIsAdmin(boolean admin) {
        isAdmin = admin;
    }
}

