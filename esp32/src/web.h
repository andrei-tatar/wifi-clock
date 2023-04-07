#ifndef _WEB_H_
#define _WEB_H_

#include "clock.h"
#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>


typedef void (*ChangedHandler)();

class Web {
public:
  Web(FS &fs, WifiClock &clock);
  void begin();
  void onDigitsChanged(ChangedHandler handler);

private:
  void getInfo(AsyncWebServerRequest *req);
  void reboot(AsyncWebServerRequest *req);
  void getConfig(AsyncWebServerRequest *req);
  void getWifi(AsyncWebServerRequest *req);
  void updateConfig(AsyncWebServerRequest *request, uint8_t *data, size_t len,
                    size_t index, size_t total);
  void handleNotFound(AsyncWebServerRequest *req);
  void uploadFile(AsyncWebServerRequest *req, uint8_t *data, size_t len,
                  size_t index, size_t total);
  void handleWifiConnect(AsyncWebServerRequest *req);

  ChangedHandler digitsChangedHandler;
  String wifiStatusToString(wl_status_t status);
  AsyncWebServer server;
  FS &fs;
  WifiClock &clock;
};

#endif