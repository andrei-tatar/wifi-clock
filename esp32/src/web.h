#ifndef _WEB_H_
#define _WEB_H_

#include <ESPAsyncWebServer.h>
#include <Arduino.h>
#include <FS.h>

typedef void (*OnConfigurationChanged)();

class Web
{
public:
    Web(FS &fs);
    void begin();
    void onConfigurationChanged(OnConfigurationChanged handler);

private:
    void getInfo(AsyncWebServerRequest *req);
    void reboot(AsyncWebServerRequest *req);
    void getConfig(AsyncWebServerRequest *req);
    void updateConfig(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);
    void handleNotFound(AsyncWebServerRequest *req);

    OnConfigurationChanged configurationChangedHandler;
    String wifiStatusToString();
    AsyncWebServer server;
    FS &fs;
};

#endif