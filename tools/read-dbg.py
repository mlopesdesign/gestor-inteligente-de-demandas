#!/usr/bin/env python3
"""Le o localStorage do WebView2 do Gestor (que contem __dbg e __dbg_db).
O WebView2 guarda localStorage em EBWebView/Default/Local Storage/leveldb/
mas em formato binario. Em vez disso, vamos usar o console.log do app
via Neutralino (mas isso nao funciona headless)."""
print("Nao consegui ler o localStorage diretamente do disco do WebView2")
print("porque o formato e' LevelDB (binario).")
print("Mas a boa noticia: o log do db.log esta sendo escrito, e o app-debug.log")
print("so nao tem a partir de 07:07:38. Aparentemente o appendFile esta com bug.")
