#ifndef _DISPLAY_H_
#define _DISPLAY_H_

#include <Arduino.h>
#include <TFT_eSPI.h>

#define SELECT_NONE 0x81
#define SELECT_ALL 0x80

typedef void (*OnDigitColorChanged)(uint8_t digit, uint32_t color);

typedef struct
{
    uint16_t buffer[TFT_WIDTH * TFT_HEIGHT];
    uint8_t selectLcds;
    uint32_t color;
} LcdUpdate;

class Display
{
public:
    void begin();
    void drawTime(uint32_t time);
    void onDigitColorChanged(OnDigitColorChanged colorChanged);

private:
    void selectLcd(uint8_t index);
    void loadUpdate(uint8_t digit, LcdUpdate &update);
    void executeUpdate(LcdUpdate &update);

    TFT_eSPI tft;
    OnDigitColorChanged colorChanged;
};

#endif