<div align="center">

# EvEJS

**A local EVE Online emulator for research, preservation, and New Eden tinkering.**

[![Windows](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4?logo=windows&logoColor=white)](#quick-start)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-5FA04E?logo=nodedotjs&logoColor=white)](#quick-start)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![EVE 24.01](https://img.shields.io/badge/EVE-24.01%20build%203396210-8A2BE2)](#compatibility)
[![Setup](https://img.shields.io/badge/Setup-One--Click-success)](#quick-start)
[![Discord](https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white)](https://discord.gg/KMuJrMDEBa)

Note: This GitHub is V9 of Eve.JS. i'm proud of it.

A hero/lovely guy named Farmer has started updating eve.js, presently at V11,
You can find these on discord!

this repo wont be updated -- or supported! 
However, it is working for what it is!
you can fight rats, mine, time dilation, try out all the ships, explore the universe :)

thank you to Icey, deer_hunter & myself for this project existing today :)

CCP have issued a DMCA against eve.js before, this repo may vanish at any time.



</div>

EvEJS lets you run a local research server against your own copied EVE Online
client. It is built for people who want to explore how EVE works, preserve
client/server behavior, test ideas, and help push emulator parity forward.

This project is unofficial, community-run, and not affiliated with CCP Games /
Fenris Creations.

## Quick Start

1. Download or clone this repository.
2. Make a separate copy of your EVE Online client.
3. Run `SetupEveJS.bat`.
4. Select your copied EVE client when the setup wizard asks for it.
5. Let setup *automatically* run `DatabaseCreator.bat` to build the complete local database.
6. Run `StartServer.bat`.
7. Choose option `2` to start the server and launch the client.

The setup flow installs the needed Node packages, creates the local EvEJS
database, prepares local certificates, and opens the client setup wizard.

## Compatibility

| Area | Current target |
| --- | --- |
| EVE version | `24.01` |
| Client build | `3396210` |
| Static-data point | June 16, 2026 |
| Primary platform | Windows |
| Runtime | Node.js LTS |

Use a copied client folder. Do not point EvEJS at the same EVE install you use
for Tranquility.

## What You Get

- One-click first-time setup with `SetupEveJS.bat`.
- Complete local database generation with `DatabaseCreator.bat`.
- Client setup wizard for copied-client configuration.
- Local chat and public-gateway certificate generation.
- Starter accounts: `test` and `test2`.
- Built-in HyperNet seed support for local experimentation.
- Optional market tooling and market daemon support.
- A growing server codebase focused on EVE client parity.

## Database Creation

EvEJS does not ship the generated database as loose JSON files. Instead, the
repo includes a native database creator:

```bat
DatabaseCreator.bat
```

That launcher calls:

```bat
tools\DatabaseCreator\bin\DatabaseCreator.exe
```

The creator verifies your copied client, downloads or reuses the supported
public EVE static-data export, and creates the local database. The finished
database is written to:

```text
_local\newDatabase\data
```

If client setup has already saved your copied-client path, you can run
`DatabaseCreator.bat` with no arguments. Otherwise pass it explicitly:

```bat
DatabaseCreator.bat --client-dir C:\Path\To\Copied\EVE\tq
```

## Daily Use

After setup, the normal loop is simple:

```bat
StartServer.bat
```

Choose:

- `1` for server only.
- `2` for server plus client launch.

## Client Files

EvEJS does not include a patched `blue.dll`, an EVE client, or any
CCP/Fenris-owned client files. You must provide your own legally obtained EVE
Online client.

Client setup is designed for a copied client folder so your normal EVE install
stays untouched.

## Documentation

- [Setup guide](doc/SETUP.md)
- [Launcher guide](doc/LAUNCHERS.md)
- [Optional market setup](doc/MARKET_SETUP.md)
- [Market seeder guide](doc/MARKET_SEEDER.md)
- [Troubleshooting](doc/TROUBLESHOOTING.md)
- [Tools and admin basics](doc/TOOLS.md)

## Community

Questions, testing notes, weird discoveries, and useful bug reports are welcome.
Join the Discord here:

[https://discord.gg/KMuJrMDEBa](https://discord.gg/KMuJrMDEBa)

## Legal

EvEJS is independent and unofficial. EVE Online and related names, marks,
assets, data, and client files belong to their respective owners. See
[LEGAL.md](LEGAL.md), [NOTICE.md](NOTICE.md), [ACCEPTABLE_USE.md](ACCEPTABLE_USE.md),
and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
