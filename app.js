const { adapterDB } = require('./database')
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const PostgreSQLAdapter = require('@bot-whatsapp/database/postgres')
const { delay } = require('@whiskeysockets/baileys')
const { chat } = require('./openia')

/**
 * Declaramos las conexiones de PostgreSQL
 */

const POSTGRES_DB_HOST = 'localhost'
const POSTGRES_DB_USER = 'postgres'
const POSTGRES_DB_PASSWORD = '3919305001'
const POSTGRES_DB_NAME = 'chatbotia'
const POSTGRES_DB_PORT = '5432'
//// Inicio de flujo de trabajo /////


const flujoOpciones = addKeyword(EVENTS.ACTION)
    .addAnswer('Estas son las opciones que tengo disponibles para ti:\n' +
        '1️⃣ *Hacer un Pedido de Gas*\n' +
        '2️⃣ *Solicitar Cupón de Descuento*\n' +
        '3️⃣ *Consulta de Precios*\n' +
        '4️⃣ *Estado del Pedido*\n' +
        '5️⃣ *Consultas Generales*\n\n ' +
        'Por favor, responde con el número de la opción que prefieras. Estoy aquí para ayudarte en lo que necesites. 😊',
        {capture: true, idle: 50000},
        async (ctx, ctxFn) => {
            if(ctx?.idleFallBack){
                return ctxFn.gotoFlow(flujoInactividad)
            }
            const opciones = ['1', '2', '3', '4', '5']
            if(!opciones.includes(ctx.body)){
                return ctxFn.fallBack('Por favor, responde con el número de la opción que prefieras. Estoy aquí para ayudarte en lo que necesites. 😊')
            }
            switch(ctx.body){
                case '1':
                    return ctxFn.gotoFlow(flujoPedidoGas)
                case '2':
                    return ctxFn.gotoFlow(flujoCupones)
                case '3':
                    return ctxFn.gotoFlow(flujoConsultaPrecios)
                case '4':
                    return ctxFn.gotoFlow(flujoEstado)
                case '5':
                    return ctxFn.gotoFlow(flujoChatGPT)
            }
        }   
    )


const flujoIncial = addKeyword('bot', { sensitive: true })
    .addAction(async (ctx, ctxFn) => {
        return ctxFn.gotoFlow(flujoBienvenida)
    })

const flujoBienvenida = addKeyword(EVENTS.ACTION)
    .addAnswer('¡Hola! 🙌 Bienvenido/a a *Gas Express*, soy tu asistente virtual.',
        { delay: 1000 }
    )
    .addAnswer('Por favor, ingrese su número de *RUT* con guion y dígito verificador. \n\n' +
        'Ejemplo: *12345678-9*',
        { capture: true },
        async (ctx, ctxFn) => {
            const rut = ctx.body
            const query = `SELECT * FROM userbot WHERE ruc = '${rut}'`
            const user = await adapterDB.db.query(query)

            if (!user.rows[0]) {
                await ctxFn.flowDynamic('⚠️ *Usuario no registrado*')
                await ctxFn.state.update({ rut: rut })
                return ctxFn.gotoFlow(flujoNombreUsario)
            }

            await ctxFn.state.update({ rut: rut })
            await ctxFn.state.update({ nombre: user.rows[0].fullname })
            await ctxFn.state.update({ comuna: user.rows[0].comuna })
            await ctxFn.state.update({ direccion: user.rows[0].direccion })

            await ctxFn.flowDynamic(`Hola *${ctxFn.state.get('nombre')}* 😀`)
            await ctxFn.gotoFlow(flujoOpciones)
        }
    )


//////////////////////////////   Registro de usuario ////////////////////////////////////////////////////////////////


