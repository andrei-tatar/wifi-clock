#include <ArduinoJson.h>
#include "web.h"

using namespace std;
using namespace std::placeholders;

void NO_OP_REQ(AsyncWebServerRequest *req) {}

Web::Web(FS &fs, WifiClock &clock) : server(80), fs(fs), clock(clock)
{
}

void Web::begin()
{
    server.on("/api/reboot", HTTP_POST, bind(&Web::reboot, this, _1));
    server.on("/api/info", HTTP_GET, bind(&Web::getInfo, this, _1));
    server.on("/api/config", HTTP_GET, bind(&Web::getConfig, this, _1));
    server.on("/api/wifi", HTTP_GET, bind(&Web::getWifi, this, _1));
    server.on("/api/config", HTTP_POST, NO_OP_REQ, NULL, bind(&Web::updateConfig, this, _1, _2, _3, _4, _5));
    server.on("/api/file/*", HTTP_POST, NO_OP_REQ, NULL, bind(&Web::uploadFile, this, _1, _2, _3, _4, _5));

    server.serveStatic("/", fs, "/public", "public,max-age=3600,immutable")
        .setDefaultFile("index.html");
    server.onNotFound(bind(&Web::handleNotFound, this, _1));
    server.begin();
}

void Web::onDigitsChanged(ChangedHandler handler)
{
    digitsChangedHandler = handler;
}

void Web::handleNotFound(AsyncWebServerRequest *req)
{
    req->send(404, "Not found");
}

void Web::reboot(AsyncWebServerRequest *req)
{
    AsyncWebServerResponse *response = req->beginResponse(200, "text/plain", "OK");
    response->addHeader("Connection", "close");
    req->send(response);

    delay(1000);
    ESP.restart();
}

void Web::getInfo(AsyncWebServerRequest *req)
{
    DynamicJsonBuffer jsonBuffer;

    JsonObject &root = jsonBuffer.createObject();
    root["freeHeap"] = ESP.getFreeHeap();
    root["uptimeSeconds"] = millis() / 1000;

    JsonObject &wifi = root.createNestedObject("wifi");
    wifi["ssid"] = WiFi.SSID();
    wifi["status"] = wifiStatusToString();
    wifi["rssi"] = WiFi.RSSI();
    wifi["bssid"] = WiFi.BSSIDstr();

    JsonObject &time = root.createNestedObject("time");
    time["utc"] = clock.getTime();
    time["rtc"] = clock.getRtcTime();
    time["ntp"] = clock.getNtpTime();
    time["local"] = clock.getLocalTime();

    String serialized;
    root.printTo(serialized);
    req->send(200, "application/json", serialized);
}

void Web::getConfig(AsyncWebServerRequest *req)
{
    req->send(fs, "/config.json");
}

void Web::getWifi(AsyncWebServerRequest *req)
{
    DynamicJsonBuffer jsonBuffer;

    JsonArray &networks = jsonBuffer.createArray();
    int n = WiFi.scanComplete();
    if (n == -2)
    {
        WiFi.scanNetworks(true);
    }
    else if (n)
    {
        for (int i = 0; i < n; ++i)
        {
            JsonObject &network = networks.createNestedObject();
            network["rssi"] = WiFi.RSSI(i);
            network["ssid"] = WiFi.SSID(i);
            network["bssid"] = WiFi.BSSIDstr(i);
            network["channel"] = WiFi.channel(i);
            network["secure"] = WiFi.encryptionType(i);
        }
        WiFi.scanDelete();
        if (WiFi.scanComplete() == -2)
        {
            WiFi.scanNetworks(true);
        }
    }
    String serialized;
    networks.printTo(serialized);
    req->send(200, "application/json", serialized);
}

void Web::updateConfig(AsyncWebServerRequest *req, uint8_t *data, size_t len, size_t index, size_t total)
{
    if (!index)
    {
        req->_tempFile = fs.open("/config.json", "w");
    }

    req->_tempFile.write(data, len);

    if (index + len == total)
    {
        req->send(204);
        req->_tempFile.close();

        clock.loadConfig();
    }
}

void Web::uploadFile(AsyncWebServerRequest *req, uint8_t *data, size_t len, size_t index, size_t total)
{
    if (!index)
    {
        String fileName = req->url().substring(10);
        String path = "/nix/" + fileName + ".clk";
        req->_tempFile = fs.open(path, "w");
        req->_tempObject = (void *)(fileName.equals("9") ? 1 : NULL);
    }

    req->_tempFile.write(data, len);

    if (index + len == total)
    {
        req->send(204);

        if (req->_tempObject)
        {
            if (digitsChangedHandler)
                digitsChangedHandler();
            req->_tempObject = NULL; // the server tries to free the memory, but we use it as a flag
        }
    }
}

String Web::wifiStatusToString()
{
    switch (WiFi.status())
    {
    case WL_IDLE_STATUS:
        return "idle";
    case WL_NO_SSID_AVAIL:
        return "no_network";
    case WL_SCAN_COMPLETED:
        return "scan_completed";
    case WL_CONNECTED:
        return "connected";
    case WL_CONNECT_FAILED:
        return "connect_failed";
    case WL_CONNECTION_LOST:
        return "connection_lost";
    case WL_DISCONNECTED:
        return "disconnected";
    default:
        return "unknown";
    }
}