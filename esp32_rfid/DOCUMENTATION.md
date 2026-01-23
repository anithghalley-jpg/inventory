# ESP32 RFID Integration Guide

## 1. Hardware Requirements
- **ESP32 Development Board** (e.g., ESP32-WROOM-32)
- **MFRC522 RFID Module** (RC522)
- Jumper Wires
- Breadboard (optional)

## 2. Circuit Diagram & Wiring
Connect the MFRC522 to the ESP32 as follows:

| MFRC522 Pin | ESP32 Pin | Function |
|-------------|-----------|----------|
| SDA (SS)    | GPIO 21   | SPI Chip Select |
| SCK         | GPIO 18   | SPI Clock |
| MOSI        | GPIO 23   | SPI MOSI |
| MISO        | GPIO 19   | SPI MISO |
| IRQ         | (Not Used)| |
| GND         | GND       | Ground |
| RST         | GPIO 22   | Reset |
| 3.3V        | 3.3V      | Power (WARNING: Do NOT use 5V) |

## 3. Libraries Installation
1.  Open Arduino IDE.
2.  Go to **Sketch** -> **Include Library** -> **Manage Libraries...**
3.  Search for **MFRC522**.
4.  Install the library by **Miguel Balboa** (Version 1.4.11 or later).

## 4. Google Apps Script Setup
1.  Open your Google Sheet.
2.  Go to **Extensions** -> **Apps Script**.
3.  Create a new script file and paste the content of `APPS_SCRIPT_RFID.gs`.
4.  **Save** the project.
5.  Click **Deploy** -> **New Deployment**.
6.  Select **Type**: Web App.
7.  **Description**: "RFID Integration".
8.  **Execute as**: Me.
9.  **Who has access**: **Anyone** (Critical: this allows ESP32 to access it without OAuth).
10. Click **Deploy**.
11. **Copy the Deployment ID** (The long string in the URL, usually between `/s/` and `/exec`).

## 5. ESP32 Firmware Setup
1.  Open `esp32_rfid/esp32_rfid.ino` in Arduino IDE.
2.  Update the following variables at the top of the file:
    ```cpp
    const char* WIFI_SSID = "YOUR_WIFI_SSID";
    const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
    const char* GOOGLE_SCRIPT_ID = "YOUR_DEPLOYMENT_ID_HERE";
    ```
3.  Select your Board (ESP32 Dev Module) and Port.
4.  Upload the code.

## 6. Testing
1.  Open the Serial Monitor (115200 baud).
2.  Reset the ESP32.
3.  Wait for "WiFi Connected" and "Online" status update.
4.  Check your Google Sheet: The `rfid_user` sheet cell **A1** should say **"Online"**.
5.  Scan an RFID card.
6.  Check the Serial Monitor for "Card Detected! UID: ...".
7.  Check your Google Sheet: A new row should appear in `rfid_user` with the timestamp and UID.
