#ifndef _WEB_H_
#define _WEB_H_

#include <ESPAsyncWebServer.h>
#include <Arduino.h>
#include <FS.h>

class Web
{
public:
    Web(FS &fs);
    void begin();

private:
    void getInfo(AsyncWebServerRequest *req);
    void reboot(AsyncWebServerRequest *req);
    void getConfig(AsyncWebServerRequest *req);
    void updateConfig(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);
    void handleNotFound(AsyncWebServerRequest *req);

    String wifiStatusToString();
    AsyncWebServer server;
    FS &fs;
};

#endif