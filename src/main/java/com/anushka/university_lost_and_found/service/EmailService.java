package com.anushka.university_lost_and_found.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.mail.from:}")
    private String fromMail;

    @Value("${app.mail.mock-mode:true}")
    private boolean mockMode;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean canSendRealMail() {
        return !mockMode
                && mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank()
                && fromMail != null && !fromMail.isBlank();
    }

    public void sendOtp(String email, String otpCode) {
        if (!canSendRealMail()) {
            throw new RuntimeException("SMTP is not configured. OTP is available in development mode only.");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setFrom(fromMail);
        message.setSubject("DIU Lost and Found OTP");
        message.setText("Your OTP is: " + otpCode + ". It will expire in 5 minutes.");
        mailSender.send(message);
    }
}
