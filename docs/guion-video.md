# Guion del vídeo

**Duración:** 7 minutos. **Obligatorio:** captura de pantalla. La cámara es
opcional y solo aportaría en el bloque 1.

## Antes de grabar

1. Abrir la aplicación publicada en una ventana limpia, a pantalla completa, con
   el navegador sin marcadores personales a la vista.
2. Entrar con `demo` / `demo1234` y **crear una propuesta nueva**, para que el
   agente arranque proponiendo temas durante la grabación.
3. Tener abierto en otra pestaña el repositorio en GitHub, en la vista del
   `README`.
4. Tener a mano la pestaña de la integración continua con una ejecución en verde.
5. Comprobar que no se ve ningún nombre de cliente real en pantalla: la demo usa
   la marca ficticia **Trazo Seguro**.

> Si se graba con el agente real en vez del guion de demostración, dejarlo dicho
> en el vídeo. Las dos formas son válidas; lo que no vale es no aclararlo.

---

## Bloque 1 · El problema (0:00 – 0:50)

*Captura: la pantalla de acceso.*

> Soy Janette Gopar. Trabajo en growth para empresas B2B, y una parte de mi
> trabajo es publicar en LinkedIn de forma constante.
>
> El problema nunca fue escribir. Fue decidir de qué escribir. Y que cada
> herramienta de IA genérica me obliga a volver a explicarle a quién le hablo,
> con qué tono, y qué no se dice nunca.
>
> Así que construí un agente que ya sabe todo eso. Se llama CM Agent, y lo que
> voy a mostrar es la aplicación funcionando: pueden entrar con el usuario de
> prueba que está en pantalla y en el README.

## Bloque 2 · Las cuatro fases (0:50 – 3:30)

*Captura: el panel, en vivo.*

> Al abrir una propuesta, el agente no me pregunta nada: ya está proponiendo.

**(1) Temas.** Señalar la lista.

> Cinco temas. Unos son de fondo del sector; otros son actualidad, con su medio,
> su fecha y su enlace. Y aquí hay una regla que costó afinar: solo entra como
> actualidad lo publicado hoy o ayer, comparando la fecha de forma literal. Si le
> pides "noticias recientes", un modelo te llama reciente a algo de hace tres
> semanas. Si no hay nada fresco, completa con temas de fondo en lugar de
> colarte una noticia vieja.

**(2) Ángulo.** Pulsar "Elegir este tema".

> Antes de escribir una sola línea, me da el ángulo, el por qué ahora y la
> emoción objetivo. Tres líneas. Si el rumbo está mal, lo corrijo aquí, que es
> barato, y no después de leer un post entero.

**(3) Versiones A/B.** Pulsar un formato, por ejemplo "Copy + imagen".

> Elijo formato y me da dos versiones con ganchos distintos —no la misma idea con
> sinónimos— y tres titulares cada una. En "copy + imagen" añade el texto que va
> sobre la imagen y el prompt para generarla.
>
> Y aquí está lo que hace que esto no sea un chat cualquiera: **elegir es la
> interfaz**. Cada vez que elijo una versión, un formato o un titular, queda
> registrado.

**(4) Ajuste y calendario.** Confirmar una versión, editar un titular y pasarlo al
calendario.

> Confirmo, ajusto sobre lo elegido sin que regenere nada, y lo paso al
> calendario.

## Bloque 3 · La memoria silenciosa (3:30 – 4:15)

*Captura: la pantalla de configuración y, si se puede, una conversación anterior.*

> Esas elecciones alimentan una memoria. A partir de tres, el agente deduce qué
> formato uso más, qué versión prefiero y si me van los titulares en pregunta o
> con dato duro, y empieza a proponer así desde el primer intento. Nunca lo
> menciona: no quiero un agente que me explique lo que aprendió, quiero uno que
> acierte más.
>
> Con menos de tres elecciones no deduce nada, porque con una o dos el patrón
> sería ruido.
>
> Y el contexto de la marca —el cliente ideal, el tono, los temas prohibidos— se
> edita aquí, desde la propia aplicación.

## Bloque 4 · Por dentro (4:15 – 6:15)

*Captura: el repositorio y la carpeta `docs/`.*

> Esta aplicación ya funcionaba antes de este proyecto. Lo que no tenía era nada
> de lo que la sostiene: ni una sola prueba, ni integración continua, ni
> contenedor, ni validación de configuración, ni cabeceras de seguridad. Y la
> marca de mi cliente estaba escrita dentro del código.
>
> Eso es lo que hice: llevarla al punto en que se puede sostener y auditar.

*Mostrar `docs/04-seguridad.md`.*

> Hice una auditoría de mi propio código y encontré ocho cosas. La más
> incómoda: una caché que guardaba el resumen de preferencias **en el servidor**,
> indexado por el número de elecciones. Dos personas usando la demo con tres
> elecciones cada una recibían las preferencias de la otra dentro de su prompt.
> Funcionaba perfecto y era una fuga de datos entre sesiones.
>
> También había un SSRF: para mostrar la portada de cada noticia, el servidor
> pedía URLs que propone el modelo, sin mirarlas. Bastaba una que apuntara al
> servicio de metadatos de la nube.

*Mostrar la salida de `npm test` y `npm run test:cov`.*

> Hoy hay 383 pruebas que corren en cinco segundos, más diez en navegador real
> sobre escritorio y celular, con 98 % de cobertura y umbrales que hacen fallar
> la suite si baja.
>
> Y esas pruebas encontraron siete defectos más. Mi favorito: el guion de
> demostración respondía la fase equivocada al elegir un tema. No lo vio ninguna
> prueba unitaria, porque todas usaban frases inventadas, y la interfaz manda
> otras. Lo encontró el recorrido en navegador. La lección quedó escrita en el
> código: la prueba que vale es la que usa el dato real.

*Mostrar la integración continua en verde.*

> En cada cambio corre lint, tipos, pruebas con cobertura, construcción,
> recorrido en navegador y la imagen de Docker, que se levanta para comprobar que
> responde. Sin gastar un token: la integración continua usa el modo de
> demostración.

## Bloque 5 · Cierre (6:15 – 7:00)

*Captura: la aplicación publicada.*

> Dos decisiones de las que estoy contenta.
>
> La primera: el estado vive en el navegador de cada analista, no en una base de
> datos. Parece una carencia y es lo contrario: en la demo publicada, dos
> visitantes no pueden verse nada porque no hay nada compartido que ver.
>
> La segunda: el agente tiene un presupuesto diario de llamadas al modelo. Y
> cuando se agota, no se muere: responde con un guion local y lo dice en una
> cabecera. Cualquiera puede probar la aplicación completa sin que a mí me llegue
> una factura sorpresa.
>
> El repositorio, la aplicación publicada, el usuario de prueba y la
> documentación están en el formulario. Gracias.

---

## Notas de montaje

- **Subtítulos obligatorios.** Si se usa voz sintética, generarlos del mismo
  texto; si se graba la voz, transcribir y revisar los nombres propios.
- Grabar a 1080p y aumentar el zoom del navegador al 110-125 % en los bloques de
  código y documentación: un `README` a tamaño normal no se lee en vídeo.
- El bloque 4 es el que más pesa en la evaluación y el que más tienta a correr.
  Mejor pausar un segundo en cada pantalla que meter una sexta.
- Si algo falla en vivo, dejarlo y explicarlo. Un fallo explicado da más
  confianza que una toma perfecta.
