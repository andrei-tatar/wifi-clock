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

    WiFi.onEvent([](system_event_t *sys_event, wifi_prov_event_t *prov_event)
                 { clockInstance->sync(); },
                 SYSTEM_EVENT_STA_GOT_IP);

    displayTime.attach(1, []
                       { clockInstance->updateDisplay(); });

    setSyncProvider([]
                    { return RTC.get(); });

    loadConfig();
}

void WifiClock::sync()
{
    if (_ntpEnabled && timeClient.update())
    {
        auto ntpTime = timeClient.getEpochTime();
        RTC.set(ntpTime);
        setTime(ntpTime);
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

void WifiClock::loadConfig()
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
    _ntpEnabled = ntp["enabled"];
    if (_ntpEnabled)
    {
        static String ntpServer = ntp["server"];
        timeClient = NTPClient(ntpUDP, ntpServer.c_str(), 0, 1000);
        int updateInterval = ntp["updateInterval"];
        updateTime.attach(updateInterval, []
                          { clockInstance->sync(); });
        sync();
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

    updateDisplay();
}

void WifiClock::parseTimezoneRule(JsonObject &root, TimeChangeRule &rule)
{
    rule.week = root["week"];
    rule.dow = root["dow"];
    rule.month = root["month"];
    rule.hour = root["hour"];
    rule.offset = root["offset"];
}
