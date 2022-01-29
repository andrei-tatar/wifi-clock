#include <Arduino.h>
#include <WiFi.h>
#include <SPIFFS.h>
#include <Adafruit_NeoPixel.h>

#include "display.h"
#include "hal.h"
#include "clock.h"
#include "web.h"

Display display;
WifiClock wificlock(display, SPIFFS);
Adafruit_NeoPixel neo(6, BACKLIGHT_PIN, NEO_GRB + NEO_KHZ800);
Web web(SPIFFS, wificlock);

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
  WiFi.begin();
  SPIFFS.begin();
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