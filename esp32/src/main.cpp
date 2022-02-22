#include <Arduino.h>
#include <WiFi.h>
#include <Adafruit_NeoPixel.h>
#include <ESPmDNS.h>
#include <SPIFFS.h>

#include "display.h"
#include "hal.h"
#include "clock.h"
#include "web.h"

#define USE_FS SPIFFS

Display display(USE_FS);
WifiClock wificlock(display, USE_FS);
Adafruit_NeoPixel neo(6, BACKLIGHT_PIN, NEO_GRB + NEO_KHZ800);
Web web(USE_FS, wificlock);

void onDigitColorChanged(uint8_t digit, uint32_t color)
{
  for (uint8_t i = 0; i < 6; i++)
  {
    if (digit & (1 << i))
      neo.setPixelColor(i, color);
  }
  neo.show();
}

void onDigitsChanged()
{
  display.invalidateDigitCache();
}

void setup()
{
  Serial.begin(115200);

  MDNS.begin("wifi-clock");
  MDNS.addService("http", "tcp", 80);

  WiFi.begin();
  USE_FS.begin();
  neo.begin();
  display.onDigitColorChanged(onDigitColorChanged);
  display.begin();
  web.onDigitsChanged(onDigitsChanged);
  wificlock.begin();
  web.begin();
}

void loop()
{
}