const flujoNombreUsario = addKeyword(EVENTS.ACTION)
    .addAnswer('Por favor, ingrese su nombre completo. Ejemplo: *JUAN PEREZ*', {
        capture: true,
    },
    async (ctx, ctxFn) => {
        const nombre = ctx.body
        if(!nombre){
            return ctxFn.fallBack('Por favor, ingrese su nombre completo. Ejemplo: *JUAN PEREZ*')
        }
        await ctxFn.state.update({ nombre: nombre })
        await ctxFn.state.update({ telefono: ctx.from })
        return ctxFn.gotoFlow(flujoTerminosCondiciones);
    }

)
/*
Aceptación de Términos y Condiciones:

    Al momento del registro, el chatbot solicitará al usuario que acepte los Términos y Condiciones (TOS).
*/
const flujoTerminosCondiciones = addKeyword(EVENTS.ACTION)
    .addAnswer('*Aceptación de Términos y Condiciones:*\n\n' +
        '👉 Autorizo el tratamiento de mis datos personales con la finalidad de prestar servicios con fines estadísticos, de marketing, comunicar ofertas y promociones, y con el objeto de entregar información y/o beneficios de Gas Express. Este contacto podrá ser telefónico, mensaje de texto, correo electrónico o WhatsApp. Los datos podrán, en casos concretos, ser comunicados a terceros para cumplir con las finalidades mencionadas.\n\n' +
        'Para continuar con el registro, por favor acepte los siguientes T&C.\n\n' +
        'Ingrese *1* para aceptar los T&C. ✅\n' +
        'Ingrese *2* para rechazar los T&C. ❌\n',
        { 
            delay: 1000, 
            capture: true,
        },
        async (ctx, ctxFn) => {
            const opciones = ['1', '2']
            if (!opciones.includes(ctx.body)) {
                return ctxFn.fallBack('⚠️ Opción inválida. Ingrese *1* para aceptar los T&C. ✅\n\n' +
                    'Ingrese *2* para rechazar los T&C. ❌')
            }
            switch (ctx.body) {
                case '1':
                    return ctxFn.gotoFlow(flujoOpcionUbicacion)
                case '2':
                    await ctxFn.flowDynamic('¡Hasta pronto! 👋')
                    return ctxFn.endFlow()
            }
        }
    )


const flujoOpcionUbicacion = addKeyword(EVENTS.ACTION)
    .addAnswer('¿Cómo deseas proporcionar tu dirección?\n\n' +
        'Ingrese *1* para enviar por GPS 📍\n' +
        'Ingrese *2* para escribirla manualmente ✍️\n',
        { 
            delay: 1000,
            capture: true,
        },
        async (ctx, ctxFn) => {
            const opciones = ['1', '2']
            if (!opciones.includes(ctx.body)) {
                return ctxFn.fallBack('⚠️ Por favor, ingrese una opción válida.\n' +
                    'Ingrese *1* para enviar por GPS 📍\n' +
                    'Ingrese *2* para escribirla manualmente ✍️\n')
            }
            switch (ctx.body) {
                case '1':
                    return ctxFn.gotoFlow(flujoUbicacionGPS)
                case '2':
                    return ctxFn.gotoFlow(flujoUbicacionManual)
            }
        }
    )

const flujoUbicacionGPS = addKeyword(EVENTS.ACTION)
    .addAnswer('Escribe tu dirección completa. Ejemplo: *HOLANDA 5698, PROVIDENCIA, Región METROPOLITANA*')

const flujoUbicacionManual = addKeyword(EVENTS.ACTION)
    .addAnswer('¿Cuál es tu comuna?', {
        delay: 1000,
        capture: true,
    },
    async (ctx, ctxFn) => {
        const opciones = ['San Bernardo', 'san bernardo', 'Las Condes', 'las condes']
        if (!opciones.includes(ctx.body)) {
            return ctxFn.fallBack('⚠️ La comuna ingresada no es válida.')
        }
        const comuna = ctx.body
        await ctxFn.state.update({ comuna: comuna })
        return ctxFn.gotoFlow(flujoDireccionUsuario)
    })

const flujoDireccionUsuario = addKeyword(EVENTS.ACTION)
    .addAnswer('Por favor, ingrese su dirección completa. Ejemplo: *HOLANDA 5698, PROVIDENCIA, Región METROPOLITANA*', {
        capture: true,
    },
    async (ctx, ctxFn) => {
        const direccion = ctx.body
        if (!direccion) {
            return ctxFn.fallBack('⚠️ Por favor, ingrese su dirección. Ejemplo: *HOLANDA 5698, PROVIDENCIA, Región METROPOLITANA*')
        }
        await ctxFn.state.update({ direccion: direccion })
        return ctxFn.gotoFlow(flujoConfirmarDatos)
    })

