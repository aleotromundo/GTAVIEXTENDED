# Modelo de personalización y sincronización de YouToo

## Principio de funcionamiento

YouToo tendrá dos modos complementarios. El modo **local** es el predeterminado y guarda actividad, cola, favoritos y preferencias solamente en el dispositivo. El modo **cuenta** será opcional: el usuario inicia sesión, acepta la sincronización y decide importar el perfil local existente a una cuenta en la nube.

La cuenta no reemplazará de forma automática la sesión de MediaCMS durante la primera etapa. El esquema queda preparado para Supabase Auth y para una futura capa de enlace con la cuenta nativa de MediaCMS, evitando imponer dos inicios de sesión a la vez antes de implementar el flujo completo.

| Señal | Almacenamiento local inicial | Sincronización opcional | Uso dentro del producto |
|---|---|---|---|
| Búsquedas escritas | Últimas consultas y frecuencia | Sí, tras consentimiento | Categorías y continuidad de descubrimiento. |
| Navegación y reproducción | Evento, fuente, duración, fecha y progreso | Sí, con retención limitada | Reanudar y ajustar intereses. |
| Favoritos y biblioteca | Identificador de fuente y elemento | Sí | Disponibilidad entre dispositivos. |
| Cola | Orden, posición actual y modo de repetición | Sí | Retomar escucha o visión en otro dispositivo. |
| Preferencias | Tema, volumen, crossfade y ajustes de personalización | Sí | Mantener el entorno elegido. |
| Intereses derivados | Artistas, canales, etiquetas o consultas con ponderación | Sí | Recomendaciones explicables. |

## Privacidad y minimización

La aplicación debe poder funcionar sin cuenta. La activación de nube debe presentar una elección clara: **mantener solo este dispositivo**, **crear cuenta vacía** o **importar mi perfil local**. El usuario debe poder desactivar la sincronización, exportar sus datos y eliminar su cuenta/perfil de nube.

Los metadatos de resultados externos no se usan como una copia permanente de catálogos. Para fuentes con restricciones temporales de almacenamiento, la nube conservará referencias mínimas de elemento y las señales del usuario; los datos descriptivos recuperables se refrescarán desde la fuente cuando hagan falta.

## Entidades propuestas

| Entidad | Finalidad |
|---|---|
| `profiles` | Identidad de la cuenta sincronizada y estado de consentimiento. |
| `user_preferences` | Ajustes explícitos de experiencia y personalización. |
| `user_library_items` | Favoritos, elementos guardados, progreso y referencias de media. |
| `user_queue_items` | Cola ordenada y persistente. |
| `user_searches` | Consultas expresamente realizadas por el usuario. |
| `user_activity` | Señales con retención limitada para reanudación y afinidad. |
| `user_interest_weights` | Perfil derivado y explicable para recomendaciones. |
| `sync_devices` | Registro técnico mínimo de dispositivos que sincronizan. |

## Importación local

Cuando la persona confirme la migración, el cliente enviará un lote acotado mediante una función de Supabase. El lote no incluirá secretos, cookies, claves de API ni datos de inicio de sesión. La operación será idempotente: repetirse no duplicará favoritos, búsquedas ni elementos de cola.

## Referencias

[1] [Supabase Auth](https://supabase.com/docs/guides/auth)

[2] [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
