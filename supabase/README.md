# Supabase para la cuenta opcional de YouToo

Esta carpeta **no conecta todavía** la aplicación a Supabase. Deja preparada una migración reproducible para que, al crear el proyecto, se pueda activar una cuenta opcional y sincronizar datos elegidos por la persona usuaria.

## Alcance de la primera migración

La migración [`migrations/20260820_001_youtoo_cloud_sync.sql`](./migrations/20260820_001_youtoo_cloud_sync.sql) crea perfiles vinculados a Supabase Auth, ajustes de reproducción, favoritos, referencias de biblioteca, cola, búsquedas, actividad de uso con retención limitada, intereses derivados y dispositivos. Todas las tablas expuestas tienen Row Level Security: una sesión autenticada solo puede leer o modificar filas cuyo `user_id` coincida con su propia identidad.

El procedimiento `import_local_profile(jsonb)` permite una importación explícita y repetible de los datos guardados localmente. Para contenido de YouTube guarda la referencia del recurso y el estado del usuario, pero impide que se persista una copia de títulos, imágenes o descripciones de YouTube en esta base. Esos metadatos deben recuperarse desde la API oficial al mostrarse.

## Activación posterior

| Paso | Acción |
|---|---|
| 1 | Crear un proyecto de Supabase y habilitar el método de acceso deseado, inicialmente correo y contraseña o enlace mágico. |
| 2 | Abrir el SQL Editor y ejecutar la migración completa, o aplicarla con las migraciones del proyecto Supabase. |
| 3 | Verificar que todas las tablas indicadas tengan RLS habilitado y que la cuenta anónima no reciba permisos. |
| 4 | Configurar en el entorno de la aplicación `SUPABASE_URL` y la clave pública/publicable. |
| 5 | Guardar cualquier clave de servicio únicamente en backend. Nunca debe llegar al navegador, archivos versionados ni registros. |
| 6 | Conectar la interfaz de registro/inicio de sesión y ofrecer tres decisiones: continuar localmente, crear una nube vacía o importar los datos locales. |

## Controles de privacidad que debe conservar la interfaz

La cuenta es opcional y la aplicación sigue operativa sin ella. Antes de la primera carga se debe mostrar qué datos se transferirán. La persona podrá desactivar la sincronización, borrar su actividad, borrar datos de nube y exportar sus preferencias. El trabajo de sincronización no debe subir cookies, claves de API, tokens de otras plataformas ni datos que no se hayan descrito en la pantalla de consentimiento.

## Validación realizada

La migración fue ejecutada en una base PostgreSQL temporal con un esquema `auth.users` de prueba. Se verificó la creación de las ocho tablas de producto, los índices, funciones, triggers y políticas RLS. La conexión con una cuenta Supabase real queda intencionalmente pendiente hasta que haya un proyecto y credenciales proporcionadas por el usuario.

## Referencias

[1] [Supabase Auth](https://supabase.com/docs/guides/auth)

[2] [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

[3] [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
