# ESP32 + Arduino Uno RFID Door Lock Controller Setup Guide

This guide provides instructions to connect an **ESP32 WROOM 32E** to an **MFRC522 RFID Reader**, an **I2C 16x2 LCD Display**, and two **Status LEDs**, interfacing with an **Arduino Uno** to control a door lock relay. The system verifies access permission in real-time from Google Sheets using Google Apps Script (only users with the `admin` or `team` roles are allowed to unlock the door).

---

## 1. Hardware Architecture & Wiring

The system uses two microcontrollers to separate concerns:
1. **ESP32**: Handles Wi-Fi, HTTP client, Google Sheets API querying, JSON parsing, LCD display updates, RFID tag reading, and status LED indicator toggles.
2. **Arduino Uno**: Receives serial triggers from the ESP32 and directly controls the lock relay (active-high or active-low).

> [!WARNING]
> **Logic Level Voltage Difference (Crucial)**:
> - The **ESP32** runs on **3.3V logic** (GPIO pins are not 5V tolerant).
> - The **Arduino Uno** runs on **5V logic**.
> - **ESP32 TX (GPIO 17) -> Arduino RX (Pin 2)**: Direct connection is safe, as 3.3V is high enough to trigger a logical HIGH (>3.0V) on the Arduino.
> - **Arduino TX (Pin 3) -> ESP32 RX (GPIO 16)**: **UNSAFE**. Applying 5V directly to GPIO 16 can burn out the ESP32. You **MUST** use a logic level shifter or a resistor voltage divider.
> - **Voltage Divider Circuit**:
>   ```
>   Arduino Pin 3 (TX) --- [ 1kΩ Resistor ] --- Node A --- [ 2kΩ Resistor ] --- GND
>                                                |
>                                         ESP32 GPIO 16 (RX2)
>   ```
>   This drops the 5V signal down to approximately `5V * (2000 / (1000 + 2000)) = 3.33V`.
> - **Common Ground**: Ensure you connect a **GND pin on the ESP32** to a **GND pin on the Arduino Uno**. Serial communication will fail or behave erratically without a common ground reference.

---

### Wiring Reference Tables

#### A. ESP32 to MFRC522 (RFID) Wiring
*The MFRC522 runs strictly on 3.3V.*

| MFRC522 Pin | ESP32 Pin | Purpose |
| :--- | :--- | :--- |
| **3.3V** | **3.3V** | Power |
| **RST (Reset)** | **GPIO 4** | Reset Line |
| **GND** | **GND** | Ground |
| **MISO** | **GPIO 19** | SPI Master In Slave Out |
| **MOSI** | **GPIO 23** | SPI Master Out Slave In |
| **SCK** | **GPIO 18** | SPI Serial Clock |
| **SDA / SS** | **GPIO 5** | SPI Chip Select |

#### B. ESP32 to 16x2 I2C LCD Wiring
*The LCD typically requires 5V for backlight contrast.*

| LCD Pin | ESP32 Pin | Purpose |
| :--- | :--- | :--- |
| **VCC** | **VIN / 5V** | Power (5V) |
| **GND** | **GND** | Ground |
| **SDA** | **GPIO 21** | I2C Data Line |
| **SCL** | **GPIO 22** | I2C Clock Line |

#### C. ESP32 Status LEDs
*Connect LEDs in series with a 220Ω - 330Ω resistor to ground.*

| LED Color | ESP32 Pin | Purpose |
| :--- | :--- | :--- |
| **Red LED** | **GPIO 25** | ON indicates Door is Locked |
| **Green LED** | **GPIO 26** | ON indicates Door is Open / Unlocked |

#### D. ESP32 to Arduino Uno Serial Wiring
*Refer to the voltage divider warning above.*

| ESP32 Pin | Arduino Pin | Logic Level | Connection Details |
| :--- | :--- | :--- | :--- |
| **GPIO 17 (TX2)** | **Pin 2 (RX)** | 3.3V -> 5V | Direct wire connection |
| **GPIO 16 (RX2)** | **Pin 3 (TX)** | 5V -> 3.3V | **Through Voltage Divider Node** |
| **GND** | **GND** | Reference | Direct wire connection (Common Ground) |

#### E. Arduino Uno to Relay Wiring

| Relay Pin | Arduino Pin | Purpose |
| :--- | :--- | :--- |
| **VCC / +** | **5V** | Power (5V) |
| **GND / -** | **GND** | Ground |
| **IN / SIG** | **Pin 7** | Lock Unlock Trigger |

