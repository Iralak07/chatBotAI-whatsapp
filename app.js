const { adapterDB } = require('./database')
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const PostgreSQLAdapter = require('@bot-whatsapp/database/postgres')

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
                    return ctxFn.gotoFlow(flujoInactividad)
                case '3':
                    return ctxFn.gotoFlow(flujoInactividad)
                case '4':
                    return ctxFn.gotoFlow(flujoInactividad)
                case '5':
                    return ctxFn.gotoFlow(flujoInactividad)
            }
        }   
    )




const flujoBienvenida = addKeyword('chatBot', { sensitive: true })
    .addAnswer('¡Hola! 🙌 Bienvenido/a a Gas Express, tu distribuidora de gas de confianza. Mi nombre es Asistente Gas Express, soy tu asistente virtual, aquí para ayudarte a gestionar tus pedidos de gas de manera rápida y sencilla. 🚚💨',
        {delay: 1000},
        async (ctx,{ gotoFlow }) => {
            return gotoFlow(flujoVerificarUsuario)
        }
    )






//////////////////////////////   Registro de usuario ////////////////////////////////////////////////////////////////

const flujoVerificarUsuario = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const contacto = await adapterDB.getContact(ctx);
        if(!contacto.values){
            await flowDynamic([
                { body: 'Usuario no registrado!'}
            ])
            return gotoFlow(flujoDatosUsuario)
        }
    })

const flujoDatosUsuario = addKeyword(EVENTS.ACTION)
    .addAnswer('Por favor, ingrese su nombre:',
        { capture: true },
        async (ctx, { flowDynamic, state }) => {
            const nombre = ctx.body;
            await state.update({ nombre: nombre });
    })
    .addAnswer('Por favor, ingrese su ruc:',{
        capture: true
    },
    async (ctx, { flowDynamic, state, gotoFlow }) => {
        const ruc = ctx.body;
        await state.update({ ruc: ruc });
    })
    .addAction(async (ctx, { flowDynamic, state }) => {
        return flowDynamic([
            { body: 'Nombre: ' + state.get('nombre') + '\n' +
                    'Ruc: ' + state.get('ruc')
            }
        ])  
    })
    .addAnswer('Por favor, confime los datos ingresados:\n' +
        "Seleccion *1* para confirmar o *2* para reingresar", 
        {capture: true},
        async (ctx, ctxFn) => {
            const opciones = ['1', '2'];
            if(!opciones.includes(ctx.body)){
                return ctxFn.fallBack('Seleccion *1* para confirmar o *2* para reingresar')
            }
            switch(ctx.body){
                case '1':
                    return ctxFn.gotoFlow(flujoGuardarUsuario)
                case '2':
                    return ctxFn.gotoFlow(flujoVerificarUsuario)
            }
        }
    )

const flujoGuardarUsuario = addKeyword(EVENTS.ACTION)
    .addAnswer('Datos guardados con exito')

/// FLUJO DE PEDIDOS ///

const flujoResumenPedidos = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
        // Supondiendo que ya obtuviste la dirección y el tamaño del cilindro
        const resumen = `Patricia! Este es el resumen de tu pedido y descuento QR. 💰🚚 🏠\n\n` +
                            `🏠 Dirección: Holanda 5698, PROVIDENCIA, REGión METROPOLITANA\n` +
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

// tamano del cilindro
const flujoCilindros = addKeyword(EVENTS.ACTION)
    .addAnswer('¿Qué tamaño de cilindro deseas pedir? Responde con el número del tamaño (ej: *5*, *11*, *15*, *45*).',
        { capture: true, idle: 50000},
        async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
            if(ctx?.idleFallBack){
                return ctxFn.gotoFlow(flujoInactividad)
            }
            const cilidros = ['5', '11', '15', '45']
            if(!cilidros.includes(ctx.body)){
                return fallBack('Por favor, responde con el número de cilindros (ej: *5*, *11*, *15*, *45*).')
            }   
            
            await state.update({ cilindro: ctx.body });
            await flowDynamic([
                {
                    body: 'Pefecto, has elegido el cilindro de *' + state.get('cilindro') + '*. kg.'
                }
            ])
            if(state.get('cilindro')){
                return gotoFlow(flujoCantidad);
            } 
        }
    )

// Flujo de pedido de gast
const flujoPedidoGas = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        // Obtener la comuna registrada del usuario (demo con San Bernardo y Las Condes)
        const comuna = 'San Bernardo'
        
        await flowDynamic([
            {
                body: `📍 Comuna registrada: *${comuna}*.`
            },
            {
                body: comuna === 'San Bernardo' 
                    ? 'Estos son los precios de los cilindros para San Bernardo:\n\n' +
                      '🔹 5 kg: $13.050\n' +
                      '🔹 11 kg: $18.300\n' +
                      '🔹 15 kg: $27.450\n' +
                      '🔹 45 kg: $77.550\n\n'
                    : 'Estos son los precios de los cilindros para Las Condes:\n\n' +
                      '🔹 5 kg: $13.500\n' +
                      '🔹 11 kg: $18.700\n' +
                      '🔹 15 kg: $28.000\n' +
                      '🔹 45 kg: $78.000\n\n'            }
        ]);

        return gotoFlow(flujoCilindros);
    })


/// opcion 2 SOLICITUD DE CUPO DE DESCUENTO //





/// UTILS ///

const flujoInactividad = addKeyword(EVENTS.ACTION)
    .addAction(async (_, { endFlow }) => {
        return endFlow({body: '❌ Esta conversacion se ha cancelado por inactividad ❌'});
    })


const flujoContinuar = addKeyword(EVENTS.ACTION)
    .addAnswer('Escriba "*hola*" para continuar', {
        capture: true,
        idle: 50000
    }
    , async (ctx, ctxFn) => {
        if(ctx?.idleFallBack){
            return ctxFn.gotoFlow(flujoInactividad)
        }
        if(ctx.body === 'hola'){
            return ctxFn.gotoFlow(flujoOpciones)
        }
        return ctxFn.fallBack('Escriba "*hola*" para continuar')
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
        flujoBienvenida,
        flujoOpciones,
        flujoPedidoGas,
        flujoCilindros,
        flujoCantidad,
        flujoCalculos,
        flujoResumenPedidos,
        flujoInactividad,
        flujoContinuar,
        flujoVerificarUsuario,
        flujoDatosUsuario,
        flujoGuardarUsuario
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