const flujoConfirmarDatos = addKeyword(EVENTS.ACTION)
    .addAction(
    async (ctx, ctxFn) => {
        const nombre = ctxFn.state.get('nombre')
        const rut = ctxFn.state.get('rut')
        const comuna = ctxFn.state.get('comuna')
        const direccion = ctxFn.state.get('direccion')
        await ctxFn.flowDynamic([
            {
                body: `📋 ¿Favor de verificar si sus datos son correctos?\n\n` + 
                      `Nombre: ${nombre}\nRUT: ${rut}\nComuna: ${comuna}\nDirección: ${direccion}`
            }
        ])
        return ctxFn.gotoFlow(flujoConfirmarRegistro)
    })

const flujoConfirmarRegistro = addKeyword(EVENTS.ACTION)
    .addAnswer('✅ Confirmar registro de usuario:\n\n' +
        'Seleccione *1* para confirmar. ✅\n' +
        'Seleccione *2* para rechazar. ❌\n',
        {
            capture: true,
        },
        async (ctx, ctxFn) => {
            const opciones = ['1', '2']
            if (!opciones.includes(ctx.body)) {
                return ctxFn.fallBack('⚠️ Opción inválida. Seleccione *1* para confirmar. ✅\n' +
                    'Seleccione *2* para rechazar. ❌\n')
            }
            switch (ctx.body) {
                case '1':
                    return ctxFn.gotoFlow(flujoGuardarRegistro)
                case '2':
                    await ctxFn.flowDynamic('¡Hasta pronto! 👋')
                    return ctxFn.endFlow()
            }
        }
    )

const flujoGuardarRegistro = addKeyword(EVENTS.ACTION)
    .addAnswer('Registrando usuario... ⏳', 
        { delay: 1000 },
        async (ctx, ctxFn) => {
            const query = `INSERT INTO userbot (fullname, ruc, telefono, comuna, direccion) VALUES 
                        ('${ctxFn.state.get('nombre')}',
                         '${ctxFn.state.get('rut')}',
                          '${ctxFn.state.get('telefono')}',
                           '${ctxFn.state.get('comuna')}',
                            '${ctxFn.state.get('direccion')}');`
            
            const result = await adapterDB.db.query(query)
            if (result) {
                await ctxFn.flowDynamic(`🎉 ¡Bienvenido a Gas Express, ${ctxFn.state.get('nombre')}!`)
                return ctxFn.gotoFlow(flujoOpciones)
            } else {
                return ctxFn.fallBack('⚠️ No se pudo registrar el usuario. Por favor, intente nuevamente.')
            }
        }
    )



////////////////////////////////// fin registro de usuarios //////////////////////////////////





//;////////////////////////////////////// FLUJO DE PEDIDOS //////////////////////////////

const flujoResumenPedidos = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
        // Supondiendo que ya obtuviste la dirección y el tamaño del cilindro
        const resumen = `${state.get('nombre')}! Este es el resumen de tu pedido y descuento QR. 💰🚚 🏠\n\n` +
                            `🏠 Dirección: ${state.get('direccion')}\n` +
                            `🚚 Cilindro(s): - ${state.get('cantidad')} de ${state.get('cilindro')} kg $${state.get('total')}\n` +
                            `💰 Descuento total: $${state.get('totalDescuento')}\n` +
                            `TOTAL A PAGAR: $${state.get('totalApagar')}\n` +
                            `\nMonto sujeto a canje del descuento. Precios exclusivos solo por WhatsApp.`;


        await flowDynamic([{ body: resumen }]);
        return gotoFlow(flujoContinuar);
    })

const flujoCalculos = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
        const cilindro = parseInt(state.get('cilindro'));
        const cantidad = parseInt(state.get('cantidad'));
        const precios = {
            '5': 13.050,
            '11': 18.300,
            '15': 27.450,
            '45': 77.550
        }
        const total = cantidad * precios[cilindro];
        const totalDescuento = total * 0.12;
        const totalApagar = total - totalDescuento;
        await state.update( { total : total.toFixed(3) });
        await state.update( { totalDescuento : totalDescuento.toFixed(3) });
        await state.update( { totalApagar : totalApagar.toFixed(3) });
        return gotoFlow(flujoResumenPedidos);
    })

