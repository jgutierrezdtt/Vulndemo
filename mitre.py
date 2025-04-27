from libretranslatepy import LibreTranslateAPI

def test_translation():
    try:
        translator = LibreTranslateAPI("https://libretranslate.com/")
        result = translator.translate("Hello, world!", "en", "es")
        print(f'Traducción de prueba: {result}')
        return True
    except Exception as e:
        print(f'Error en prueba de traducción: {e}')
        return False

test_translation()