# Accesos a Figma

App para que cada lead dé de alta a su equipo y pida accesos a los archivos de Figma, y para que los admins los otorguen en lotes. Toda la información se guarda en Notion.

- **Leads:** entran con su link personal y solo ven a su equipo.
- **Admins:** ven todas las solicitudes, los lotes para copiar correos y la lista de leads.
- **Notion:** guarda los datos en 3 bases (Leads, Miembros y Solicitudes). Solo la app tiene la llave.

---

## Guía de instalación (una sola vez, ~45 min)

> Esta guía usa la conexión **OAuth** de Notion, que funciona aunque no seas dueña del espacio de trabajo.

### Paso 1 · Crear la página en Notion (2 min)

En Notion, crea una página nueva vacía llamada **Accesos Figma**. Ahí vivirán las 3 bases. Copia su link (menú **···** → **Copiar enlace**): ese es tu `NOTION_PAGE_ID`.

### Paso 2 · Subir el código a GitHub (5 min)

1. En GitHub, da clic en **+** → **New repository**.
2. Nombre: `accesos-figma`. Elige **Private**. Da clic en **Create repository**.
3. En la página del repositorio vacío, da clic en **"uploading an existing file"**.
4. Descomprime el .zip, entra a la carpeta `accesos-figma` y **arrastra todo su contenido** (las carpetas `api` y `src`, `index.html` y este `README.md`). `index.html` debe quedar en la raíz, no dentro de otra carpeta.
5. Da clic en **Commit changes**.

### Paso 3 · Publicar en Vercel (10 min)

1. Entra a **https://vercel.com** → **Sign Up** → **Continue with GitHub**. Elige el plan **Hobby** (gratis).
2. Da clic en **Add New… → Project** y, junto a `accesos-figma`, da clic en **Import**. Si no aparece, da clic en *Adjust GitHub App Permissions* y dale acceso a ese repositorio.
3. En **Framework Preset**, deja **Other**.
4. Abre **Environment Variables** y agrega estas 3:

   | Nombre | Valor |
   |---|---|
   | `NOTION_PAGE_ID` | El link de la página del paso 1 |
   | `ADMIN_KEY` | Una clave larga que inventes tú, por ejemplo `bankaool-ux-admin-7f3k9q2m`. Mínimo 12 caracteres, solo letras, números y guiones |
   | `ADMIN_NOMBRE` | Tu nombre, por ejemplo `Ana Laura` |

5. Da clic en **Deploy**. Al terminar, copia la dirección de tu app (por ejemplo `https://accesos-figma.vercel.app`). La necesitas en el siguiente paso.

### Paso 4 · Crear la conexión OAuth en Notion (5 min)

1. Entra a **https://www.notion.so/profile/integrations** → **New connection**.
2. **Connection name:** `Accesos Figma`. **Authentication method:** **OAuth**.
3. **Installable in:** elige el espacio de trabajo de Bankaool (o deja *Any workspace*).
4. **Redirect URIs:** pega la dirección de tu app + `/api/oauth`, por ejemplo:
   `https://accesos-figma.vercel.app/api/oauth`
5. Da clic en **Create connection**. En la pantalla de la conexión, copia el **Client ID** y el **Client secret**.
6. En Vercel → tu proyecto → **Settings → Environment Variables**, agrega:

   | Nombre | Valor |
   |---|---|
   | `NOTION_CLIENT_ID` | El Client ID |
   | `NOTION_CLIENT_SECRET` | El Client secret |

7. Ve a **Deployments → ··· → Redeploy** para que tome los cambios.

### Paso 5 · Autorizar y obtener la llave (3 min)

1. Abre en tu navegador (cambia la dirección y tu clave):
   `https://accesos-figma.vercel.app/api/oauth?admin=TU_ADMIN_KEY`
2. Notion te pedirá permiso. Da clic en **Select pages**, elige la página **Accesos Figma** y autoriza.
3. Te regresa a una página con tu llave. Cópiala y agrégala en Vercel como **`NOTION_TOKEN`**.
4. **Deployments → ··· → Redeploy** otra vez.

### Paso 6 · Crear las bases en Notion (1 min)

Abre:

```
https://accesos-figma.vercel.app/api/setup?admin=TU_ADMIN_KEY
```

Se crean las 3 bases dentro de tu página de Notion y te muestra **tu link de admin**. Guárdalo en tus favoritos: quien tenga ese link entra como admin.

### Paso 7 · Dar de alta a los leads

1. Entra con tu link de admin → pestaña **Leads** → **Agregar lead**.
2. En la tarjeta del lead, da clic en **Copiar link de acceso** y envíaselo (por correo o Slack).
3. Si un link se comparte por error, usa **Cambiar link**: el anterior deja de funcionar.

Para que otra persona sea admin, agrégala como lead con rol **Admin** y envíale su link.

---

## Cómo funciona el día a día

1. **El lead** agrega a una persona o le edita las plataformas y da clic en **Guardar cambios**. Cada archivo pedido se crea en Notion como **Solicitado**.
2. **El admin** abre **Lotes para Figma**, copia los correos de un lote (separados por coma), los pega en Figma al compartir el archivo y da clic en **Marcar lote como activo**.
3. Si el lead quita un acceso que ya estaba activo, queda **A eliminar**. El admin lo retira en Figma y da clic en **Confirmar retiro**.
4. Si el lead pide la baja de alguien, aparece en **Bajas por confirmar**. Al confirmar, todos sus accesos pasan a **Retirado** y la persona queda como **Dado de baja**, sin borrar su historial.

En Notion puedes ver y filtrar todo. Recomendación: **no cambies los nombres de las bases ni de sus columnas**, porque la app los usa para encontrarlas.

---

## Hacer cambios a futuro

- **Agregar un archivo o una plataforma:** edita las listas al inicio de `api/_modelo.js` (`ARCHIVOS_APP` y `PLATAFORMAS`) directamente en GitHub (ícono del lápiz → **Commit changes**). Vercel publica el cambio solo en un minuto.
- **Cambiar el diseño:** el código fuente está en `src/App.jsx`. Después de editarlo, hay que volver a generar `index.html` (pídeselo a Claude).

## Problemas comunes

| Mensaje | Qué hacer |
|---|---|
| "Notion no encuentra la página" | Al autorizar (paso 5) no elegiste la página **Accesos Figma**, o el `NOTION_PAGE_ID` no es correcto. Repite el paso 5. |
| "La llave de Notion no es válida" | Repite el paso 5 para obtener una llave nueva, pégala en `NOTION_TOKEN` y vuelve a desplegar. |
| "Todavía no existen las bases" | Abre el link del paso 6. |
| "Este link no es válido" | El lead tiene un link viejo; cópiale el nuevo desde la pestaña Leads. |

Si cambias una variable en Vercel, hay que volver a desplegar para que tome efecto: **Deployments → ··· → Redeploy**.
