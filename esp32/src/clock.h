#ifndef _CLOCK_H_
#define _CLOCK_H_

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <NTPClient.h>
#include <Ticker.h>
#include <Timezone.h>
#include <TimeLib.h>
#include <DS1307RTC.h>
#include <FS.h>

#include "display.h"

class WifiClock
{
public:
    WifiClock(Display &display, FS &fs);
    void begin();
    void loop();
    void loadConfig();

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