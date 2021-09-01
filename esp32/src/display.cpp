#include "display.h"
#include "hal.h"
#include <SPIFFS.h>
#include "rom/miniz.h"

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
    tft.fillScreen(TFT_BLACK);
    invalidateDigitCache();
}

void Display::invalidateDigitCache()
{
    memset(lastDigits, 0xFF, 6);
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
    uint8_t digits[6];
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
            loadUpdate(digit, updates[updateIndex]);
            updates[updateIndex].selectLcds = selectLcds;
            updateIndex++;
        }

        if (updateIndex == MAX_UPDATES || //if we can't hold any more updates in memory
            (digit == 9 && updateIndex))  //or we got to the last digit and we have pending updates
        {
            for (uint8_t i = 0; i < updateIndex; i++)
            {
                executeUpdate(updates[i]);
            }
            updateIndex = 0;
        }
    }
}

void Display::loadUpdate(uint8_t digit, LcdUpdate &update)
{
    char path[32];
    snprintf(path, 32, "/nix/%d.clk", digit);

    auto file = SPIFFS.open(path, "r");
    update.bufferSize = file.size() - 3;
    update.buffer = (uint8_t *)malloc(update.bufferSize);
    uint8_t rgb[3];

    file.readBytes((char *)rgb, 3);
    file.readBytes((char *)update.buffer, update.bufferSize);
    file.close();

    update.color = rgb[0] << 16 | rgb[1] << 8 | rgb[2];
}

void Display::executeUpdate(LcdUpdate &update)
{
    static tinfl_decompressor inflator;
    tinfl_init(&inflator);

#define OUT_BUF_SIZE 32768

    static uint8_t out_buf[OUT_BUF_SIZE];
    uint8_t *next_out = out_buf;
    int status = TINFL_STATUS_NEEDS_MORE_INPUT;

    uint8_t *data_buf = update.buffer;
    size_t remaining_compressed = update.bufferSize;

    selectLcd(update.selectLcds);
    tft.setAddrWindow(0, 0, TFT_WIDTH, TFT_HEIGHT);

    while (remaining_compressed > 0 && status > TINFL_STATUS_DONE)
    {
        size_t in_bytes = remaining_compressed;
        size_t out_bytes = out_buf + OUT_BUF_SIZE - next_out;

        int flags = remaining_compressed > in_bytes ? TINFL_FLAG_HAS_MORE_INPUT : 0;
        status = tinfl_decompress(&inflator, data_buf, &in_bytes,
                                  out_buf, next_out, &out_bytes,
                                  flags);

        remaining_compressed -= in_bytes;
        data_buf += in_bytes;

        next_out += out_bytes;
        size_t bytes_in_out_buf = next_out - out_buf;
        if (status == TINFL_STATUS_DONE || bytes_in_out_buf == OUT_BUF_SIZE)
        {
            tft.pushPixels((uint16_t *)out_buf, bytes_in_out_buf / 2);
            next_out = out_buf;
        }
    }

    if (colorChanged != NULL)
        colorChanged(update.selectLcds, update.color);

    free(update.buffer);
}