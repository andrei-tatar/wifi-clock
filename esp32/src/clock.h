#ifndef _CLOCK_H_
#define _CLOCK_H_

#include <Arduino.h>
#include <ArduinoJson.h>
#include <DS1307RTC.h>
#include <FS.h>
#include <NTPClient.h>
#include <Ticker.h>
#include <TimeLib.h>
#include <Timezone.h>
#include <WiFi.h>


#include "display.h"

class WifiClock {
public:
  WifiClock(Display &display, FS &fs);
  void begin();
  void loop();
  void loadConfig(bool first = false);
  inline time_t getLocalTime() { return timezone.toLocal(now()); }
  inline time_t getRtcTime() { return RTC.get(); }
  inline time_t getNtpTime() { return timeClient.getEpochTime(); }
  inline time_t getTime() { return now(); }

private:
  void sync();
  void updateDisplay();
  void parseTimezoneRule(JsonObject &root, TimeChangeRule &rule);

  Ticker displayTime, updateTime;
  Display &display;
  WiFiUDP ntpUDP;
  NTPClient timeClient;
  Timezone timezone;
  FS &fs;

  bool _ntpEnabled;
};

#endif