# 🪄 21st MCP (Magic) — 10.000+ gotovih UI komponenti u editoru

Projekat je **podešen** za 21st MCP (bivši "Magic MCP") — AI biblioteku od
10.000+ React/Tailwind komponenti koje AI može pretraživati i generisati
direktno u editoru. Kao "v0, ali u tvom Cursoru/Claudeu".

## ⚡ Aktivacija (jednokratno, 2 minute)

1. Otvori **https://21st.dev/mcp** → registruj se (besplatno, može preko GitHub-a)
2. U dashboardu nađi **API Key** → kopiraj ga
3. Kopiraj **`.mcp.example.json`** kao **`.mcp.json`**, pa u lokalnoj kopiji
   zamijeni `OVDE-ULEPI-SVOJ-21ST-API-KLJUC` svojim ključem. `.mcp.json` je
   ignorisan u Gitu — nikad nemoj komitovati pravi API ključ.
4. Otvori projekat u **Cursoru** ili **Claude Code** — oni sami prepoznaju
   `.mcp.json` i ponude konekciju (Accept/Enable)

> Stari "Magic" ključevi više ne rade — ako si imao ranije, napravi novi.

## Šta dobijaš

| Alat | Šta radi |
|---|---|
| `generate` | Generiše kompletnu UI komponentu iz opisa ("dark hero section with gradient, event cards grid") |
| `search` / `get_inspiration` | Pretraži 10.000+ gotovih komponenti za inspiraciju |
| `get_component` | Preuzme konkretan component code |
| `search_logo` | Pronađe zvanične logotipe (brendovi) |

## Kako koristiti PAMETNO na ovom projektu (važno!)

Ovaj sajt ima svoj dizajn sistem → **docs/DESIGN-SYSTEM.md** + AI skill
`.claude/skills/gdjeveceras-ui/SKILL.md`.

Zlatno pravilo:

> 21st MCP služi za **strukturu i inspiraciju** (layout, animacije, pattern).
> Boje, fontovi i komponentni recepti ostaju NAŠI (roza #FF006E, tamna tema,
> tokeni iz skill-a).

Primjeri dobrih prompta:

- "Pronađi inspiraciju za animirane event cards sa hover efektima — ali
  prilagodi našoj tamnoj temi i primary roza boji"
- "Generiši skeleton loader za event list u našem stilu (bg-card, border-white/5)"

## Napomene

- Komponente sa 21st.dev često vuku dodatne pakete (`framer-motion`,
  `radix-ui`, `next-themes`...) — instalira ih po potrebi; za ovaj sajt
  najbitniji je `framer-motion` (animacije)
- Besplatni plan ima mjesečni limit generacija — za početak je dosta
- Ako editor podržava samo stdio MCP (stariji alati), alternativa:
  ```json
  { "mcpServers": { "21st": { "command": "npx", "args": ["-y", "@21st-dev/magic@latest"], "env": { "API_KEY_21ST": "TVOJ-KLJUC" } } } }
  ```
- Arena.ai chat ne može da se poveže na MCP servere mid-session — ovo radi
  u Cursoru / Claude Code / Windsurf / VS Code sa MCP ekstenzijom
