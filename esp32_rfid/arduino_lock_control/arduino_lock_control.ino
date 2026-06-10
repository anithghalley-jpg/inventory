/**
 * Arduino Uno Lock Controller
 * 
 * Listens on SoftwareSerial (Pins 2 & 3) for the "OPEN" command from the ESP32.
 * When received, it activates the relay to unlock the door for a few seconds,
 * then deactivates it.
 * 
 * Hardware Connections:
 * -----------------------------------------------------------------------------
 * Component   | Arduino Pin | ESP32 Pin / Destination | Notes
 * ------------|-------------|-------------------------|------------------------
 * RX (Soft)   | Pin 2       | GPIO 17 (TX2)           | Use voltage divider!
 * TX (Soft)   | Pin 3       | GPIO 16 (RX2)           | Direct connection ok
 * Relay Sig   | Pin 7       | Relay IN / Signal       | Controls lock
 * 5V / GND    | 5V / GND    | Relay VCC / GND         | Relay power
 * -----------------------------------------------------------------------------
 * 
 * > [!WARNING]
 * > **VOLTAGE SAFETY**: The ESP32 is a 3.3V device. The Arduino Uno is a 5V device.
 * > - Arduino Pin 3 (TX) transmits at 5V. It must go through a voltage divider 
 * >   (e.g., 1kΩ and 2kΩ resistors) before connecting to ESP32 RX2 (GPIO 16).
 * > - ESP32 TX2 (GPIO 17) transmits at 3.3V. This can be connected directly to 
 * >   Arduino Pin 2 (RX) because 3.3V is high enough to trigger a logical HIGH.
 */

#include <SoftwareSerial.h>

// Pins
#define RELAY_PIN 7

// Configuration
#define RELAY_ACTIVE_LOW true  // Set to false if your relay is active-high
#define UNLOCK_DURATION 3000   // Time in milliseconds to keep the door unlocked

// Initialize SoftwareSerial: RX = Pin 2, TX = Pin 3
SoftwareSerial espSerial(2, 3);

void setup() {
  // Initialize Hardware Serial for USB debugging
  Serial.begin(9600);
  while (!Serial);
  Serial.println("\n========================================");
  Serial.println("Arduino Uno Lock Controller Initialized");
  Serial.println("========================================");

  // Initialize Relay pin
  pinMode(RELAY_PIN, OUTPUT);
  // Default state: Locked
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);
  Serial.print("Relay configured on Pin ");
  Serial.print(RELAY_PIN);
  Serial.println(RELAY_ACTIVE_LOW ? " (Active-LOW)" : " (Active-HIGH)");

  // Initialize Software Serial for communication with ESP32
  espSerial.begin(9600);
  Serial.println("Listening for command 'OPEN' on SoftwareSerial (Pin 2 RX, Pin 3 TX)...");
}

void loop() {
  if (espSerial.available() > 0) {
    // Read command until newline
    String command = espSerial.readStringUntil('\n');
    command.trim();
    
    if (command == "OPEN") {
      Serial.println("\n🔑 [UNLOCK] Command 'OPEN' received from ESP32!");
      
      // Actuate relay (unlock door)
      Serial.println("Relay Status: UNLOCKED");
      digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? LOW : HIGH);
      
      // Hold open state
      delay(UNLOCK_DURATION);
      
      // Revert relay (lock door)
      digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);
      Serial.println("Relay Status: LOCKED");
      Serial.println("Resuming idle scan listening...");
      
      // Flush any stray bytes in the SoftwareSerial buffer
      while(espSerial.available()) {
        espSerial.read();
      }
    } else if (command.length() > 0) {
      Serial.print("Received unknown command: ");
      Serial.println(command);
    }
  }
}