const flujoCantidad = addKeyword(EVENTS.ACTION)
    .addAnswer(`¿Cuántos cilindros deseas pedir? Por favor, ingresa el número de unidades (ej: *2*).`, {
        capture: true,
        idle: 50000
    }, 
    async (ctx, { flowDynamic, state, fallBack, gotoFlow}) => {
        if(ctx?.idleFallBack){
            return ctxFn.gotoFlow(flujoInactividad)
        }
        await state.update({ cantidad: ctx.body });
        await flowDynamic([
            {
                body: 'Pefecto, has elegido ' + state.get('cantidad') + ' cilindros.'
            }
        ])
        return gotoFlow(flujoCalculos);
    })

// Tamaño del cilindro
const flujoCilindros = addKeyword(EVENTS.ACTION)
    .addAnswer('🔧 ¿Qué tamaño de cilindro deseas pedir? \n\nResponde con el número del tamaño: \n*5*, *11*, *15*, *45* kg.',
        { capture: true, idle: 50000 },
        async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
            if (ctx?.idleFallBack) {
                return gotoFlow(flujoInactividad)
            }

            const cilindros = ['5', '11', '15', '45']
            if (!cilindros.includes(ctx.body)) {
                return fallBack('⚠️ Por favor, responde con el número de cilindros válido (ej: *5*, *11*, *15*, *45* kg).')
            }

            await state.update({ cilindro: ctx.body })
            await flowDynamic([
                {
                    body: `✅ ¡Perfecto! Has elegido el cilindro de *${state.get('cilindro')}* kg.`
                }
            ])

            if (state.get('cilindro')) {
                return gotoFlow(flujoCantidad)
            }
        }
    )


// Flujo de pedido de gas
const flujoPedidoGas = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
        // Obtener la comuna registrada del usuario (ejemplo con San Bernardo y Las Condes)
        const comuna = state.get('comuna');
        
        await flowDynamic([
            {
                body: `📍 *Comuna registrada*: ${comuna}.`
            },
            {
                body: comuna === 'San Bernardo'
                    ? '💰 *Precios de cilindros en San Bernardo:*\n\n' +
                      '🔹 5 kg: *$13.050*\n' +
                      '🔹 11 kg: *$18.300*\n' +
                      '🔹 15 kg: *$27.450*\n' +
                      '🔹 45 kg: *$77.550*\n\n'
                    : '💰 *Precios de cilindros en Las Condes:*\n\n' +
                      '🔹 5 kg: *$13.500*\n' +
                      '🔹 11 kg: *$18.700*\n' +
                      '🔹 15 kg: *$28.000*\n' +
                      '🔹 45 kg: *$78.000*\n\n'
            }
        ]);

        return gotoFlow(flujoCilindros);
    })



/// opcion 2 SOLICITUD DE CUPO DE DESCUENTO //
/*
Opción 2: Solicitar Cupón de Descuento:

    Como el cliente ya está registrado, puede solicitar un cupón de descuento.

    El chatbot enviará un código QR que el cliente podrá canjear cuando el pedido llegue a su domicilio.

    Nota: El canje del descuento es un proceso externo al bot.
*/  


const flujoCupones = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
        // Obtener la comuna registrada del usuario (ejemplo con San Bernardo y Las Condes)
        const comuna = state.get('comuna');
        
        await flowDynamic([
            {
                body: `📍 *Comuna registrada*: ${comuna}.`,
                media: 'https://samuelrocha.es/wp-content/uploads/2012/10/qrcode-samuelrochaes.png',
                delay: 1000, 
            }
        ]);
        return gotoFlow(flujoContinuar);
    })

/* 
Opción 3: Consulta de Precios:

    Según la comuna registrada, se consulta el precio del gas, que puede variar entre comunas.

    Los precios se mostrarán para cada uno de los tamaños de cilindros disponibles en la comuna seleccionada.

    Que haga la invitación ajo realizar un pedido luego de entregar los datos.

*/

const flujoConsultaPrecios = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
        // Obtener la comuna registrada del usuario (ejemplo con San Bernardo y Las Condes)
        const comuna = state.get('comuna');
        await flowDynamic([
            {
                body: `📍 *Comuna registrada*: ${comuna}.`
            },
            {
                body: comuna === 'San Bernardo'
                    ? '💰 *Precios de cilindros en San Bernardo:*\n\n' +
                      '🔹 5 kg: *$13.050*\n' +
                      '🔹 11 kg: *$18.300*\n' +
                      '🔹 15 kg: *$27.450*\n' +
                      '🔹 45 kg: *$77.550*\n\n'
                    : '💰 *Precios de cilindros en Las Condes:*\n\n' +
                      '🔹 5 kg: *$13.500*\n' +
                      '🔹 11 kg: *$18.700*\n' +
                      '🔹 15 kg: *$28.000*\n' +
                      '🔹 45 kg: *$78.000*\n\n'
            }
        ]);
        return gotoFlow(flujoCilindros);
    })


