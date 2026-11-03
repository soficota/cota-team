# C.O.T.A. — Crónicas de los Cinco Reinos

Sitio estático basado en `cota.json`. Incluye portal de lore y comunidad, herramientas creativas, buzón NGL local, chat multi-personaje local y modo de presentación.

## Archivos

- `index.html`: estructura de la aplicación.
- `styles.css`: diseño adaptable, temas claro/oscuro y estilos de módulos.
- `script.js`: carga `cota.json`, renderiza las secciones y gestiona interacciones.
- `cota.json`: fuente editable de contenido del team.

## Importante sobre almacenamiento

Esta versión sigue el esquema indicado en la especificación C.O.T.A.: no tiene backend, servidor ni base de datos. Chats, personajes, preguntas NGL y tema se guardan en `localStorage` del navegador actual. No hay sincronización entre integrantes ni entre dispositivos. Se pueden exportar los chats y el buzón como archivos JSON para trasladarlos manualmente.

La información compartida del team (lore, reinos, roles, normas, grupos, actividades y plantillas) se lee desde `cota.json`. Para modificarla, edita ese archivo y publica los cambios en GitHub mediante commit/push o Pull Request.

## Probar localmente

No abras `index.html` mediante `file://`, porque el navegador puede bloquear la lectura de `cota.json`. Usa un servidor local:

### Python

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000` (si ejecutas el comando desde esta carpeta).

También puedes utilizar la extensión Live Server de Visual Studio Code.

## Publicar con GitHub Pages

1. Crea un repositorio público llamado `cota-team` (o cambia el nombre si prefieres).
2. Sube `index.html`, `styles.css`, `script.js`, `cota.json`, `README.md` y la carpeta `assets` a la raíz del repositorio.
3. En GitHub abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Elige `main` y la carpeta `/ (root)`.
6. Guarda y espera a que GitHub Pages publique la web.

Si el repositorio se llama distinto, no necesitas cambiar rutas: los archivos usan rutas relativas.

## Modo de presentación

- Botón **Presentación** en la cabecera.
- Atajo `Ctrl + P` para entrar o salir.
- `Esc` para salir.

El modo oculta la interfaz del sitio y muestra la conversación activa. No puede ocultar las pestañas, barras ni la interfaz propia del navegador o del programa de grabación.

## Imágenes

Las URL de imágenes de `cota.json` están vacías de acuerdo con la especificación. Cuando añadas recursos, completa `url`, `alt` y `credit` en cada bloque visual. Usa enlaces directos a archivos de imagen y conserva los créditos de autor.

## Datos pendientes

Los campos `PENDIENTE` se conservan intencionalmente para que el staff complete el canon de C.O.T.A. No se inventan datos de lore ni reglas.
