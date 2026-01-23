/*
 * ESP32 + RC522 RFID Scanner for Google Sheets Inventory System
 * 
 * Hardware:
 * - ESP32 WROOM-32
 * - MFRC522 RFID Module
 * 
 * Libraries Required:
 * - MFRC522 by Miguel Balboa
 * 
 * Instructions:
 * 1. Install MFRC522 library via Arduino Library Manager
 * 2. Update WIFI_SSID, WIFI_PASSWORD, and GOOGLE_SCRIPT_ID below
 * 3. Wiring:
 *    ESP32 Pin    MFRC522 Pin
 *    GPIO 21      SDA (SS)
 *    GPIO 22      RST
 *    GPIO 18      SCK
 *    GPIO 23      MOSI
 *    GPIO 19      MISO
 *    GND          GND
 *    3.3V         3.3V
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// ================= CONFIGURATION =================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Replace with your Deployment ID (from Apps Script -> Deploy -> Web App)
const char* GOOGLE_SCRIPT_ID = "YOUR_SCRIPT_ID_HERE";
// =================================================

// MFRC522 Wiring (SPI)
#define SS_PIN  21  // SDA
#define RST_PIN 22  // RST

MFRC522 rfid(SS_PIN, RST_PIN);

// HTTPS endpoint for Google Apps Script
String serverUrl = String("https://script.google.com/macros/s/") + GOOGLE_SCRIPT_ID + "/exec";

// Global variables
bool isOnline = false;

void setup() {
  Serial.begin(115200);
  
  // Initialize SPI & RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Connect to WiFi
  connectWiFi();
  
  // Initial Status Update
  if (WiFi.status() == WL_CONNECTED) {
    updateStatus("Online");
  }
}

void loop() {
  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, trying to reconnect...");
    connectWiFi();
  }

  // Check for RFID Card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Read UID
  String uidString = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uidString += (rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    uidString += String(rfid.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();

  Serial.print("Card Detected! UID: ");
  Serial.println(uidString);

  // Send to Google Sheet
  sendRFIDScan(uidString);

  // Halt PICC to prevent re-reading same card instantly
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  // Small delay for user feedback/debounce
  delay(1000);
}

// Helper: Connect to WiFi
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  Serial.print("Connecting to WiFi");
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection Failed.");
  }
}

// Helper: Send Status Update
void updateStatus(String status) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  // JSON payload
  String payload = "{\"action\": \"updateESPStatus\", \"status\": \"" + status + "\"}";
  sendPostRequest(payload);
}

// Helper: Send RFID Scan
void sendRFIDScan(String uid) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  // JSON payload
  String payload = "{\"action\": \"rfidScan\", \"uid\": \"" + uid + "\"}";
  sendPostRequest(payload);
}

// Helper: Secure POST Request (Handling Redirects)
void sendPostRequest(String payload) {
  HTTPClient http;
  
  // Apps Script often redirects (302) to content server
  // method 1: setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS)
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  
  Serial.println("Sending POST: " + payload);
  
  http.begin(serverUrl); 
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    Serial.print("Response Code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println("Response: " + response);
  } else {
    Serial.print("Error on sending POST: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
