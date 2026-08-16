; ================================================================
; installer/gestor.nsi - Script NSIS do Gestor Inteligente de Demandas
;
; Compila com:  makensis.exe /V2 installer\gestor.nsi
; Sa?da:        installer\GestorInteligenteDeDemandas-Setup-X.Y.Z.exe
;
; Padr?o: PADRAO-ML-LOPES-DESIGN.md ?2.3 (Salgueiro Setup.exe = 15.3 MB).
; Diferen?as do Salgueiro: a app-image do Neutralino j? vem com WebView2 builtin
; (zero runtime), ent?o o nosso Setup.exe fica na casa dos 3-4 MB.
; ================================================================

Unicode True
SetCompressor /SOLID lzma

!define APP_NAME "GestorInteligenteDeDemandas"
!define APP_DISPLAY "Gestor Inteligente de Demandas"
!define APP_PUBLISHER "ML Lopes Design"
!define APP_VERSION "0.2.1"
!define APP_ID "app.mllopes.gestor"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}"
!define INSTALL_DIR_REG "Software\${APP_ID}"
!define APPIMAGE_DIR "..\dist\GestorInteligenteDeDemandas"
!define OUTPUT_EXE "GestorInteligenteDeDemandas-Setup-${APP_VERSION}.exe"

!include "MUI2.nsh"
!include "LogicLib.nsh"

Name "${APP_DISPLAY} ${APP_VERSION}"
OutFile "${OUTPUT_EXE}"
InstallDir "$PROGRAMFILES64\${APP_DISPLAY}"
InstallDirRegKey HKLM "${INSTALL_DIR_REG}" "InstallDir"
ShowInstDetails show
ShowUninstDetails show
RequestExecutionLevel admin
BrandingText "${APP_DISPLAY} ? ${APP_PUBLISHER}"

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\win.bmp"
; IMPORTANTE: com Unicode True, customizar via LangString (depois do MUI_LANGUAGE)
; NAO via !define MUI_WELCOMEPAGE_TEXT - senao acentos viram '?' no instalador.
!define MUI_FINISHPAGE_RUN "$INSTDIR\GestorInteligenteDeDemandas.exe"
!define MUI_FINISHPAGE_RUN_NOTCHECKED
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\LEIA-ME.txt"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "PortugueseBR"

; Customizacoes PT-BR (Unicode-safe: usar LangString, NAO !define)
LangString MUI_TEXT_WELCOME_INFO_TITLE ${LANG_PORTUGUESEBR} "Bem-vindo ao instalador do ${APP_DISPLAY}"
LangString MUI_TEXT_WELCOME_INFO_TEXT  ${LANG_PORTUGUESEBR} "Este assistente instalar? o ${APP_DISPLAY} ${APP_VERSION} no seu computador.$\r$\n$\r$\n? Funciona offline (banco local SQLite)$\r$\n? Sincroniza??o entre dispositivos$\r$\n? Cobran?a cont?nua inteligente$\r$\n? Sem depend?ncia externa: usa o WebView2 que j? vem no Windows 10/11$\r$\n$\r$\nClique em Avan?ar para continuar."
LangString MUI_TEXT_FINISH_INFO_TITLE ${LANG_PORTUGUESEBR} "Instala??o Conclu?da"
LangString MUI_TEXT_FINISH_INFO_TEXT  ${LANG_PORTUGUESEBR} "${APP_DISPLAY} foi instalado com sucesso."
LangString MUI_UNTEXT_WELCOME_INFO_TITLE ${LANG_PORTUGUESEBR} "Bem-vindo ao desinstalador do ${APP_DISPLAY}"
LangString MUI_UNTEXT_CONFIRM_TITLE ${LANG_PORTUGUESEBR} "Desinstalar ${APP_DISPLAY}"
LangString MUI_UNTEXT_CONFIRM_SUBTITLE ${LANG_PORTUGUESEBR} "Esta a??o remover? o ${APP_DISPLAY} do seu computador."

Var PreviousInstall

Function .onInit
    ; Mata inst?ncia anterior (PADR?O ?3.5)
    nsExec::ExecToLog 'taskkill /F /IM "GestorInteligenteDeDemandas.exe" /T'
    Sleep 500

    ; Detecta instala??o anterior (PADR?O ?11: identidade imut?vel)
    ReadRegDWORD $PreviousInstall HKLM "${INSTALL_DIR_REG}" "Version"
    ${If} $PreviousInstall != ""
        DetailPrint "Detectada instala??o anterior (vers?o $PreviousInstall). Atualizando in-place..."
    ${Else}
        DetailPrint "Instala??o nova."
    ${EndIf}
FunctionEnd

Section "Instalar ${APP_DISPLAY}" SecInstall
    SectionIn RO

    SetOutPath "$INSTDIR"

    ; Copia a app-image inteira
    DetailPrint "Copiando arquivos..."
    File /r "${APPIMAGE_DIR}\*"

    ; Cria atalhos
    DetailPrint "Criando atalhos..."
    CreateDirectory "$SMPROGRAMS\${APP_DISPLAY}"
    CreateShortcut "$SMPROGRAMS\${APP_DISPLAY}\${APP_DISPLAY}.lnk" "$INSTDIR\GestorInteligenteDeDemandas.exe" "" "$INSTDIR\GestorInteligenteDeDemandas.exe" 0
    CreateShortcut "$SMPROGRAMS\${APP_DISPLAY} - Desinstalar.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
    CreateShortcut "$DESKTOP\${APP_DISPLAY}.lnk" "$INSTDIR\GestorInteligenteDeDemandas.exe" "" "$INSTDIR\GestorInteligenteDeDemandas.exe" 0

    ; Garante pasta de dados
    SetShellVarContext all
    CreateDirectory "$APPDATA\${APP_DISPLAY}\dados"
    CreateDirectory "$APPDATA\${APP_DISPLAY}\dados\backups"

    ; Salva uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    ; Registra em "Adicionar/Remover Programas"
    WriteRegStr HKLM "${UNINST_KEY}" "DisplayName" "${APP_DISPLAY}"
    WriteRegStr HKLM "${UNINST_KEY}" "DisplayVersion" "${APP_VERSION}"
    WriteRegStr HKLM "${UNINST_KEY}" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "${UNINST_KEY}" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
    WriteRegStr HKLM "${UNINST_KEY}" "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"
    WriteRegStr HKLM "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\GestorInteligenteDeDemandas.exe"
    WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify" 1
    WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair" 1
    WriteRegDWORD HKLM "${INSTALL_DIR_REG}" "Version" ${APP_VERSION}
SectionEnd

Section "Uninstall"
    Delete "$SMPROGRAMS\${APP_DISPLAY}\${APP_DISPLAY}.lnk"
    Delete "$SMPROGRAMS\${APP_DISPLAY} - Desinstalar.lnk"
    RMDir "$SMPROGRAMS\${APP_DISPLAY}"
    Delete "$DESKTOP\${APP_DISPLAY}.lnk"

    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Deseja tamb?m apagar os dados locais em %APPDATA%\${APP_DISPLAY}\?$\r$\n$\r$\nSim = apaga tudo (irrevers?vel)$\r$\nN?o = mant?m dados para reinstalar" \
        IDYES yes_delete IDNO no_keep

    yes_delete:
        SetShellVarContext all
        RMDir /r "$APPDATA\${APP_DISPLAY}"
        Goto done

    no_keep:
    done:
    RMDir /r "$INSTDIR"
    DeleteRegKey HKLM "${UNINST_KEY}"
    DeleteRegKey HKLM "${INSTALL_DIR_REG}"
SectionEnd
