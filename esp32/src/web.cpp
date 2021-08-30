#include "web.h"

Web::Web(FS &fs) : server(80), fs(fs)
{
}

void Web::begin()
{
    server.on("/api/reboot", HTTP_POST, [this](AsyncWebServerRequest *req)
              {
                  AsyncWebServerResponse *response = req->beginResponse(200, "text/plain", "OK");
                  response->addHeader("Connection", "close");
                  req->send(response);

                  delay(1000);
                  ESP.restart();
              });
    server.serveStatic("/", fs, "/public", "public,max-age=3600,immutable");
    server.onNotFound([this](AsyncWebServerRequest *req)
                      { req->send(404, "Not found"); });

    server.begin();
}