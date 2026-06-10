/**
 * ESP32 + MFRC522 RFID + I2C 16x2 LCD to Google Sheets
 * 
 * Scans RFID cards, checks student lookup and visitor status (Welcome in / Good Bye)
 * from Google Sheets, and prints details on the 16x2 LCD in real-time.
 * 
 * Hardware Connections:
 * -----------------------------------------------------------------------------
 * MFRC522 Pin  | ESP32 Pin  | Notes
 * -------------|------------|--------------------------------------------------
 * 3.3V         | 3.3V       | MUST be 3.3V (5V will damage RC522)
 * RST (Reset)  | GPIO 4     | Changed from 22 to avoid conflict with I2C SCL (22)
 * GND          | GND        | Ground
 * MISO         | GPIO 19    | Standard ESP32 VSPI MISO
 * MOSI         | GPIO 23    | Standard ESP32 VSPI MOSI
 * SCK          | GPIO 18    | Standard ESP32 VSPI SCK
 * SDA (SS)     | GPIO 5     | Chip Select
 * 
 * I2C LCD Pin  | ESP32 Pin  | Notes
 * -------------|------------|--------------------------------------------------
 * VCC          | 5V / VIN   | Most 16x2 LCDs require 5V for backlight contrast
 * GND          | GND        | Ground
 * SDA          | GPIO 21    | Standard ESP32 I2C SDA
 * SCL          | GPIO 22    | Standard ESP32 I2C SCL
 * -----------------------------------------------------------------------------
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// Wi-Fi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Google Apps Script Web App URL
const char* googleScriptUrl = "https://script.google.com/macros/s/YOUR_SCRIPT_DEPLOYMENT_ID/exec";

// Pins
#define RST_PIN  4
#define SS_PIN   5

// LED Pins (Red shows locked, Green shows open)
#define RED_LED_PIN   25
#define GREEN_LED_PIN 26

// Unique Device ID (This device is for the main door)
const String deviceId = "Main_Door_Scanner";

// LCD configuration: I2C Address 0x27, 16 columns, 2 rows
// (Note: If your LCD does not display text, try address 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 mfrc522(SS_PIN, RST_PIN);

unsigned long lastScanTime = 0;
const unsigned long scanDelay = 4000; // Delay to avoid rapid-fire scans (4 seconds)

void setup() {
  Serial.begin(115200);
  while (!Serial);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  showLcdStatus("System Starting", "Initializing...");

  // Initialize SPI & MFRC522
  SPI.begin();
  mfrc522.PCD_Init();
  
  Serial.println("--- RFID Reader Initialized ---");
  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  Serial.print("MFRC522 register version: 0x");
  Serial.println(version, HEX);
  
  if (version == 0x00 || version == 0xFF) {
    Serial.println("❌ WARNING: Communication with MFRC522 failed!");
    showLcdStatus("Sensor Error", "Check RC522 Pins");
    delay(3000);
  } else {
    Serial.println("✅ MFRC522 communication established successfully!");
  }

  // Initialize LEDs
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  digitalWrite(RED_LED_PIN, HIGH);  // Red LED starts ON (locked)
  digitalWrite(GREEN_LED_PIN, LOW); // Green LED starts OFF (closed)

  // Initialize Serial2 for communicating with Arduino Uno
  // Default pins: TX2 = GPIO 17, RX2 = GPIO 16
  Serial2.begin(9600);
  Serial.println("--- Serial2 (to Arduino Uno) Initialized at 9600 baud ---");

  // Connect to Wi-Fi
  connectWiFi();
  showIdleScreen();
}

void loop() {
  // Reconnect Wi-Fi if connection is lost
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    showIdleScreen();
  }

  // Look for new RFID cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Read card serial number
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Enforce scan delay to avoid double scans
  if (millis() - lastScanTime < scanDelay) {
    mfrc522.PICC_HaltA();
    return;
  }

  // Extract UID as Hex string
  String tagUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      tagUid += "0";
    }
    tagUid += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) {
      tagUid += " ";
    }
  }
  tagUid.toUpperCase();

  Serial.println("\n----------------------------------------");
  Serial.println("🎴 Card Scanned: " + tagUid);
  
  lastScanTime = millis();

  // Show status on LCD
  showLcdStatus("Card Scanned", "Checking Server...");

  // Send payload to Google Sheets & display response status (handles LEDs/Relay)
  sendRfidScanToGoogleSheets(tagUid);

  // Halt PICC
  mfrc522.PICC_HaltA();
  
  // Return to idle screen
  showIdleScreen();
}

void connectWiFi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);
  
  showLcdStatus("WiFi Connecting", "Please wait...");
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Connected to Wi-Fi!");
    showLcdStatus("WiFi Connected!", WiFi.localIP().toString().c_str());
    delay(1500);
  } else {
    Serial.println("\n❌ Failed to connect to Wi-Fi.");
    showLcdStatus("WiFi Failed", "Retrying...");
    delay(2000);
  }
}

void sendRfidScanToGoogleSheets(String tagUid) {
  WiFiClientSecure client;
  client.setInsecure(); // Bypass SSL verification for simpler setup

  HTTPClient http;
  
  if (http.begin(client, googleScriptUrl)) {
    // Disable automatic redirect following so we can handle it manually without header leakage
    http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
    
    // Set connection timeout to 15 seconds to handle slow network responses or Sheets execution latency
    http.setTimeout(15000);
    
    // Configure headers to monitor the Location header
    const char * headerKeys[] = {"Location"};
    http.collectHeaders(headerKeys, 1);
    
    // Explicitly add 'Connection: close' to disable keep-alive, preventing socket pool exhaustion or stale reuses
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Connection", "close");

    // JSON payload Construction
    String jsonPayload = "{\"action\":\"logRfidScan\",\"tagUid\":\"" + tagUid + "\",\"deviceId\":\"" + deviceId + "\"}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    Serial.print("Initial POST Response Code: ");
    Serial.println(httpResponseCode);
    
    // Handle Google's 302 Redirect manually to avoid HTTP 400 Bad Request
    if (httpResponseCode == 302 || httpResponseCode == 301 || httpResponseCode == 307) {
      if (http.hasHeader("Location")) {
        String redirectUrl = http.header("Location");
        Serial.println("Redirect URL: " + redirectUrl);
        
        // Terminate POST connection cleanly
        http.end();
        
        // Start a fresh, clean GET request (clearing previous POST headers)
        if (http.begin(client, redirectUrl)) {
          http.setTimeout(15000);
          http.addHeader("Connection", "close");
          httpResponseCode = http.GET();
          Serial.print("Redirect GET Response Code: ");
          Serial.println(httpResponseCode);
        } else {
          Serial.println("Failed to connect to redirect URL");
          showLcdStatus("Redirect Error", "Conn Failed");
          delay(3000);
          client.stop();
          return;
        }
      } else {
        Serial.println("Error: Redirected but no Location header found.");
        showLcdStatus("Redirect Error", "No Loc Header");
        delay(3000);
      }
    }
    
    if (httpResponseCode == 200) {
      String response = http.getString();
      response.trim();
      Serial.println("Response: " + response);
      
      // If the response is HTML, it means Google returned a login/warning page instead of the JSON
      if (response.startsWith("<") || response.startsWith("<!")) {
        Serial.println("❌ Error: Received HTML instead of JSON.");
        Serial.println("This usually means: ");
        Serial.println("1. You need to deploy the Apps Script as a Web App with access 'Anyone' (not 'Myself').");
        Serial.println("2. The Web App URL is incorrect or points to the Sheet edit URL instead of the /exec URL.");
        showLcdStatus("Redirect Error", "Check Serial Log");
        delay(3000);
        http.end();
        client.stop();
        return;
      }
      
      // Parse JSON response
      JsonDocument doc;
      DeserializationError error = deserializeJson(doc, response);
      
      if (!error) {
        bool success = doc["success"] | false;
        bool allowed = doc["allowed"] | false;
        String name = doc["name"] | "Unknown User";
        String status = doc["status"] | "Welcome in";
        String role = doc["role"] | "None";
        
        if (success && allowed) {
          Serial.println("✅ Access GRANTED for " + name + " (Role: " + role + ")");
          
          // Display checkout/checkin status & User Name on LCD
          showLcdStatus(status.c_str(), name.substring(0, 16).c_str());
          
          // Trigger LEDs: Red OFF, Green ON
          digitalWrite(RED_LED_PIN, LOW);
          digitalWrite(GREEN_LED_PIN, HIGH);
          
          // Send unlock command to Arduino Uno
          Serial2.println("OPEN");
          Serial.println("Sent 'OPEN' command to Arduino Uno over Serial2.");
          
          // Hold open state for 3 seconds
          delay(3000);
          
          // Reset LEDs: Red ON, Green OFF
          digitalWrite(GREEN_LED_PIN, LOW);
          digitalWrite(RED_LED_PIN, HIGH);
        } else {
          Serial.println("❌ Access DENIED for " + name + " (Role: " + role + ")");
          
          // Display Access Denied on LCD
          showLcdStatus("Access Denied", name.substring(0, 16).c_str());
          
          // Flash Red LED to indicate rejection
          for (int i = 0; i < 3; i++) {
            digitalWrite(RED_LED_PIN, LOW);
            delay(200);
            digitalWrite(RED_LED_PIN, HIGH);
            delay(200);
          }
          
          // Wait to hold the message on screen (1.8 seconds)
          delay(1800);
        }
      } else {
        Serial.println("JSON parse failed: " + String(error.c_str()));
        showLcdStatus("Scan Logged", "Parse Error");
        delay(3000);
      }
    } else {
      Serial.println("HTTP request failed: " + http.errorToString(httpResponseCode));
      showLcdStatus("Network Error", ("Code: " + String(httpResponseCode)).c_str());
      delay(3000);
    }
    http.end();
    client.stop(); // Cleanly close socket and release resources
  } else {
    showLcdStatus("Server Error", "Endpoint Offline");
    delay(3000);
  }
}

void showLcdStatus(const char* line1, const char* line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

void showIdleScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Main Door Access");
  lcd.setCursor(0, 1);
  lcd.print("Scan RFID Card...");
}
