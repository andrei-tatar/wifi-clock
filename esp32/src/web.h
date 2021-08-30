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
    AsyncWebServer server;
    FS &fs;
};

#endif