---

## 2. Software Requirements (Arduino IDE Setup)

To compile and upload the firmware code:

1. **Install ESP32 Board Support**:
   - In Arduino IDE, go to **File > Preferences**.
   - Add this URL to the *Additional Boards Manager URLs* list:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Go to **Tools > Board > Boards Manager...**, search for **esp32** and click install.

2. **Install Libraries**:
   - Go to **Sketch > Include Library > Manage Libraries...**.
   - Search for and install the following libraries:
     1. **MFRC522** (by Miguel Balboa)
     2. **LiquidCrystal I2C** (by Frank de Brabander)
     3. **ArduinoJson** (by Benoit Blanchon)

---

## 3. Code Modifications & Deployment

### Step A: Upload Arduino Uno Code
1. Open [arduino_lock_control.ino](file:///Users/dgi/Documents/inventory_management/esp32_rfid/arduino_lock_control/arduino_lock_control.ino) in the Arduino IDE.
2. Select your board (**Tools > Board > Arduino AVR Boards > Arduino Uno**).
3. Connect your Uno via USB, select the correct Port (**Tools > Port**), and click **Upload**.
4. Set `RELAY_ACTIVE_LOW` to `false` in the sketch if your relay board activates on a HIGH signal.

### Step B: Upload ESP32 Code
1. Open [esp32_rfid.ino](file:///Users/dgi/Documents/inventory_management/esp32_rfid/esp32_rfid.ino) in the Arduino IDE.
2. Update the Wi-Fi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Update the Google Apps Script Web App URL:
   Ensure you have deployed the updated Apps Script as a **Web App** (access set to "Anyone").
   Paste the generated deployment URL:
   ```cpp
   const char* googleScriptUrl = "https://script.google.com/macros/s/AKfycb..._your_id.../exec";
   ```
4. Select your ESP32 board (**Tools > Board > ESP32 Arduino > ESP32 Dev Module**).
5. Connect the ESP32 via USB, select the correct Port, and click **Upload**.

---

## 4. Verification & Testing

1. **System Start**:
   - Power on the system.
   - The ESP32's **Red LED** should turn ON immediately, indicating the door is locked.
   - The LCD should display:
     `WiFi Connecting` -> `WiFi Connected!` -> `Main Door Access / Scan RFID Card...`

2. **Verify Authorized Access**:
   - Scan an RFID card mapped to a user with the **admin** or **team** role in Google Sheets.
   - The LCD should show the check-in status (e.g. `Welcome in!` or `Good Bye!`) and the user's name.
   - The **Red LED** turns OFF, and the **Green LED** turns ON.
   - The Arduino Uno Serial Monitor prints: `[UNLOCK] Command 'OPEN' received from ESP32!` and the relay click is heard.
   - After **3 seconds**:
     - The relay de-actuates (door locks).
     - The ESP32 Green LED turns OFF and the Red LED turns ON.
     - The LCD returns to the idle screen.

3. **Verify Unauthorized Access**:
   - Scan an RFID card mapped to a user with the **user** or **visitor** role, or an unknown card.
   - The LCD displays `Access Denied` and the user's name (or `Unknown User`).
   - The **Red LED** flashes 3 times, and the **Green LED** remains OFF.
   - The relay does **NOT** click, and the door remains locked.
   - No trigger command is sent to the Arduino Uno.
   - Check the `rfid` tab in your Google Sheet to verify that the failed attempt was logged under `Access Denied`.

---

## 5. Troubleshooting & Common Issues

### Issue A: ESP32 does not recognize the MFRC522 Reader (SPI Fail)
- Open the Serial Monitor at **115200** baud and press the EN/RST button on the ESP32.
- If it prints: `MFRC522 register version: 0x00` or `0xFF` accompanied by the `❌ WARNING`, check that the pin headers are **fully soldered** to the MFRC522 board. Loose connections will completely break SPI communications.

### Issue B: Serial Communication Fail (Relay does not trigger on authorized scans)
- Check that you have connected the **common GND** between the ESP32 and the Arduino Uno.
- Check that ESP32 TX2 (GPIO 17) is connected to Arduino Pin 2 (RX).
- Check that Arduino Pin 3 (TX) is connected to the voltage divider input, and the divider node output is connected to ESP32 RX2 (GPIO 16).
- Swap RX/TX connections if SoftwareSerial was miswired.
