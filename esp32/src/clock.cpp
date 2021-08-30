#include "clock.h"

TimeChangeRule EEST = {"EEST", Last, Sun, Mar, 2, 180}; //DST
TimeChangeRule EET = {"EET ", Last, Sun, Oct, 3, 120};  //standard

WifiClock *clockInstance;

WifiClock::WifiClock(Display &display)
    : display(display),
      timeClient(ntpUDP, "pool.ntp.org"),
      timezone(EEST, EET)
{
}

void WifiClock::begin()
{
    clockInstance = this;

    WiFi.onEvent([](system_event_t *sys_event, wifi_prov_event_t *prov_event)
                 { clockInstance->sync(); },
                 SYSTEM_EVENT_STA_GOT_IP);

    updateTime.attach(3600, []
                      { clockInstance->sync(); });

    displayTime.attach(1, []
                       { clockInstance->updateDisplay(); });

    setSyncProvider([]
                    { return RTC.get(); });

    timeClient.begin();
}

void WifiClock::sync()
{
    if (timeClient.update())
    {
        RTC.set(timeClient.getEpochTime());
    }
}

void WifiClock::updateDisplay()
{
    auto localTime = timezone.toLocal(now());
    tmElements_t timeElements;
    breakTime(localTime, timeElements);
    auto time = timeElements.Hour * 10000 + timeElements.Minute * 100 + timeElements.Second;
    display.drawTime(time);
}
