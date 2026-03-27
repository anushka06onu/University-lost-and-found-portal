# University Lost and Found Portal

This is a simple Spring Boot project for a university lost and found system.  
It allows users to register, login, post lost or found items, view records, search items, and contact the support desk.

## Features

- register and login
- OTP verification
- add lost item or found item
- view all items
- filter items by type
- search item by id
- delete item
- add image using Cloudinary link
- contact desk page
- light and dark mode

## Technology Used

- Java
- Spring Boot
- Spring Web
- Spring Data JPA
- MySQL
- HTML
- CSS
- JavaScript

## Project Structure

- `controller`
- `service`
- `repository`
- `model`

## Database

This project uses MySQL database.

Set these environment variables before running:

```bash
export DB_USERNAME=your_mysql_username
export DB_PASSWORD=your_mysql_password
```

Optional mail configuration:

```bash
export MAIL_USERNAME=your_mail_username
export MAIL_PASSWORD=your_mail_password
export MAIL_FROM=your_mail_address
```

## How to Run

```bash
./mvnw spring-boot:run
```

Then open:

- `http://localhost:8080`
- `http://localhost:8080/contact.html`

## Deploy on Render

This project is prepared for Render deployment with the included `render.yaml` file.

On Render, create a new Web Service from this GitHub repository and set these environment variables:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `MAIL_USERNAME` optional
- `MAIL_PASSWORD` optional
- `MAIL_FROM` optional

Build command:

```bash
./mvnw clean package -DskipTests
```

Start command:

```bash
java -jar target/university-lost-and-found-portal-0.0.1-SNAPSHOT.jar
```

## Note

- OTP is fixed for development
- image link should be a Cloudinary URL
