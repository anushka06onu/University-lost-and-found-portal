package com.anushka.university_lost_and_found.service;

import com.anushka.university_lost_and_found.model.StudentUser;
import com.anushka.university_lost_and_found.repository.StudentUserRepository;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    final StudentUserRepository repo = mock(StudentUserRepository.class);
    final EmailService mail = mock(EmailService.class);
    final AuthService auth = new AuthService(repo, mail);
    @Test void registrationDoesNotOverwriteExistingAccount() {
        StudentUser existing = new StudentUser(); existing.setPassword("original");
        when(repo.findByEmail("student@diu.edu.bd")).thenReturn(Optional.of(existing));
        assertThrows(IllegalArgumentException.class, () -> auth.register("Student", "student@diu.edu.bd", "password123"));
        assertEquals("original", existing.getPassword()); verify(repo, never()).save(any());
    }
    @Test void missingMailDoesNotCreateAccountOrRevealOtp() {
        when(repo.findByEmail(anyString())).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> auth.register("Student", "student@diu.edu.bd", "password123"));
        verify(repo, never()).save(any());
    }
    @Test void expiredSessionsAreRejected() {
        StudentUser u = new StudentUser(); u.setVerified(true); u.setSessionExpiry(LocalDateTime.now().minusMinutes(1));
        when(repo.findBySessionToken("token")).thenReturn(Optional.of(u));
        assertThrows(RuntimeException.class, () -> auth.getUserFromToken("Bearer token"));
    }
    @Test void resetCodeCannotVerifyAnAccount() {
        StudentUser u = new StudentUser(); u.setOtpPurpose("reset"); u.setOtpCode("123456"); u.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        when(repo.findByEmail(anyString())).thenReturn(Optional.of(u));
        assertEquals("Invalid OTP.", auth.verifyOtp("student@diu.edu.bd", "123456").get("message"));
        assertFalse(u.isVerified());
    }
    @Test void exhaustedCodeCannotResetPassword() {
        StudentUser u = new StudentUser(); u.setOtpPurpose("reset"); u.setOtpCode("123456"); u.setOtpAttempts(5); u.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        when(repo.findByEmail(anyString())).thenReturn(Optional.of(u));
        assertThrows(IllegalArgumentException.class, () -> auth.resetPassword("student@diu.edu.bd", "123456", "newpassword"));
    }
}
