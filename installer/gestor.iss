#define AppVersion "0.2.26"
#define AppName "Gestor Inteligente de Demandas"
#define AppPublisher "ML Lopes Design"
#define AppExeName "GestorInteligenteDeDemandas.exe"
#define AppId "app.mllopes.gestor"

[Setup]
AppId={{3F0A4D2B-1E5C-4A7D-9B6E-MLGD00000001}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
SetupIconFile=..\installer\resources\icon.ico
DefaultDirName={localappdata}\Programs\Gestor Inteligente de Demandas
DefaultGroupName=Gestor Inteligente de Demandas
OutputDir=.
OutputBaseFilename=GestorInteligenteDeDemandas-Setup-{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
WizardStyle=modern
UninstallDisplayIcon={app}\{#AppExeName}
VersionInfoVersion={#AppVersion}
VersionInfoCompany={#AppPublisher}
VersionInfoProductName={#AppName}
VersionInfoDescription=Instalador do {#AppName} v{#AppVersion}
AppCopyright=Copyright (c) 2026 {#AppPublisher}
MinVersion=10.0

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
; Copia TUDO da app-image (gerada pelo build.mjs em dist\GestorInteligenteDeDemandas\)
Source: "..\dist\GestorInteligenteDeDemandas\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"; IconFilename: "{app}\icon.ico"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na Área de trabalho"; GroupDescription: "Atalhos adicionais:"

[Dirs]
; Cria pasta de dados no AppData do usuario (HKCU)
Name: "{userappdata}\GestorInteligenteDeDemandas\dados"
Name: "{userappdata}\GestorInteligenteDeDemandas\dados\backups"
Name: "{userappdata}\GestorInteligenteDeDemandas\logs"

[Run]
; Oferece abrir o app no fim (NAO obrigado)
Filename: "{app}\{#AppExeName}"; Description: "Abrir o {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Pergunta antes de apagar dados
Type: filesandordirs; Name: "{userappdata}\GestorInteligenteDeDemandas"
