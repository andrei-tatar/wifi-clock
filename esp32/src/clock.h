#ifndef _CLOCK_H_
#define _CLOCK_H_

#include <Arduino.h>
#include <WiFi.h>
#include <NTPClient.h>
#include <Ticker.h>
#include <Timezone.h>
#include <TimeLib.h>
#include <DS1307RTC.h>

#include "display.h"

class WifiClock
{
public:
    WifiClock(Display &display);
    void begin();
    void loop();

private:
    void sync();
    void updateDisplay();

    Ticker displayTime, updateTime;
    Display &display;
    WiFiUDP ntpUDP;
    NTPClient timeClient;
    Timezone timezone;
};

#endif