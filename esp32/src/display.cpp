#include "display.h"
#include "hal.h"
#include <SPIFFS.h>

void Display::begin()
{
    pinMode(SR_LATCH_PIN, OUTPUT);
    pinMode(SR_DATA_PIN, OUTPUT);
    pinMode(SR_CLOCK_PIN, OUTPUT);
    pinMode(TFT_ENABLE_PIN, OUTPUT);

    digitalWrite(SR_DATA_PIN, LOW);
    digitalWrite(SR_CLOCK_PIN, LOW);
    digitalWrite(SR_LATCH_PIN, LOW);
    digitalWrite(TFT_ENABLE_PIN, HIGH);

    selectLcd(SELECT_ALL);

    tft.begin();
    tft.initDMA();
    tft.fillScreen(TFT_BLACK);
}

void Display::onDigitColorChanged(OnDigitColorChanged colorChanged)
{
    this->colorChanged = colorChanged;
}

void Display::selectLcd(uint8_t mask)
{
    uint8_t to_shift;
    switch (mask)
    {
    case SELECT_ALL:
        to_shift = 0;
        break;
    case SELECT_NONE:
        to_shift = 0xFF;
        break;
    default:
        to_shift = (~mask) << 2;
        break;
    }

    digitalWrite(SR_LATCH_PIN, LOW);
    shiftOut(SR_DATA_PIN, SR_CLOCK_PIN, LSBFIRST, to_shift);
    digitalWrite(SR_LATCH_PIN, HIGH);
}

void Display::drawTime(uint32_t time)
{
    static uint8_t lastDigits[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    uint8_t digits[6];

#define MAX_UPDATES 2

    LcdUpdate *updates[MAX_UPDATES] = {NULL};
    uint8_t updateIndex = 0;

    for (uint8_t i = 0; i < 6; i++)
    {
        digits[i] = time % 10;
        time = time / 10;
    }

    for (uint8_t digit = 0; digit < 10; digit++)
    {
        uint8_t selectLcds = 0;

        for (uint8_t lcd = 0; lcd < 6; lcd++)
        {
            if (digits[lcd] == digit && lastDigits[lcd] != digit)
            {
                selectLcds |= 1 << lcd;
                lastDigits[lcd] = digit;
            }
        }

        if (selectLcds)
        {
            if (updates[updateIndex] == NULL)
                updates[updateIndex] = (LcdUpdate *)malloc(sizeof(LcdUpdate));

            if (updates[updateIndex] == NULL)
            {
                if (updateIndex == 0)
                {
                    //could not alloc on first update, nothing else to do...
                    return;
                }

                //execute previous update
                updateIndex--;
                executeUpdate(*updates[updateIndex]);
            }

            loadUpdate(digit, *updates[updateIndex]);
            updates[updateIndex]->selectLcds = selectLcds;
            updateIndex++;
        }

        if (updateIndex == MAX_UPDATES || //if we can't hold any more updates in memory
            (digit == 9 && updateIndex))  //or we got to the last digit and we have pending updates
        {
            for (uint8_t i = 0; i < updateIndex; i++)
            {
                executeUpdate(*updates[i]);
            }
            updateIndex = 0;
        }
    }

    if (updates[0] != NULL)
        free(updates[0]);
    if (updates[1] != NULL)
        free(updates[1]);
}

void Display::loadUpdate(uint8_t digit, LcdUpdate &update)
{
    char path[32];
    snprintf(path, 32, "/nix/%d.clk", digit);

    auto file = SPIFFS.open(path, "r");
    file.readBytes((char *)update.buffer, TFT_WIDTH * TFT_HEIGHT * 2);
    uint8_t rgb[3];
    file.readBytes((char *)rgb, 3);
    update.color = rgb[0] << 16 | rgb[1] << 8 | rgb[2];
    file.close();
}

void Display::executeUpdate(LcdUpdate &update)
{
    tft.dmaWait();
    selectLcd(update.selectLcds);
    tft.pushImageDMA(0, 0, TFT_WIDTH, TFT_HEIGHT, update.buffer);
    if (colorChanged != NULL)
        colorChanged(update.selectLcds, update.color);
}