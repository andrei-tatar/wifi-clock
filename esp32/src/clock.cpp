#include "clock.h"

WifiClock *clockInstance;

TimeChangeRule rule;

WifiClock::WifiClock(Display &display, FS &fs)
    : display(display),
      timeClient(ntpUDP),
      timezone(rule),
      fs(fs)
{
    _ntpEnabled = false;
}

void WifiClock::begin()
{
    clockInstance = this;
    loadConfig(true);

    WiFi.onEvent([](system_event_t *sys_event, wifi_prov_event_t *prov_event)
                 { clockInstance->sync(); },
                 SYSTEM_EVENT_STA_GOT_IP);

    displayTime.attach(.2, []
                       { clockInstance->updateDisplay(); });

    setSyncProvider([]
                    { return RTC.get(); });
}

void WifiClock::sync()
{
    if (_ntpEnabled && WiFi.status() == WL_CONNECTED && timeClient.update())
    {
        auto ntpTime = timeClient.getEpochTime();
        RTC.set(ntpTime);
        setTime(ntpTime);
    }
}

void WifiClock::updateDisplay()
{
    auto localTime = getLocalTime();
    tmElements_t timeElements;
    breakTime(localTime, timeElements);

    static uint8_t lastSecond = 0xFF;
    if (timeElements.Second != lastSecond)
    {
        lastSecond = timeElements.Second;
        auto time = timeElements.Hour * 10000 + timeElements.Minute * 100 + timeElements.Second;
        display.drawTime(time);
    }
}

void WifiClock::loadConfig(bool first)
{
    if (!fs.exists("/config.json"))
    {
        return;
    }

    auto file = fs.open("/config.json", "r");
    size_t fileSize = file.size();
    uint8_t *json = (uint8_t *)malloc(fileSize + 1);
    file.read(json, fileSize);
    json[fileSize] = 0;

    DynamicJsonBuffer jsonBuffer;
    JsonObject &root = jsonBuffer.parseObject(json);
    JsonObject &ntp = root["ntp"];
    _ntpEnabled = ntp["enable"];
    if (_ntpEnabled)
    {
        static String ntpServer = ntp["server"];
        timeClient = NTPClient(ntpUDP, ntpServer.c_str(), 0, 1000);
        int updateInterval = ntp["updateInterval"];
        updateTime.attach(updateInterval, []
                          { clockInstance->sync(); });

        if (!first)
        {
            sync();
        }
    }
    else
    {
        updateTime.detach();
    }

    JsonObject &tz = root["timezone"];
    bool enableDst = tz["dstEnable"];
    if (!enableDst)
    {
        TimeChangeRule rule;
        rule.offset = tz["offset"];
        timezone.setRules(rule, rule);
    }
    else
    {
        TimeChangeRule start, end;
        parseTimezoneRule(tz["dstStart"], start);
        parseTimezoneRule(tz["dstEnd"], end);
        timezone.setRules(start, end);
    }

    if (!first)
    {
        updateDisplay();
    }
}

void WifiClock::parseTimezoneRule(JsonObject &root, TimeChangeRule &rule)
{
    rule.week = root["week"];
    rule.dow = root["dow"];
    rule.month = root["month"];
    rule.hour = root["hour"];
    rule.offset = root["offset"];
}
