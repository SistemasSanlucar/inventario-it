# Deploy de entorno DEVELOPER

Documentación operativa para publicar la rama `developer` de este repo en
`https://sistemassanlucar.github.io/inventario-it-dev/` **sin tocar producción**.

## Qué hay en este directorio

| Fichero | Qué es | Dónde va |
|---|---|---|
| `deploy-dev.yml` | Workflow de GitHub Actions | Copiar a `.github/workflows/deploy-dev.yml` del repo **`inventario-it-dev`** |
| `README.md` | Este documento | Solo referencia, no se publica |

**Importante:** `deploy-dev.yml` NO se ejecuta en este repo (`inventario-it`).
Está preparado para vivir en el repo target. Si lo pusieras aquí, intentaría
publicar en Pages de `inventario-it` y romperías producción.

---

## Arquitectura elegida y por qué

### Decisión: workflow en el repo TARGET, no en el source

Las alternativas que descarté y el motivo:

| Alternativa | Problema |
|---|---|
| Workflow en `inventario-it` que haga `git push` a `inventario-it-dev` | Requiere un PAT (Personal Access Token) almacenado como secret en el repo source. **El usuario pidió "no credenciales en GitHub"** → descartado |
| GitHub App que publique entre repos | Igual: requiere la private key como secret → descartado |
| Mantener producción y dev en el mismo repo con dos sitios Pages | GitHub Pages solo soporta **un sitio por repo** → imposible |

**La única vía sin secretos:** el repo target hace `actions/checkout` del repo
source. El `GITHUB_TOKEN` del target no sale de su propio ámbito y solo publica
en su propio Pages.

### Trigger

- `workflow_dispatch` → **único trigger**. Botón manual en la pestaña Actions
  del repo target. Cada despliegue lo decide un humano.

No hay cron ni schedule: no se publica nada sin acción explícita.
No hace falta ningún secret para disparar el workflow.

---

## Permisos de GitHub (mínimo privilegio)

### En el repo target (`inventario-it-dev`)

El workflow declara:

```yaml
permissions:
  contents: read    # para hacer checkout del source
  pages: write      # para publicar el artifact a Pages
  id-token: write   # para OIDC auth con el servicio de Pages
```

Son los **permisos mínimos** del `GITHUB_TOKEN` automático. Nada que
configurar manualmente — van declarados en el propio workflow.

### En Settings → Actions → General → Workflow permissions (del target)

