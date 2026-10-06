"use strict";

import {
    ensureAnonymousSession
} from "./firebase-session.js";

import {
    PisadaBacanaDB
} from "./database.js";


/* =====================================================
   ESTADO GLOBAL
===================================================== */

window.PisadaBacanaData = {
    orders: [],
    settings: null
};


let unsubscribeOrders = null;
let unsubscribeSettings = null;


/* =====================================================
   EVENTOS
===================================================== */

function dispatchOrdersUpdated(orders) {

    window.dispatchEvent(
        new CustomEvent(
            "pisadabacana:orders-updated",
            {
                detail: {
                    orders
                }
            }
        )
    );
}


function dispatchSettingsUpdated(settings) {

    window.dispatchEvent(
        new CustomEvent(
            "pisadabacana:settings-updated",
            {
                detail: {
                    settings
                }
            }
        )
    );
}


/* =====================================================
   FIRESTORE
===================================================== */

async function initializeFirebaseData() {

    try {

        await ensureAnonymousSession();

        /*
            Importación histórica.

            Si este navegador ya fue migrado,
            database.js no vuelve a importar
            los datos antiguos.
        */

        await PisadaBacanaDB
            .migrateLocalDataOnce();


        /*
            Lectura inicial.
        */

        const [
            orders,
            settings
        ] =
            await Promise.all([
                PisadaBacanaDB.getOrders(),
                PisadaBacanaDB.getSettings()
            ]);


        window.PisadaBacanaData.orders =
            orders;

        window.PisadaBacanaData.settings =
            settings;


        /*
            Suscripción a pedidos.
        */

        unsubscribeOrders =
            PisadaBacanaDB.subscribeOrders(
                firestoreOrders => {

                    window.PisadaBacanaData.orders =
                        firestoreOrders;

                    dispatchOrdersUpdated(
                        firestoreOrders
                    );
                }
            );


        /*
            Suscripción a configuración.
        */

        unsubscribeSettings =
            PisadaBacanaDB.subscribeSettings(
                firestoreSettings => {

                    window.PisadaBacanaData.settings =
                        firestoreSettings;

                    dispatchSettingsUpdated(
                        firestoreSettings
                    );
                }
            );


        document.documentElement
            .classList.remove(
                "firestore-error"
            );

        document.documentElement
            .classList.add(
                "firestore-ready"
            );


        window.dispatchEvent(
            new CustomEvent(
                "pisadabacana:firestore-ready",
                {
                    detail: {
                        orders,
                        settings
                    }
                }
            )
        );


        /*
            También notificamos los datos iniciales.
        */

        dispatchOrdersUpdated(
            orders
        );

        dispatchSettingsUpdated(
            settings
        );


        console.log(
            `Firestore listo: ${orders.length} pedidos.`
        );

    } catch (error) {

        console.error(
            "Error inicializando Firestore:",
            error
        );


        document.documentElement
            .classList.remove(
                "firestore-ready"
            );

        document.documentElement
            .classList.add(
                "firestore-error"
            );


        window.dispatchEvent(
            new CustomEvent(
                "pisadabacana:firestore-error",
                {
                    detail: {
                        error
                    }
                }
            )
        );
    }
}


/* =====================================================
   LIMPIEZA
===================================================== */

function stopSubscriptions() {

    if (
        typeof unsubscribeOrders ===
        "function"
    ) {

        unsubscribeOrders();

        unsubscribeOrders =
            null;
    }


    if (
        typeof unsubscribeSettings ===
        "function"
    ) {

        unsubscribeSettings();

        unsubscribeSettings =
            null;
    }
}


window.addEventListener(
    "pagehide",
    stopSubscriptions
);


/* =====================================================
   INICIO
===================================================== */

initializeFirebaseData();