/* 
Opción 4: Estado del Pedido:

    Consultar el estado del pedido según el flujo de distribución:

        Estados Disponibles:

            Generado

            Preparado

            En camino

            No se encontró dirección

            Entregado

            Cancelado

*/

const flujoEstado = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
        // Obtener la comuna registrada del usuario (ejemplo con San Bernardo y Las Condes)
        const estado = ['Generado', 'Preparado', 'En camino', 'No se encontró dirección', 'Entregado', 'Cancelado'];
        const comuna = state.get('comuna');
        await flowDynamic([
            {
                body: `📍 *Comuna registrada*: ${comuna}.` + `*Estado del Pedido*: ${ estado[0]}.`,
            }
        ]);
        return gotoFlow(flujoContinuar);
    })

// FLUJO CHAT GPT

const flujoChatGPT = addKeyword(EVENTS.ACTION)
    .addAnswer('En que puedo ayudarte?', {
        delay: 1000,
    },
    async (ctx, ctxFn) => {
        return ctxFn.gotoFlow(flujoChatGPTRespuesta);
    }
)


const flujoChatGPTRespuesta = addKeyword(EVENTS.ACTION)
    .addAction({capture: true},async (ctx, { flowDynamic, gotoFlow, state }) => {
        const nuevaHistoria = state.getMyState()?.histororia ?? [];
        const nombre = state.get('nombre') ?? '';
        nuevaHistoria.push({
            role: 'user',
            content: ctx.body
        })

        const ia = await chat(nombre, nuevaHistoria);
        console.log(ia);
        await flowDynamic(ia);

        nuevaHistoria.push({
            role: 'assistant',
            content: ia
        })

        await state.update({historia: nuevaHistoria});
        return gotoFlow(flujoChatGPTRespuesta);
    })

/// UTILS ///

const flujoInactividad = addKeyword(EVENTS.ACTION)
    .addAction(async (_, { endFlow }) => {
        return endFlow({body: '❌ Esta conversacion se ha cancelado por inactividad ❌'});
    })


const flujoContinuar = addKeyword(EVENTS.ACTION)
    .addAnswer('Escribe *1* para continuar' + 
        '\nEscribe *2* para cancelar', {
        capture: true,
        idle: 50000
    }
    , async (ctx, ctxFn) => {
        if(ctx?.idleFallBack){
            return ctxFn.gotoFlow(flujoInactividad)
        }
        const opciones = ['1', '2']
        if (!opciones.includes(ctx.body)) {
            return ctxFn.fallBack('⚠️ Por favor, responde con *1* para continuar o *2* para cancelar.')
        }
        if(ctx.body === '1'){
            return ctxFn.gotoFlow(flujoOpciones)
        }
        await ctxFn.flowDynamic('Hasta luego 👋');
        return ctxFn.endFlow();
    }
)

const main = async () => {
    // const adapterDB = new PostgreSQLAdapter({
    //     host: POSTGRES_DB_HOST,
    //     user: POSTGRES_DB_USER,
    //     database: POSTGRES_DB_NAME,
    //     password: POSTGRES_DB_PASSWORD,
    //     port: POSTGRES_DB_PORT,
    // })
    const adapterFlow = createFlow([
// flujo bienvenida
        flujoIncial,
        flujoBienvenida,
        flujoOpciones,
        flujoPedidoGas,
        flujoCilindros,
        flujoCantidad,
        flujoCalculos,
        flujoResumenPedidos,
        flujoInactividad,
        flujoContinuar,
// Registro de Usuarios
        flujoTerminosCondiciones,
        flujoDireccionUsuario,
        flujoNombreUsario,
        flujoOpcionUbicacion,
        flujoUbicacionGPS,
        flujoUbicacionManual,
        flujoConfirmarDatos,
        flujoConfirmarRegistro,
        flujoGuardarRegistro,
// Cupones
        flujoCupones,
// Precios
        flujoConsultaPrecios,
// Estado del Pedido
        flujoEstado,

// ChatGPT
        flujoChatGPT,
        flujoChatGPTRespuesta
        
    ])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