Verificar que esté en **"Read and write permissions"** (no en "Read repository
contents and packages permissions"). Si está en el modo restringido, `pages:write`
no funcionará aunque el workflow lo declare.

### Si el repo source `inventario-it` es PRIVADO

El `actions/checkout` del workflow necesita leer el source. Como el
`GITHUB_TOKEN` del target NO tiene acceso al source, hay que añadir un token:

1. Crear un **fine-grained PAT** en la cuenta/organización `SistemasSanlucar`:
   - Resource owner: `SistemasSanlucar`
   - Repository access: **Only select repositories → `inventario-it`**
   - Permissions: **Contents → Read-only** (nada más)
   - Expiration: lo más corto posible (90 días recomendable, renovar)
2. Guardarlo en el repo target como secret `READ_SOURCE_PAT`
3. Descomentar la línea `token: ${{ secrets.READ_SOURCE_PAT }}` en `deploy-dev.yml`

Si el source es **público**, nada de esto es necesario y no se añade ningún secret.

**Cómo comprobar si el source es público:** abre `https://github.com/SistemasSanlucar/inventario-it`
en una ventana de incógnito sin login. Si lo ves → público. Si redirige a login → privado.

---

## Pre-flight checklist (verificar antes del primer Run workflow)

Antes de ejecutar el workflow por primera vez, confirmar manualmente cada
casilla. El propio workflow ya hace comprobaciones automáticas:

- **Pre-flight paso 1**: intenta `git ls-remote` anónimo sobre el source → avisa
  con `::warning::` si falla
- **Guard post-checkout**: compara el SHA de HEAD con el SHA real de
  `refs/heads/developer` en el remoto → aborta con `::error::` si no coincide.
  Esta comprobación es necesaria porque `actions/checkout` deja HEAD en
  detached al pasar un ref explícito, por lo que `git rev-parse --abbrev-ref`
  no es fiable.

Pero conviene validar manualmente lo siguiente antes:

### A. Acceso al repo source (`SistemasSanlucar/inventario-it`)

- [ ] **Comprobar visibilidad del source** abriendo en incógnito sin login:
      `https://github.com/SistemasSanlucar/inventario-it`
      - Si lo ves → público → **no hace falta ningún secret**
      - Si redirige a login → privado → **crear `READ_SOURCE_PAT`** (sección "Si el repo source es PRIVADO")
- [ ] **Rama developer existe** y tiene al menos un commit:
      `https://github.com/SistemasSanlucar/inventario-it/tree/developer`
      Si da 404 → el checkout fallará

### B. Configuración de GitHub Pages en el repo target (`inventario-it-dev`)

Rutas en el repo target → `Settings`:

- [ ] **Pages → Build and deployment → Source** = **"GitHub Actions"**
      (NO "Deploy from a branch". Si está en modo branch, el workflow
      subirá el artifact pero Pages no lo publicará)
- [ ] **Pages → Visibility** = **Public**
      (una Pages privada requiere GitHub Enterprise. Con la cuenta estándar,
      los sitios Pages son públicos aunque el repo sea privado)
- [ ] **Actions → General → Actions permissions** = **"Allow all actions and reusable workflows"**
      o al menos permitir `actions/checkout`, `actions/setup-node`,
      `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`
- [ ] **Actions → General → Workflow permissions** = **"Read and write permissions"**
      Si está en modo restringido, `pages: write` no funcionará aunque el
      workflow lo declare
- [ ] **Environments → github-pages** debe existir (se crea solo tras el
      primer intento de deploy). Si tienes "Deployment branches and tags"
      restringido, añadir `main` del repo target como permitido

### C. Entra ID (ya documentado en "Pasos de bootstrap" paso 2)

- [ ] URI `https://sistemassanlucar.github.io/inventario-it-dev/` añadida
      en el App Registration como Single-page application redirect URI

### D. Repo target no vacío

- [ ] El repo `inventario-it-dev` debe tener al menos la rama `main` con
      un commit (p.ej. un `README.md` vacío). Un repo totalmente vacío
      no acepta configuración de Pages

### Cómo ejecutar la verificación en seco (sin publicar)

Antes del primer run real:

1. En el repo target → **Actions** → "Deploy Developer to GitHub Pages" → **Run workflow**
2. Revisar el log del paso **"Pre-flight — comprobar acceso al repo source"**:
   - Debe decir `OK — repo source accesible` o avisar con warning claro
3. Revisar el paso **"Verificar que el commit descargado..."**:
   - Debe decir `OK — código descargado = cabeza de refs/heads/developer`
4. Si cualquiera de los dos falla, el workflow se detiene antes de llegar a build. No se publica nada.

---

## Pasos de bootstrap (orden exacto)

1. **En este repo (`inventario-it`), rama `developer`:**
   - Revisar los cambios preparados en esta rama:
     - `vite.config.ts` acepta `VITE_BASE_PATH`
     - `src/config/index.ts` expone `isDev` basado en `VITE_IS_DEV`
     - `src/components/layout/Header.tsx` muestra badge rojo "DEVELOPER"
   - Hacer push de `developer` al remoto cuando esté validado (ya está la rama en origin, solo faltaría pushear nuevos commits)

2. **Entra ID (Azure Portal):**
   - Abrir App registration `80ba264e-e1fc-4749-bf00-2c25b93b4ee5`
   - **Authentication → Platform configurations → Single-page application**
   - Añadir a Redirect URIs: `https://sistemassanlucar.github.io/inventario-it-dev/`
   - **No tocar** la URI existente de producción `https://sistemassanlucar.github.io/inventario-it/`
   - Guardar

3. **Repo target `inventario-it-dev` (vacío ahora mismo):**
   - Crear al menos un fichero inicial para que la rama `main` exista (ej.
     un `README.md` vacío). GitHub no acepta Pages en un repo sin commits.
   - Copiar este fichero: `deploy-dev.yml` → `.github/workflows/deploy-dev.yml`
   - Si el source es privado: añadir secret `READ_SOURCE_PAT` (ver sección arriba)
   - Hacer commit y push

4. **Settings → Pages (del repo target):**
   - **Source: GitHub Actions** (no "Deploy from a branch")
   - Verificar que **Workflow permissions = Read and write**

5. **Primer despliegue:**
   - Ir a la pestaña **Actions** del repo target
   - Workflow "Deploy Developer to GitHub Pages" → **Run workflow** → rama main
   - Esperar ~2 min
   - Comprobar la URL `https://sistemassanlucar.github.io/inventario-it-dev/`

6. **Validación en el entorno dev:**
   - Debe cargar la app
   - La cabecera debe mostrar el badge rojo **DEVELOPER** al lado de la versión
   - El login MSAL debe funcionar (si no, revisar paso 2 de Entra ID)
   - Debe acceder a las mismas listas de SharePoint (los datos son compartidos
     — es el mismo tenant y las mismas listas)

---

## Qué NO cambia

- Producción `main` → `inventario-it` → `.github/workflows/deploy-pages.yml`: **intacto**
- Config de SharePoint (`CONFIG.sharepoint`): **idéntica**
- Config MSAL (`CONFIG.msal`): **idéntica** — la `redirectUri` es dinámica, por eso basta con añadir la nueva URL en Entra ID
- Las listas de SharePoint: **compartidas** entre dev y producción. Esto es un **riesgo deliberado** — dev y prod leen y escriben contra los MISMOS datos reales. Si eso no es aceptable, hay que duplicar las listas en SharePoint y añadir una `VITE_SHAREPOINT_SITE_PATH` distinta al build dev (ya soportada en `src/config/index.ts:3`).

---

## Riesgos a validar antes de pasar a producción

- **Datos compartidos:** dev y prod escriben en las mismas listas. Un bug en
  dev puede corromper datos reales. Mitigación corta: solo técnicos de
  confianza acceden al entorno dev. Mitigación larga: segundo site de
  SharePoint para dev.
- **Email de un segundo redirect URI en Entra:** cualquier app que use ese
  App Registration debería seguir funcionando. No afecta a producción.
- **Minutos de Actions:** cada despliegue manual gasta ~2 min. Al no haber
  cron, el consumo depende solo de la frecuencia con la que se dispare.

---

## Rollback

Si algo en dev afectase a producción (no debería, pero por si acaso):

1. Entra ID: eliminar la URI `https://sistemassanlucar.github.io/inventario-it-dev/` de las Redirect URIs
2. Repo target: Actions → desactivar el workflow (`···` menu → Disable workflow)
3. Repo target: Settings → Pages → Unpublish site

Nada de lo anterior afecta a producción.
