# Lichess & Chess.com

Siga en Gladys a jugadores de ajedrez de [Lichess](https://lichess.org) y de
[Chess.com](https://www.chess.com): usted, sus hijos, su club o un campeón.

Esta integración no está afiliada a Lichess ni a Chess.com.

## Qué hace la integración

- Lee los **perfiles públicos** de los jugadores indicados, sin cuenta ni
  contraseña: nunca escribe nada en los sitios.
- Crea **un dispositivo por jugador**, con:
  - una **puntuación** por ritmo: bullet, blitz, rápidas, clásicas,
    correspondencia y problemas en Lichess; bullet, blitz, rápidas y Daily en
    Chess.com;
  - **En línea** y **En partida** (solo Lichess: Chess.com ya no lo publica);
  - la **Última partida**, en una frase: «Victoria contra Rival (blitz, 1756
    +6)»;
  - las **Partidas de hoy** y las **Victorias de hoy**, a cero a medianoche.
- Añade un widget de panel **Jugadores de ajedrez**, dos disparadores de escena
  **Partida terminada** y **Nuevo récord de puntuación**, y dos acciones de
  escena **Leer un jugador de ajedrez** y **Leer el problema del día**.

## Requisitos

- Gladys Assistant **5.2.0** o posterior.
- Acceso a Internet (API públicas de Lichess y de Chess.com).
- Los nombres de usuario de los jugadores. Para probar: `thibault` (el
  fundador de Lichess) o `DrNykterstein` en Lichess, `hikaru` o `erik` en
  Chess.com.

## Configuración

### Jugadores

- **Jugadores de Lichess** y **Jugadores de Chess.com**: nombres de usuario
  separados por comas, 10 como máximo por sitio. Un enlace de perfil también
  sirve (`https://lichess.org/@/thibault`,
  `https://www.chess.com/member/hikaru`).
- Abra después la pestaña **Descubrir** de la integración y añada los
  jugadores a Gladys. Solo se siguen los jugadores añadidos.
- El botón **Comprobar los jugadores** lee todos los jugadores al momento y
  muestra lo que ha respondido cada sitio: la mejor manera de comprobar un
  nombre de usuario.

### Otros ajustes

- **Lectura**: la frecuencia de lectura de cada jugador, de 2 a 30 minutos (5
  por defecto). Una partida terminada, una nueva puntuación o un jugador en
  línea se ven en la siguiente lectura.
- **Idioma**: el idioma de los nombres de las funciones (fijados al añadir un
  dispositivo: elimine y vuelva a añadir el dispositivo para cambiarlos), de la
  última partida y de los textos de escena. Francés por defecto.

## Dispositivos

Un dispositivo por jugador, llamado «usuario (sitio)».

| Función                           | Valor                                                     |
| --------------------------------- | --------------------------------------------------------- |
| Puntuación bullet, blitz…         | la puntuación actual del ritmo                            |
| En línea (Lichess)                | 1 cuando el jugador está conectado a Lichess              |
| En partida (Lichess)              | 1 durante una partida                                     |
| Última partida                    | resultado, rival, ritmo y puntuación tras la partida      |
| Partidas de hoy, Victorias de hoy | las partidas terminadas desde medianoche (zona de Gladys) |

Un ritmo nunca jugado no tiene valor hasta la primera partida. Las partidas
UltraBullet cuentan como bullet en el filtro «Partida terminada».
Puntuaciones, partidas y presencia en línea vienen de los sitios: Gladys
conserva su historial.

## Widget

**Jugadores de ajedrez**, desde el editor del panel:

- con un **jugador** elegido: hasta cuatro mosaicos de puntuación en directo
  (los ritmos más jugados), la última partida, el balance del día (+victorias
  =tablas −derrotas), en línea o en partida (Lichess), y botones hacia el
  perfil, la última partida y el problema del día;
- sin jugador: una fila por jugador añadido con su puntuación más jugada
  (verde en línea en Lichess, naranja en partida), y un botón hacia el
  problema del día de cada sitio seguido.

## Escenas

### Disparador: Partida terminada

Un jugador seguido ha terminado una partida. Filtros: el **jugador**, el
**resultado** (victoria, derrota, tablas) y el **ritmo** (bullet, blitz,
rápidas, clásicas, correspondencia), todos opcionales. Variables: jugador,
resultado, rival, puntuación del rival, puntuación tras la partida, cambio de
puntuación (solo Lichess), enlace de la partida y un **resumen** listo para
usar.

Las partidas jugadas antes de añadir al jugador no son noticia: no disparan
nada. Tras un corte largo, solo disparan las cinco últimas partidas nuevas.

### Disparador: Nuevo récord de puntuación

Un jugador seguido ha superado su mejor puntuación de siempre en un ritmo
(incluida la de problemas en Lichess). El mejor es el que conoce el sitio
(historial de Lichess, «best» de Chess.com). Una puntuación provisional de
Lichess nunca cuenta. Variables: jugador, nuevo récord, récord anterior,
resumen.

### Acción: Leer un jugador de ajedrez

Las puntuaciones, las partidas del día y la última partida de un jugador:
valores para los bloques siguientes, y un **resumen** para una notificación,
por ejemplo «Hikaru (Chess.com): blitz 3465, bullet 3420, rápidas 2838. Hoy: 12
partidas: +7 =0 −5. Última partida: Derrota contra …». Se lee de lo que Gladys
ya sabe: ninguna petición.

### Acción: Leer el problema del día

El problema del día de Lichess (por defecto) o de Chess.com: su enlace, su
título o su dificultad, y un **mensaje** listo para enviar.

## Ejemplos de escenas

- **Animar a los niños**: disparador Partida terminada, jugador «Lucía»,
  resultado victoria → enviar «¡Bravo! {{summary}}» a la familia.
- **El problema del desayuno**: cada día a las 7:30, Leer el problema del día,
  y enviar su mensaje por Telegram.
- **Celebrar un récord**: disparador Nuevo récord de puntuación → iluminar el
  salón en dorado y enviar el resumen.

## Solución de problemas

- **Un jugador no aparece en Descubrir**: pulse **Comprobar los jugadores**.
  «Jugador no encontrado» indica un nombre de usuario erróneo o una cuenta
  cerrada.
- **Sin presencia en línea en Chess.com**: su API pública ya no la publica (la
  antigua dirección `is-online` responde «no encontrado»).
- **Una partida llega con retraso**: las partidas se ven en la siguiente
  lectura (5 minutos por defecto). Chess.com también puede tardar unos minutos
  en publicar una partida.
- **«Lichess y Chess.com no responden»**: ambos sitios han fallado en la
  última lectura (red, mantenimiento o demasiadas peticiones). Tras una
  respuesta «demasiadas peticiones», la integración espera un minuto y vuelve
  a intentarlo sola.
- **Registros**: `LOG_LEVEL=debug` muestra cada petición; el nivel normal solo
  muestra arranques, errores y escenas disparadas.

## Límites

- Solo datos públicos: ni partidas privadas, ni chat, ni jugadas.
- Lichess y Chess.com son servicios gratuitos: 10 jugadores por sitio, 2
  minutos entre lecturas como mínimo. Cada petición lleva un `User-Agent` que
  nombra la integración, como pide Chess.com, y las peticiones a un sitio salen
  de una en una, como pide Lichess.
- «Hoy» cuenta como máximo las 100 últimas partidas de Lichess del día.
- Lichess ordena las partidas por fecha de inicio: una partida por
  correspondencia empezada antes de la última partida vista puede no disparar
  nunca «Partida terminada», ni contar en el día.
- Chess.com no da el cambio de puntuación de una partida.
